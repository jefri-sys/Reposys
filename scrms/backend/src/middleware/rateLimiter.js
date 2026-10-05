const rateLimit = require('express-rate-limit');

exports.authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: { success: false, message: 'Too many attempts. Try again in 15 minutes.' }
});

exports.guestOtpLimiter = rateLimit({
  windowMs: 30 * 60 * 1000,
  max: 5,
  message: { success: false, message: 'Too many OTP attempts. Try again in 30 minutes.' }
});
