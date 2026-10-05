const mongoose = require('mongoose');

const participantSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  walletStatus: {
    type: String,
    enum: ['pending', 'paid', 'declined'],
    default: 'pending'
  },
  paidAt: {
    type: Date,
    default: null
  }
}, { _id: false });

const groupOrderSchema = new mongoose.Schema({
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    default: null
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  totalAmount: {
    type: Number,
    required: true
  },
  participants: {
    type: [participantSchema],
    required: true
  },
  description: {
    type: String,
    default: ''
  },
  status: {
    type: String,
    enum: ['active', 'completed', 'cancelled'],
    default: 'active'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Only enforce uniqueness on orderId when it is a real ObjectId.
// Partial filter expression excludes null/missing orderId (custom splits),
// allowing multiple GroupOrders with orderId: null to coexist.
groupOrderSchema.index(
  { orderId: 1 },
  { unique: true, partialFilterExpression: { orderId: { $type: 'objectId' } } }
);

module.exports = mongoose.model('GroupOrder', groupOrderSchema);
