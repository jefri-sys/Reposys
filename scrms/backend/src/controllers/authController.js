const User = require('../models/User');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const {
  sendEmail,
  isSandboxMail,
  getSafeEmailErrorMessage,
  buildVerificationEmail,
  buildPasswordResetEmail,
} = require('../config/nodemailer');
const jwt = require('jsonwebtoken');
const { v4: uuid } = require('uuid');
const { createNotification } = require('../services/notificationService');
const { serializeUser } = require('../utils/serializeUser');
const { resolveSessionDeviceLabel } = require('../utils/sessionDevice');
const { getPrimaryFrontendUrl } = require('../config/origins');

const withSandboxSuffix = (message) =>
  isSandboxMail() ? `${message} Note: current email delivery is using Mailtrap sandbox, so messages go to the test inbox instead of a real mailbox.` : message;

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

exports.register = async (req, res, next) => {
  try {
    const { name, email, password, collegeId, department, role } = req.body;

// 1. Validate required fields
if (!name || !email || !password || !collegeId || !department || !role) {
  return res.status(400).json({
    success: false,
    message: 'All fields are required'
  });
}

const normalizedEmail = email.toLowerCase();
const normalizedCollegeId = collegeId.trim().toUpperCase();

    // Role security check
    if (role === 'Admin' || role === 'Staff') {
      return res.status(400).json({ success: false, message: 'Invalid role' });
    }

    // Faculty approval logic
    let finalRole = 'Student';
    let pendingRole = null;
    let pendingRoleApproval = false;

    if (role === 'Faculty') {
      pendingRole = 'Faculty';
      pendingRoleApproval = true;
    }

    // 2. Check email uniqueness
    const existingEmail = await User.findOne({ email: normalizedEmail });
    if (existingEmail) {
      return res.status(400).json({ success: false, message: 'Email already registered' });
    }

    // 3. Check collegeId uniqueness
    const existingCollegeId = await User.findOne({
      collegeId: { $regex: `^${escapeRegExp(normalizedCollegeId)}$`, $options: 'i' }
    });
    if (existingCollegeId) {
      return res.status(400).json({ success: false, message: 'College ID already registered' });
    }

    // 4. Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // 5. Generate verification token
    const rawToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');
    const verificationTokenExpiry = Date.now() + 24 * 60 * 60 * 1000;

    // 6. Create user with verified: false
    const newUser = new User({
      name,
      email: normalizedEmail,
      password: hashedPassword,
      collegeId: normalizedCollegeId,
      department,
      role: finalRole,
      pendingRole,
      pendingRoleApproval,
      verified: false,
      verificationToken: hashedToken,
      verificationTokenExpiry
    });

    await newUser.save();

    // Trigger Admin Notification for Faculty Approval
    if (newUser.pendingRoleApproval === true) {
      await createNotification({
        recipientRole: 'Admin',
        title: 'New Faculty Role Approval Request',
        message: `Name: ${newUser.name}, Department: ${newUser.department}, College ID: ${newUser.collegeId} has registered and is requesting Faculty role.`,
        type: 'system'
      });
    }

    // 7. Send verification email via Nodemailer
    const verificationUrl = `${getPrimaryFrontendUrl()}/verify-email?token=${rawToken}`;
    console.log('Verification URL (TESTING):', verificationUrl);

    try {
      await sendEmail(
        email,
        'Reposys - Verify Your Account',
        buildVerificationEmail({
          name,
          verificationLink: verificationUrl,
        })
      );
    } catch (emailError) {
      console.error('Failed to send verification email:', emailError);
      if (isSandboxMail()) {
        return res.status(201).json({
          success: true,
          message: `Registration saved, but Mailtrap sandbox email could not be sent from this deployment: ${getSafeEmailErrorMessage(emailError)}. Continue with the test verification link.`,
          verificationUrl,
        });
      }

      return res.status(500).json({
        success: false,
        message: 'We could not send the verification email. Please try again later or contact support.',
      });
    }

    // 8. Return 201
    let successMessage = 'Registration successful. Check your email to verify your account.';
    if (newUser.pendingRoleApproval) {
      successMessage = 'Registration successful. Please verify your email. Your Faculty role is pending admin approval and will be activated within 24 hours.';
    }

    return res.status(201).json({
      success: true,
      message: withSandboxSuffix(successMessage)
    });

  } catch (error) {
    // Passes any unhandled errors strictly back to your new global errorHandler
    next(error);
  }
};

