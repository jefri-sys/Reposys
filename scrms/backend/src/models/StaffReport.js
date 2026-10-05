const mongoose = require('mongoose');

const staffReportSchema = new mongoose.Schema({
  reportRef: {
    type: String,
    required: true,
    unique: true,
  },
  raisedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  category: {
    type: String,
    enum: ['Low_Stock', 'Low_Ink', 'Equipment_Fault', 'Maintenance_Required', 'Other'],
    required: true,
  },
  specificItem: {
    type: String,
  },
  description: {
    type: String,
    required: true,
  },
  urgency: {
    type: String,
    enum: ['Normal', 'Urgent'],
    default: 'Normal',
  },
  status: {
    type: String,
    enum: ['Pending', 'Acknowledged', 'Resolved'],
    default: 'Pending',
  },
  resolutionNote: {
    type: String,
  },
  acknowledgedAt: {
    type: Date,
  },
  resolvedAt: {
    type: Date,
  },
  linkedInventoryItemId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'InventoryItem',
  },
}, {
  timestamps: true,
});

module.exports = mongoose.model('StaffReport', staffReportSchema);
