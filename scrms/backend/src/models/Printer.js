const mongoose = require('mongoose');

const printerSchema = new mongoose.Schema({
  printerId: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  friendlyName: {
    type: String,
    required: true,
    trim: true,
  },
  agentId: {
    type: String,
    required: true,
    trim: true,
  },
  windowsPrinterName: {
    type: String,
    required: true,
    trim: true,
  },
  capabilities: {
    supportsColor: { type: Boolean, default: false },
    supportsDuplex: { type: Boolean, default: false },
    paperSizes: { type: [String], default: ['A4'] },
    maxQueueSize: { type: Number, default: 10 },
  },
  isDefault: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
  isConfigured: {
    type: Boolean,
    default: false,
  },
  displayName: {
    type: String,
    default: '',
    trim: true,
  },
  location: {
    type: String,
    default: '',
    trim: true,
  },
  priority: {
    type: Number,
    default: 5,
    min: 1,
    max: 10,
  },
  department: {
    type: String,
    default: '',
    trim: true,
  },
  isOnline: { type: Boolean, default: false },
  workOffline: { type: Boolean, default: false },
  printerStatus: { type: String, default: 'Unknown' },
  currentStatus: {
    type: String,
    enum: ['Idle', 'Printing', 'Paused', 'Offline', 'Error'],
    default: 'Offline',
  },
  queueLength: { type: Number, default: 0 },
  paperLevel: {
    type: String,
    enum: ['High', 'Low', 'Empty', 'Unknown'],
    default: 'Unknown',
  },
  tonerLevel: {
    type: String,
    enum: ['High', 'Low', 'Empty', 'Unknown'],
    default: 'Unknown',
  },
  lastHeartbeat: { type: Date, default: null },
}, { timestamps: true });

module.exports = mongoose.model('Printer', printerSchema);