exports.verifyEmail = async (req, res, next) => {
  try {
    const rawToken = req.query.token;
    if (!rawToken) {
      return res.status(400).json({ success: false, message: 'Token missing' });
    }

    const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');

    const user = await User.findOne({
      verificationToken: hashedToken,
      verificationTokenExpiry: { $gt: Date.now() }
    });

    if (!user) {
      const emailChangeUser = await User.findOne({
        emailChangeToken: hashedToken,
        emailChangeTokenExpiry: { $gt: Date.now() }
      });

      if (!emailChangeUser?.pendingEmail) {
        return res.status(400).json({ success: false, message: 'Verification link is invalid or has expired' });
      }

      const pendingEmail = emailChangeUser.pendingEmail.trim().toLowerCase();
      const existingEmail = await User.findOne({
        email: pendingEmail,
        _id: { $ne: emailChangeUser._id },
      });

      if (existingEmail) {
        return res.status(400).json({ success: false, message: 'Email address is already in use' });
      }

      emailChangeUser.email = pendingEmail;
      emailChangeUser.pendingEmail = undefined;
      emailChangeUser.emailChangeToken = undefined;
      emailChangeUser.emailChangeTokenExpiry = undefined;
      emailChangeUser.verified = true;
      await emailChangeUser.save();

      return res.status(200).json({
        success: true,
        message: 'Email verified and updated. You can now use the new email address.',
        email: emailChangeUser.email
      });
    }

    user.verified = true;
    user.verificationToken = undefined;
    user.verificationTokenExpiry = undefined;
    await user.save();

    return res.status(200).json({
      success: true,
      message: 'Email verified. You can now log in.',
      email: user.email
    });
  } catch (error) {
    next(error);
  }
};

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required' });
    }

    const normalizedEmail = email.toLowerCase();
    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    if (user.isActive === false) {
      return res.status(403).json({ success: false, message: 'Account is deactivated. Contact admin.' });
    }

    if (user.verified === false) {
      return res.status(403).json({ success: false, message: 'Please verify your email before logging in.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const sessionId = uuid();
    const now = new Date();
    const nextActiveSessions = Array.isArray(user.activeSessions) ? [...user.activeSessions] : [];

    nextActiveSessions.push({
      sessionId,
      device: resolveSessionDeviceLabel(req.headers['user-agent']),
      lastActive: now,
    });

    user.activeSessions = nextActiveSessions
      .sort((left, right) => {
        const leftTime = left?.lastActive ? new Date(left.lastActive).getTime() : 0;
        const rightTime = right?.lastActive ? new Date(right.lastActive).getTime() : 0;
        return rightTime - leftTime;
      })
      .slice(0, 10);
    await user.save();

    const token = jwt.sign(
      { id: user._id, role: user.role, sessionId },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    return res.status(200).json({
      success: true,
      user: serializeUser(user),
      token,
    });

  } catch (error) {
    next(error);
  }
};

exports.logout = async (req, res, next) => {
  try {
    if (req.user && req.authSessionId) {
      req.user.activeSessions = (req.user.activeSessions || []).filter(
        (session) => session?.sessionId !== req.authSessionId
      );
      await req.user.save();
    }

    res.clearCookie('token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
    });
    return res.status(200).json({ success: true, message: 'Logged out.' });
  } catch (error) {
    next(error);
  }
};

exports.forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required' });
    }

    const user = await User.findOne({ email });

    if (user) {
      const resetToken = crypto.randomBytes(32).toString('hex');
      const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

      user.resetPasswordToken = hashedToken;
      user.resetPasswordExpiry = Date.now() + 1 * 60 * 60 * 1000;
      await user.save();

      const resetUrl = `${getPrimaryFrontendUrl()}/reset-password?token=${resetToken}`;

      try {
        await sendEmail(
          email,
          'Reposys - Password Reset Request',
          buildPasswordResetEmail({
            name: user.name,
            resetLink: resetUrl,
          })
        );
      } catch (err) {
        console.error('Failed to send reset email:', err);
        if (isSandboxMail()) {
          return res.status(200).json({
            success: true,
            message: `Password reset link created, but Mailtrap sandbox email could not be sent from this deployment: ${getSafeEmailErrorMessage(err)}. Use the test reset link.`,
            resetUrl,
          });
        }

        return res.status(500).json({
          success: false,
          message: 'We could not send the reset email. Please try again later or contact support.',
        });
      }
    }

    // Always returned regardless of whether the user was found (prevents enumeration attacks)
    return res.status(200).json({
      success: true,
      message: withSandboxSuffix('If an account exists, a reset link has been sent'),
    });

  } catch (error) {
    next(error);
  }
};

exports.resetPassword = async (req, res, next) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) {
      return res.status(400).json({ success: false, message: 'Token and new password are required' });
    }

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpiry: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ success: false, message: 'Invalid or expired reset token' });
    }

    // Validate new password server-side: min 8 chars, 1 uppercase, 1 number, 1 special character
    const passwordRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/;
    if (!passwordRegex.test(newPassword)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Password must be at least 8 characters long, contain 1 uppercase letter, 1 number, and 1 special character' 
      });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);
    
    user.password = hashedPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpiry = undefined;
    await user.save();

    return res.status(200).json({ success: true, message: 'Password reset successful' });

  } catch (error) {
    next(error);
  }
};

exports.getMe = async (req, res, next) => {
  try {
    return res.status(200).json({ 
      success: true, 
      user: serializeUser(req.user),
      token: req.cookies.token || null,
    });
  } catch (error) {
    next(error);
  }
};

exports.resendVerification = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ success: false, message: 'User not found' });
    }

    if (user.verified) {
      return res.status(400).json({ success: false, message: 'Account is already verified' });
    }

    const rawToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');
    user.verificationToken = hashedToken;
    user.verificationTokenExpiry = Date.now() + 24 * 60 * 60 * 1000;
    await user.save();

    const verificationUrl = `${getPrimaryFrontendUrl()}/verify-email?token=${rawToken}`;
    
    try {
      await sendEmail(
        email,
        'Reposys - Verify Your Account',
        buildVerificationEmail({
          name: user.name,
          verificationLink: verificationUrl,
        })
      );
    } catch (err) {
      console.error('Resend email failed:', err);
      if (isSandboxMail()) {
        return res.status(200).json({
          success: true,
          message: `Verification link created, but Mailtrap sandbox email could not be sent from this deployment: ${getSafeEmailErrorMessage(err)}. Continue with the test verification link.`,
          verificationUrl,
        });
      }

      return res.status(500).json({
        success: false,
        message: 'We could not resend the verification email. Please try again later or contact support.',
      });
    }

    return res.status(200).json({
      success: true,
      message: withSandboxSuffix('Verification email resent.'),
    });
  } catch (error) {
    next(error);
  }
};
