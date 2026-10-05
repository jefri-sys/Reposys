const nodemailer = require('nodemailer');
const axios = require('axios');

const SMTP_TIMEOUT_MS = 7000;
const API_TIMEOUT_MS = 7000;

const isSandboxMail = () =>
  (process.env.NODEMAILER_HOST || '').toLowerCase().includes('sandbox.smtp.mailtrap.io');

const isBrevoMail = () =>
  (process.env.NODEMAILER_HOST || '').toLowerCase().includes('smtp-relay.brevo.com');

const transportersByPort = new Map();

const getMissingMailerConfig = () => {
  const requiredKeys = [
    'NODEMAILER_HOST',
    'NODEMAILER_PORT',
    'NODEMAILER_USER',
    'NODEMAILER_PASS',
    'NODEMAILER_FROM',
  ];

  const missingKeys = requiredKeys.filter((key) => !process.env[key]);
  const port = Number(process.env.NODEMAILER_PORT);

  if (missingKeys.length > 0) {
    return `Missing mailer env vars: ${missingKeys.join(', ')}`;
  }

  if (!Number.isInteger(port) || port <= 0) {
    return 'NODEMAILER_PORT must be a valid positive number';
  }

  return '';
};

const getCandidatePorts = () => {
  const configuredPort = Number(process.env.NODEMAILER_PORT);
  const ports = [configuredPort];

  if (isSandboxMail()) {
    ports.push(587, 465, 2525);
  }

  if (isBrevoMail()) {
    ports.push(587, 2525, 465);
  }

  return Array.from(new Set(ports.filter((port) => Number.isInteger(port) && port > 0)));
};

const getTransporter = (port) => {
  if (transportersByPort.has(port)) {
    return transportersByPort.get(port);
  }

  const transporter = nodemailer.createTransport({
    host: process.env.NODEMAILER_HOST,
    port,
    secure: port === 465,
    connectionTimeout: SMTP_TIMEOUT_MS,
    greetingTimeout: SMTP_TIMEOUT_MS,
    socketTimeout: SMTP_TIMEOUT_MS,
    auth: {
      user: process.env.NODEMAILER_USER,
      pass: process.env.NODEMAILER_PASS,
    },
  });

  transportersByPort.set(port, transporter);
  return transporter;
};

const shouldTryNextPort = (error) => {
  const text = `${error?.code || ''} ${error?.response || ''} ${error?.message || ''}`.toLowerCase();
  return !(
    text.includes('authentication')
    || text.includes('invalid login')
    || text.includes('535')
  );
};

const getSafeEmailErrorMessage = (error) =>
  error?.response?.data?.errors?.join?.(', ')
  || error?.response?.data?.message
  || error?.message
  || error?.response
  || 'Unknown email delivery error';

const getMailtrapApiConfig = () => {
  if (!isSandboxMail()) {
    return null;
  }

  const token = process.env.MAILTRAP_API_TOKEN || process.env.MAILTRAP_API_KEY;
  const inboxId = process.env.MAILTRAP_SANDBOX_INBOX_ID || process.env.MAILTRAP_INBOX_ID;

  if (!token || !inboxId) {
    return null;
  }

  return { token, inboxId };
};

const getBrevoApiKey = () =>
  process.env.BREVO_API_KEY
  || process.env.BREVO_TRANSACTIONAL_API_KEY
  || '';

const isProductionSandboxSmtpDisabled = () =>
  isSandboxMail()
  && process.env.NODE_ENV === 'production'
  && process.env.MAILTRAP_ALLOW_SMTP_IN_PRODUCTION !== 'true';

