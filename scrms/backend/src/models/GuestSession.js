const mongoose = require('mongoose');
const { v4: uuid } = require('uuid');

const guestSessionSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
  },
  hashedOtp: {
    type: String,
  },
  otpExpiry: {
    type: Date,
  },
  otpRequestCount: {
    type: Number,
    min: 0,
    default: 0,
  },
  otpRequestWindowStart: {
    type: Date,
  },
  sessionId: {
    type: String,
    default: uuid,
  },
  sessionToken: {
    type: String,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

guestSessionSchema.index({ email: 1 });
guestSessionSchema.index({ sessionId: 1 });

module.exports = mongoose.model('GuestSession', guestSessionSchema);
