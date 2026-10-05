const mongoose = require('mongoose');

const splitRequestSchema = new mongoose.Schema({
  groupOrderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'GroupOrder',
    required: true
  },
  from: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  to: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'declined'],
    default: 'pending'
  },
  triggeredFrom: {
    type: String,
    enum: ['order_detail', 'group_chat'],
    required: true
  },
  groupChatId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group',
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  resolvedAt: {
    type: Date,
    default: null
  }
});

module.exports = mongoose.model('SplitRequest', splitRequestSchema);
