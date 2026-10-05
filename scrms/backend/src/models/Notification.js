const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  recipientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  recipientRole: {
    type: String,
    default: null,
  },
  title: {
    type: String,
    required: true,
    trim: true,
  },
  message: {
    type: String,
    required: true,
    trim: true,
  },
  type: {
    type: String,
    enum: ['order_update', 'payment', 'queue_update', 'complaint', 'inventory', 'system', 'rating_prompt'],
    required: true,
    default: 'system',
  },
  recipientType: {
    type: String,
    enum: ['User', 'Staff', 'Admin'],
    required: true,
  },
  urgency: {
    type: String,
    enum: ['Normal', 'Urgent'],
    default: 'Normal',
  },
  relatedEntity: {
    type: String,
    trim: true,
  },
  isRead: {
    type: Boolean,
    default: false,
  },
  relatedOrderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    default: null,
  },
  relatedServiceType: {
    type: String,
    default: null,
  },
}, {
  timestamps: true,
});

module.exports = mongoose.model('Notification', notificationSchema);
