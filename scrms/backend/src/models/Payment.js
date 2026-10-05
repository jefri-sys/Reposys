const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  amount: {
    type: Number,
    required: true,
  },
  currency: {
    type: String,
    default: 'INR',
  },
  razorpayOrderId: {
    type: String,
  },
  razorpayPaymentId: {
    type: String,
  },
  razorpaySignature: {
    type: String,
  },
  status: {
    type: String,
    enum: ['Created', 'Paid', 'Failed', 'Refunded'],
    default: 'Created',
  },
  method: {
    type: String,
    enum: ['Online', 'Cash', 'wallet'],
  },
}, {
  timestamps: true,
});

module.exports = mongoose.model('Payment', paymentSchema);
