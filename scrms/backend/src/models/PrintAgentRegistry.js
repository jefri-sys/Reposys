const mongoose = require('mongoose');

const discoveredPrinterSchema = new mongoose.Schema({
  windowsPrinterName: { type: String, required: true },
  isDefault: { type: Boolean, default: false },
}, { _id: false });

const printAgentRegistrySchema = new mongoose.Schema({
  agentId: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  lastConnectedAt: { type: Date, default: null },
  lastHeartbeat: { type: Date, default: null },
  isOnline: { type: Boolean, default: false },
  discoveredPrinters: {
    type: [discoveredPrinterSchema],
    default: [],
  },
  machineName: { type: String },
  windowsVersion: { type: String },
  agentVersion: { type: String },
  installedPrinters: { type: [String], default: [] },
  defaultPrinter: { type: String },
  registeredAt: { type: Date, default: Date.now },
}, { timestamps: true });

module.exports = mongoose.model('PrintAgentRegistry', printAgentRegistrySchema);
