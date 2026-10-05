const mongoose = require('mongoose');

const complaintStatusHistorySchema = new mongoose.Schema({
  status: {
    type: String,
    enum: ['Open', 'In_Progress', 'Resolved', 'Closed'],
    required: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
  actorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  actorRole: {
    type: String,
    default: null,
  },
  note: {
    type: String,
    default: '',
  },
}, { _id: false });

const complaintMessageSchema = new mongoose.Schema({
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  senderRole: {
    type: String,
    default: null,
  },
  text: {
    type: String,
    required: true,
    trim: true,
  },
  attachmentUrl: {
    type: String,
    default: '',
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
}, { _id: false });

const complaintSchema = new mongoose.Schema({
  complaintToken: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: true,
  },
  raisedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  category: {
    type: String,
    enum: ['Print_Quality', 'Binding_Quality', 'Wrong_Output', 'Delay', 'Payment_Issue', 'Other'],
    required: true,
  },
  description: {
    type: String,
    required: true,
    trim: true,
  },
  status: {
    type: String,
    enum: ['Open', 'In_Progress', 'Resolved', 'Closed'],
    default: 'Open',
  },
  statusHistory: {
    type: [complaintStatusHistorySchema],
    default: [],
  },
  messages: {
    type: [complaintMessageSchema],
    default: [],
  },
  attachmentUrls: {
    type: [String],
    default: [],
  },
  resolvedAt: {
    type: Date,
    default: null,
  },
}, {
  timestamps: true,
});

module.exports = mongoose.model('Complaint', complaintSchema);