const stripHtml = (value) => String(value || '')
  .replace(/<style[\s\S]*?<\/style>/gi, '')
  .replace(/<script[\s\S]*?<\/script>/gi, '')
  .replace(/<[^>]+>/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

const looksLikeHtml = (value) => /<[a-z][\s\S]*>/i.test(String(value || ''));

const sendMailtrapSandboxApiEmail = async (mailOptions) => {
  const apiConfig = getMailtrapApiConfig();

  if (!apiConfig) {
    return null;
  }

  const response = await axios.post(
    `https://sandbox.api.mailtrap.io/api/send/${apiConfig.inboxId}`,
    {
      from: {
        email: process.env.NODEMAILER_FROM,
        name: 'Reposys Reprography',
      },
      to: [{ email: mailOptions.to }],
      subject: mailOptions.subject,
      html: mailOptions.html,
      text: mailOptions.text,
    },
    {
      timeout: API_TIMEOUT_MS,
      headers: {
        Authorization: `Bearer ${apiConfig.token}`,
        'Api-Token': apiConfig.token,
        'Content-Type': 'application/json',
      },
    }
  );

  return {
    messageId: response.data?.message_ids?.[0] || `mailtrap-api-${Date.now()}`,
    response: response.data,
  };
};

const sendBrevoApiEmail = async (mailOptions) => {
  if (!isBrevoMail()) {
    return null;
  }

  const apiKey = getBrevoApiKey();
  if (!apiKey) {
    return null;
  }

  const response = await axios.post(
    'https://api.brevo.com/v3/smtp/email',
    {
      sender: {
        name: 'Reposys Reprography',
        email: process.env.NODEMAILER_FROM,
      },
      to: [{ email: mailOptions.to }],
      subject: mailOptions.subject,
      htmlContent: mailOptions.html,
      textContent: mailOptions.text,
    },
    {
      timeout: API_TIMEOUT_MS,
      headers: {
        accept: 'application/json',
        'api-key': apiKey,
        'content-type': 'application/json',
      },
    }
  );

  return {
    messageId: response.data?.messageId || `brevo-api-${Date.now()}`,
    response: response.data,
  };
};

const withTimeout = (promise, timeoutMs, message) => {
  let timeoutId;

  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(message)), timeoutMs);
  });

  return Promise.race([promise, timeoutPromise])
    .finally(() => clearTimeout(timeoutId));
};

