const mongoose = require('mongoose');

const printJobSchema = new mongoose.Schema({
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: true,
    index: true,
  },
  printerId: {
    type: String,
    default: 'DEFAULT_PRINTER',
  },
  printerName: {
    type: String,
    default: 'Reprography Counter Printer',
  },
  windowsPrinterName: {
    type: String,
    default: null,
  },
  agentId: {
    type: String,
    default: null,
  },
  queuePosition: {
    type: Number,
    default: 0,
  },
  status: {
    type: String,
    enum: ['Pending', 'Queued', 'Assigned', 'Dispatching', 'Printing', 'Printed', 'Inspection', 'Failed', 'Cancelled', 'Completed', 'Dispatched', 'Manual Required'],
    default: 'Pending',
  },
  copies: {
    type: Number,
    default: 1,
  },
  colorMode: {
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
  pageCount: {
    type: Number,
    default: 0,
  },
  documents: [{
    documentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Document',
      required: true,
    },
    cloudinaryPublicId: {
      type: String,
      required: true,
    },
    originalFilename: {
      type: String,
      default: '',
    },
  }],
  serviceType: {
    type: String,
    default: null,
  },
  estimatedDuration: {
    type: Number,
    default: 0,
  },
  assignedAt: {
    type: Date,
    default: null,
  },
  startedAt: {
    type: Date,
    default: null,
  },
  completedAt: {
    type: Date,
    default: null,
  },
  dispatchedAt: {
    type: Date,
    default: null,
  },
  printingStartedAt: {
    type: Date,
    default: null,
  },
  printedAt: {
    type: Date,
    default: null,
  },
  failureReason: {
    type: String,
    default: null,
  },
}, {
  timestamps: true,
});

module.exports = mongoose.model('PrintJob', printJobSchema);
