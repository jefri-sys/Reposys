const mongoose = require('mongoose');

const walletTransactionSchema = new mongoose.Schema({
  walletId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Wallet',
    required: true
  },
  type: {
    type: String,
    enum: ['topup', 'order_debit', 'split_debit', 'split_credit', 'refund'],
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    default: null
  },
  razorpayOrderId: {
    type: String,
    default: null
  },
  description: {
    type: String,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['success', 'failed', 'pending'],
    default: 'success'
  }
});

module.exports = mongoose.model('WalletTransaction', walletTransactionSchema);
