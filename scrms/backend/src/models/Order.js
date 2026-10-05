const mongoose = require('mongoose');

const statusHistorySchema = new mongoose.Schema({
  status: {
    type: String,
  },
  actorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  actorRole: {
    type: String,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
  note: {
    type: String,
  },
}, { _id: false });

const printConfigSchema = new mongoose.Schema({
  copies: {
    type: Number,
    default: 1,
  },
  colourMode: {
    type: String,
    enum: ['BlackAndWhite', 'Colour'],
    default: 'BlackAndWhite',
  },
  sided: {
    type: String,
    enum: ['Single', 'Double'],
    default: 'Single',
  },
  paperSize: {
    type: String,
    enum: ['A4', 'A3', 'Letter'],
    default: 'A4',
  },
  binding: {
    type: String,
    enum: ['None', 'Spiral', 'Staple'],
    default: 'None',
  },
  printInstructions: {
    type: String,
    maxlength: 500,
  },
  outputFormat: {
    type: String,
    enum: ['PDF', 'JPG', 'PNG'],
  },
  conversionType: {
    type: String,
    enum: ['PDF to Word', 'Word to PDF', 'Image to PDF'],
  },
}, { _id: false });

const orderSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required() {
      return !this.isGuest;
    },
  },
  isGuest: {
    type: Boolean,
    default: false,
  },
  guestEmail: {
    type: String,
  },
  guestSessionId: {
    type: String,
  },
  documentIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Document',
  }],
  serviceType: {
    type: String,
    enum: ['Printing', 'Photocopying', 'Scanning', 'Binding', 'Conversion'],
    required: true,
  },
  userRole: {
    type: String,
    enum: ['Student', 'Faculty', 'Staff', 'Admin', 'Guest'],
    required: true,
  },
  printConfig: {
    type: printConfigSchema,
    default: () => ({}),
  },
  pageCount: {
    type: Number,
  },
  estimatedCost: {
    type: Number,
  },
  finalCost: {
    type: Number,
  },
  paymentMethod: {
    type: String,
    enum: ['Online', 'Cash', 'wallet'],
  },
  paymentStatus: {
    type: String,
    enum: [
      'Pending',
      'Paid',
      'Failed',
      'Refunded',
      'Cash_Pending',
      'Cash_Collected',
      'Payment_Disputed',
    ],
    default: 'Pending',
  },
  razorpayOrderId: {
    type: String,
  },
  razorpayPaymentId: {
    type: String,
  },
  status: {
    type: String,
    enum: ['Pending', 'In_Queue', 'Processing', 'ReadyForPickup', 'Completed', 'Cancelled', 'Partial', 'Expired', 'Uncollected'],
    default: 'Pending',
  },
  statusHistory: {
    type: [statusHistorySchema],
    default: [],
  },
  tokenNumber: {
    type: String,
  },
  priorityScore: {
    type: Number,
    default: 0,
  },
  agingScore: {
    type: Number,
    default: 0,
  },
  preferredPickupSlot: {
    type: String,
  },
  assignedStaffId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  pickupOtp: {
    type: String,
  },
  pickupOtpExpiry: {
    type: Date,
  },
  pickupOtpVerified: {
    type: Boolean,
    default: false,
  },
  otpAttempts: {
    type: Number,
    min: 0,
    default: 0,
  },
  otpLocked: {
    type: Boolean,
    default: false,
  },
  lockedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  lockedAt: {
    type: Date,
  },
  partialPagesCompleted: {
    type: Number,
    min: 0,
    default: 0,
  },
  followUpOrderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
  },
  internalNotes: {
    type: String,
    trim: true,
    maxlength: 2000,
    default: '',
  },
  estimatedDuration: {
    type: Number,
  },
  autoProcessAt: {
    type: Date,
    default: null,
  },
  cancelReason: {
    type: String,
  },
  isGroupOrder: {
    type: Boolean,
    default: false,
  },
  groupOrderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'GroupOrder',
    default: null,
  },
}, {
  timestamps: true,
});

module.exports = mongoose.model('Order', orderSchema);