if (isSandboxMail()) {
  console.warn(
    'Mailer is configured for Mailtrap sandbox. Emails will be captured in the test inbox and will not reach real recipients.'
  );
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const isRetryableRateLimit = (error) => {
  const text = `${error?.response || ''} ${error?.message || ''}`.toLowerCase();
  return text.includes('too many emails per second');
};

const escapeHtml = (value) => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

const wrapEmailTemplate = (content) => `<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; background: #f4f4f4; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 30px auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
    .header { background: #1e40af; padding: 24px; text-align: center; }
    .header h1 { color: white; margin: 0; font-size: 24px; }
    .body { padding: 32px; color: #333; }
    .body h2 { color: #1e40af; }
    .highlight { background: #eff6ff; border-left: 4px solid #1e40af; padding: 16px; border-radius: 4px; margin: 16px 0; }
    .otp { font-size: 36px; font-weight: bold; color: #1e40af; text-align: center; letter-spacing: 8px; padding: 16px; }
    .button { display: inline-block; background: #1e40af; color: white !important; padding: 12px 32px; border-radius: 6px; text-decoration: none; font-weight: bold; margin: 16px 0; }
    .footer { background: #f8fafc; padding: 16px; text-align: center; color: #888; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header"><h1>Reposys -- Reprography Centre</h1></div>
    <div class="body">${content}</div>
    <div class="footer">Reposys Campus Reprography Automation System | Do not reply to this email</div>
  </div>
</body>
</html>`;

const buildVerificationEmail = ({ name, verificationLink }) => wrapEmailTemplate(`
  <h2>Verify Your Email</h2>
  <p>Hi ${escapeHtml(name || 'there')}, welcome to Reposys. Click the button below to verify your email address.</p>
  <a href="${escapeHtml(verificationLink)}" class="button">Verify Email</a>
  <p>This link expires in 24 hours. If you did not register, ignore this email.</p>
`);

const buildEmailChangeVerificationEmail = ({
  name,
  verificationLink,
  currentEmail,
  newEmail,
}) => wrapEmailTemplate(`
  <h2>Verify Your New Email</h2>
  <p>Hi ${escapeHtml(name || 'there')}, confirm this request to update your Reposys email address.</p>
  <div class="highlight">
    <p><strong>Current email:</strong> ${escapeHtml(currentEmail)}</p>
    <p><strong>New email:</strong> ${escapeHtml(newEmail)}</p>
  </div>
  <a href="${escapeHtml(verificationLink)}" class="button">Confirm Email Change</a>
  <p>This link expires in 24 hours. If you did not request this change, ignore this email.</p>
`);

const buildPasswordResetEmail = ({ name, resetLink }) => wrapEmailTemplate(`
  <h2>Reset Your Password</h2>
  <p>Hi ${escapeHtml(name || 'there')}, we received a request to reset your password.</p>
  <a href="${escapeHtml(resetLink)}" class="button">Reset Password</a>
  <p>This link expires in 1 hour. If you did not request this, ignore this email.</p>
`);

const buildGuestOtpEmail = ({ otp }) => wrapEmailTemplate(`
  <h2>Your Guest Access Code</h2>
  <p>Use this one-time code to continue with guest ordering in Reposys.</p>
  <div class="otp">${escapeHtml(otp)}</div>
  <div class="highlight">
    <p>This code is valid for 15 minutes. Do not share it with anyone.</p>
  </div>
`);

const buildGuestSessionExpiringEmail = () => wrapEmailTemplate(`
  <h2>Guest Session Expiring</h2>
  <p>Your guest session will expire in 5 minutes due to inactivity.</p>
  <p>Open Reposys and continue your order if you still need the session.</p>
`);

const buildOrderReadyEmail = ({ name, tokenNumber, serviceType, otp }) => wrapEmailTemplate(`
  <h2>Your Order is Ready!</h2>
  <p>Hi ${escapeHtml(name || 'there')}, your order <strong>${escapeHtml(tokenNumber)}</strong> is ready for pickup.</p>
  <p>Show this OTP to the counter staff to collect your order:</p>
  <div class="otp">${escapeHtml(otp)}</div>
  <div class="highlight">
    <p><strong>Token:</strong> ${escapeHtml(tokenNumber)}</p>
    <p><strong>Service:</strong> ${escapeHtml(serviceType)}</p>
    <p>This OTP expires in 24 hours.</p>
  </div>
`);

const buildStaffWelcomeEmail = ({ name, email, tempPassword, loginUrl }) => wrapEmailTemplate(`
  <h2>Welcome to Reposys Staff</h2>
  <p>Hi ${escapeHtml(name || 'there')}, your Counter Staff account has been created.</p>
  <div class="highlight">
    <p><strong>Email:</strong> ${escapeHtml(email)}</p>
    <p><strong>Temporary Password:</strong> ${escapeHtml(tempPassword)}</p>
  </div>
  <a href="${escapeHtml(loginUrl)}" class="button">Login Now</a>
  <p>Please change your password after first login.</p>
`);

const buildOrderCancelledEmail = ({ name, tokenNumber, reason }) => wrapEmailTemplate(`
  <h2>Order Cancelled</h2>
  <p>Hi ${escapeHtml(name || 'there')}, your order <strong>${escapeHtml(tokenNumber)}</strong> has been cancelled.</p>
  ${reason ? `<div class="highlight"><p><strong>Reason:</strong> ${escapeHtml(reason)}</p></div>` : ''}
  <p>If you did not cancel this order, please contact the reprography centre.</p>
`);

const buildShopClosedEmail = ({ name, tokenNumber }) => wrapEmailTemplate(`
  <h2>Reprography Centre Closed</h2>
  <p>Hi ${escapeHtml(name || 'there')}, the reprography centre is currently closed.</p>
  <p>Your order <strong>${escapeHtml(tokenNumber)}</strong> is still in queue and will be processed when we reopen.</p>
`);

/**
 * Sends a real email using the configured SMTP transporter
 * @param {string} to - Recipient email address
 * @param {string} subject - Email subject
 * @param {string} html - HTML or plain text content of the email
 */
const sendEmail = async (to, subject, html) => {
  const configError = getMissingMailerConfig();
  if (configError) {
    throw new Error(configError);
  }

  const htmlContent = looksLikeHtml(html)
    ? html
    : wrapEmailTemplate(`<p>${escapeHtml(html)}</p>`);

  const mailOptions = {
    from: `"Reposys Reprography" <${process.env.NODEMAILER_FROM}>`,
    to,
    subject,
    html: htmlContent,
    text: stripHtml(htmlContent),
  };

  let lastError;

  const mailtrapApiConfig = getMailtrapApiConfig();

  try {
    const apiInfo = await sendMailtrapSandboxApiEmail(mailOptions);
    if (apiInfo) {
      console.log('Email sent through Mailtrap Sandbox API: %s', apiInfo.messageId);
      return apiInfo;
    }
  } catch (error) {
    lastError = error;
    console.warn('Mailtrap Sandbox API send failed:', getSafeEmailErrorMessage(error));
  }

  try {
    const apiInfo = await sendBrevoApiEmail(mailOptions);
    if (apiInfo) {
      console.log('Email sent through Brevo API: %s', apiInfo.messageId);
      return apiInfo;
    }
  } catch (error) {
    lastError = error;
    console.warn('Brevo API send failed:', getSafeEmailErrorMessage(error));
  }

  if (isProductionSandboxSmtpDisabled()) {
    const reason = mailtrapApiConfig
      ? `Mailtrap Sandbox API failed: ${getSafeEmailErrorMessage(lastError)}`
      : 'Mailtrap Sandbox API credentials are missing. Set MAILTRAP_API_TOKEN and MAILTRAP_SANDBOX_INBOX_ID in Railway.';

    throw new Error(`${reason} SMTP fallback is disabled in production to prevent request timeouts.`);
  }

  const retryDelays = [0, 1500, 3000];
  const candidatePorts = getCandidatePorts();

  for (let attempt = 0; attempt < retryDelays.length; attempt += 1) {
    try {
      if (retryDelays[attempt] > 0) {
        console.warn(`Email send retry ${attempt}/${retryDelays.length - 1} after ${retryDelays[attempt]}ms`);
        await wait(retryDelays[attempt]);
      }

      for (let portIndex = 0; portIndex < candidatePorts.length; portIndex += 1) {
        const port = candidatePorts[portIndex];

        try {
          const info = await withTimeout(
            getTransporter(port).sendMail(mailOptions),
            SMTP_TIMEOUT_MS,
            `Email send timed out after ${SMTP_TIMEOUT_MS}ms on SMTP port ${port}`
          );
          console.log('Email sent: %s', info.messageId);
          return info;
        } catch (error) {
          lastError = error;
          transportersByPort.delete(port);

          if (portIndex === candidatePorts.length - 1 || !shouldTryNextPort(error)) {
            throw error;
          }

          console.warn(`Email send failed on SMTP port ${port}; trying next SMTP port.`);
        }
      }
    } catch (error) {
      lastError = error;
      if (isRetryableRateLimit(error) && attempt < retryDelays.length - 1) {
        continue;
      }

      console.error('Error sending email:', error);
      break;
    }
  }

  if (isBrevoMail() && !getBrevoApiKey()) {
    const message = getSafeEmailErrorMessage(lastError);
    if (message.toLowerCase().includes('timed out')) {
      throw new Error(`${message} Add BREVO_API_KEY in Railway to use the Brevo HTTPS API fallback when SMTP is blocked.`);
    }
  }

  throw lastError;
};

module.exports = {
  sendEmail,
  isSandboxMail,
  getSafeEmailErrorMessage,
  buildVerificationEmail,
  buildEmailChangeVerificationEmail,
  buildPasswordResetEmail,
  buildGuestOtpEmail,
  buildGuestSessionExpiringEmail,
  buildOrderReadyEmail,
  buildStaffWelcomeEmail,
  buildOrderCancelledEmail,
  buildShopClosedEmail,
};
