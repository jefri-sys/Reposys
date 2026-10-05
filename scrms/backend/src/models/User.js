const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    minlength: 8
  },
  collegeId: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    uppercase: true
  },
  department: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['Student', 'Faculty', 'Staff', 'Admin'],
    required: true
  },
  pendingRole: {
    type: String,
    enum: ['Faculty'],
    default: null
  },
  pendingRoleApproval: {
    type: Boolean,
    default: false
  },
  verified: {
    type: Boolean,
    default: false
  },
  verificationToken: {
    type: String
  },
  verificationTokenExpiry: {
    type: Date
  },
  pendingEmail: {
    type: String,
    lowercase: true,
    trim: true
  },
  emailChangeToken: {
    type: String
  },
  emailChangeTokenExpiry: {
    type: Date
  },
  resetPasswordToken: {
    type: String
  },
  resetPasswordExpiry: {
    type: Date
  },
  isActive: {
    type: Boolean,
    default: true
  },
  totalOrders: {
    type: Number,
    default: 0
  },
  totalSpend: {
    type: Number,
    default: 0
  },
  phone: {
    type: String
  },
  activeSessions: [{
    sessionId: String,
    device: String,
    lastActive: Date
  }],
  sessionInvalidatedAt: {
    type: Date
  },
  limitOverrides: [{
    service: String,
    maxPages: Number,
    validUntil: Date
  }],
  queueAssignment: {
    type: String,
    enum: ['All', 'Guest', 'Student', 'Faculty'],
    default: 'All'
  },
  pushSubscription: {
    type: Object,
    default: null
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('User', userSchema);
