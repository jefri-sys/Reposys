const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { v4: uuid } = require('uuid');
const GuestSession = require('../models/GuestSession');
const Order = require('../models/Order');
const {
  sendEmail,
  isSandboxMail,
  getSafeEmailErrorMessage,
  buildGuestOtpEmail,
} = require('../config/nodemailer');

const OTP_VALIDITY_MS = 15 * 60 * 1000;
const OTP_REQUEST_WINDOW_MS = 30 * 60 * 1000;
const MAX_OTP_REQUESTS_PER_WINDOW = 5;
const ENDED_ORDER_STATUSES = ['Completed', 'Cancelled', 'Expired'];

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const normalizeEmail = (email) => String(email || '').trim().toLowerCase();

const hashOtp = (otp) => crypto
  .createHash('sha256')
  .update(String(otp))
  .digest('hex');

const createSessionToken = (session) => jwt.sign(
  {
    role: 'Guest',
    email: session.email,
    sessionId: session.sessionId,
  },
  process.env.JWT_SECRET,
  { expiresIn: '2h' }
);

const findActiveOrder = (sessionId) => Order.findOne({
  guestSessionId: sessionId,
  status: { $nin: ENDED_ORDER_STATUSES },
}).sort({ updatedAt: -1 });

exports.requestOtp = async (req, res, next) => {
  try {
    const email = normalizeEmail(req.body?.email);

    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: 'Invalid email format' });
    }

    const existingSession = await GuestSession.findOne({ email });
    const now = new Date();
    const isExistingWindowActive = Boolean(
      existingSession?.otpRequestWindowStart
      && now.getTime() - existingSession.otpRequestWindowStart.getTime() < OTP_REQUEST_WINDOW_MS
    );
    const requestCount = isExistingWindowActive
      ? Number(existingSession.otpRequestCount || 0)
      : 0;

    if (requestCount >= MAX_OTP_REQUESTS_PER_WINDOW) {
      return res.status(429).json({
        message: 'Too many OTP requests for this email. Wait 30 minutes.',
      });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const hashedOtp = hashOtp(otp);
    const otpRequestWindowStart = isExistingWindowActive
      ? existingSession.otpRequestWindowStart
      : now;

    await GuestSession.findOneAndUpdate(
      { email },
      {
        $set: {
          hashedOtp,
          otpExpiry: new Date(Date.now() + OTP_VALIDITY_MS),
          isActive: true,
          otpRequestCount: requestCount + 1,
          otpRequestWindowStart,
        }
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
      }
    );

    try {
      await sendEmail(
        email,
        'Your Reposys Guest Access Code',
        buildGuestOtpEmail({ otp })
      );
    } catch (emailError) {
      console.error('Failed to send guest OTP email:', emailError);
      if (isSandboxMail()) {
        return res.status(200).json({
          success: true,
          debugOtp: otp,
          message: `Mailtrap sandbox SMTP is unreachable from this deployment, so use this test OTP: ${otp}`,
        });
      }

      return res.status(500).json({
        success: false,
        message: `We could not send the guest OTP email: ${getSafeEmailErrorMessage(emailError)}. Please try again later or contact support.`,
      });
    }

    return res.status(200).json({ message: 'OTP sent to your email' });
  } catch (error) {
    return next(error);
  }
};

exports.verifyOtp = async (req, res, next) => {
  try {
    const email = normalizeEmail(req.body?.email);
    const otp = String(req.body?.otp || '').trim();

    if (!emailRegex.test(email) || !otp) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }

    const hashedOtp = hashOtp(otp);
    const session = await GuestSession.findOne({
      email,
      hashedOtp,
      otpExpiry: { $gt: new Date() },
    });

    if (!session) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }

    if (session.isActive === false) {
      return res.status(400).json({ message: 'This guest session has ended. Start a new one.' });
    }

    const activeOrder = await findActiveOrder(session.sessionId);
    const sessionToken = createSessionToken(session);

    session.sessionToken = sessionToken;
    session.isActive = true;
    await session.save();

    res.cookie('token', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    if (activeOrder) {
      return res.status(200).json({
        sessionId: session.sessionId,
        restored: true,
        activeOrderId: activeOrder._id,
      });
    }

    return res.status(200).json({
      sessionId: session.sessionId,
      restored: false,
    });
  } catch (error) {
    return next(error);
  }
};

exports.endSession = async (req, res, next) => {
  try {
    await GuestSession.findOneAndUpdate(
      { sessionId: req.user.sessionId },
      {
        isActive: false,
        sessionToken: null,
      }
    );

    res.clearCookie('token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
    });
    return res.status(200).json({ message: 'Guest session ended' });
  } catch (error) {
    return next(error);
  }
};
