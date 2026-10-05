require('dotenv').config();
const mongoose = require('mongoose');

const DEFAULT_PRICING = Object.freeze({
  printBW: 1.5,
  printColour: 8.0,
  doubleSidedMultiplier: 0.85,
  photocopy: 1.0,
  scanning: 2.0,
  bindingSpiral: 100,
  bindingStaple: 80,
  conversion: 10.0,
  printTimePerPage: 2,
  photocopyTimePerPage: 1,
  scanTimePerPage: 2,
  bindingSpiralDuration: 10,
  bindingStapleDuration: 5,
  conversionDuration: 5,
});

const DEFAULT_ORDER_LIMITS = Object.freeze({
  maxPagesPerOrder: 500,
  maxCopies: 99,
  maxDocumentsPerOrder: 10,
  maxOrdersPerUserPerDay: 5,
});

const DEFAULT_OPERATING_HOURS = Object.freeze({
  Monday: { open: '09:00', close: '17:00' },
  Tuesday: { open: '09:00', close: '17:00' },
  Wednesday: { open: '09:00', close: '17:00' },
  Thursday: { open: '09:00', close: '17:00' },
  Friday: { open: '09:00', close: '17:00' },
  Saturday: null,
  Sunday: null,
});

const cloneValue = (value) => JSON.parse(JSON.stringify(value));

const operatingHoursSchema = new mongoose.Schema({
  open: {
    type: String,
    required: true,
  },
  close: {
    type: String,
    required: true,
  },
}, { _id: false });

const systemConfigSchema = new mongoose.Schema({
  pricing: {
    printBW: {
      type: Number,
      default: DEFAULT_PRICING.printBW,
    },
    printColour: {
      type: Number,
      default: DEFAULT_PRICING.printColour,
    },
    doubleSidedMultiplier: {
      type: Number,
      default: DEFAULT_PRICING.doubleSidedMultiplier,
    },
    photocopy: {
      type: Number,
      default: DEFAULT_PRICING.photocopy,
    },
    scanning: {
      type: Number,
      default: DEFAULT_PRICING.scanning,
    },
    bindingSpiral: {
      type: Number,
      default: DEFAULT_PRICING.bindingSpiral,
    },
    bindingStaple: {
      type: Number,
      default: DEFAULT_PRICING.bindingStaple,
    },
    conversion: {
      type: Number,
      default: DEFAULT_PRICING.conversion,
    },
    printTimePerPage: {
      type: Number,
      default: DEFAULT_PRICING.printTimePerPage,
    },
    photocopyTimePerPage: {
      type: Number,
      default: DEFAULT_PRICING.photocopyTimePerPage,
    },
    scanTimePerPage: {
      type: Number,
      default: DEFAULT_PRICING.scanTimePerPage,
    },
    bindingSpiralDuration: {
      type: Number,
      default: DEFAULT_PRICING.bindingSpiralDuration,
    },
    bindingStapleDuration: {
      type: Number,
      default: DEFAULT_PRICING.bindingStapleDuration,
    },
    conversionDuration: {
      type: Number,
      default: DEFAULT_PRICING.conversionDuration,
    },
  },
  orderLimits: {
    maxPagesPerOrder: {
      type: Number,
      default: DEFAULT_ORDER_LIMITS.maxPagesPerOrder,
    },
    maxCopies: {
      type: Number,
      default: DEFAULT_ORDER_LIMITS.maxCopies,
    },
    maxDocumentsPerOrder: {
      type: Number,
      default: DEFAULT_ORDER_LIMITS.maxDocumentsPerOrder,
    },
    maxOrdersPerUserPerDay: {
      type: Number,
      default: DEFAULT_ORDER_LIMITS.maxOrdersPerUserPerDay,
    },
  },
  operatingHours: {
    Monday: {
      type: operatingHoursSchema,
      default: () => cloneValue(DEFAULT_OPERATING_HOURS.Monday),
    },
    Tuesday: {
      type: operatingHoursSchema,
      default: () => cloneValue(DEFAULT_OPERATING_HOURS.Tuesday),
    },
    Wednesday: {
      type: operatingHoursSchema,
      default: () => cloneValue(DEFAULT_OPERATING_HOURS.Wednesday),
    },
    Thursday: {
      type: operatingHoursSchema,
      default: () => cloneValue(DEFAULT_OPERATING_HOURS.Thursday),
    },
    Friday: {
      type: operatingHoursSchema,
      default: () => cloneValue(DEFAULT_OPERATING_HOURS.Friday),
    },
    Saturday: {
      type: operatingHoursSchema,
      default: null,
    },
    Sunday: {
      type: operatingHoursSchema,
      default: null,
    },
  },
  isManuallyOpen: {
    type: Boolean,
    default: null,
  },
  shopMode: {
    type: String,
    enum: ['manual_open', 'manual_close', 'schedule'],
    default: 'manual_open',
  },
  starvationThresholdMinutes: {
    type: Number,
    default: 60,
  },
  starvationBoost: {
    type: Number,
    default: 20,
  },
  paymentRetryWindowMinutes: {
    type: Number,
    default: 15,
  },
  spae: {
    enabled: { type: Boolean, default: true },
    maxQueueSize: { type: Number, default: 100 },
    autoProcessingEnabled: { type: Boolean, default: false },
    autoProcessingDelay: { type: Number, default: 2, enum: [1, 2] },
  },
  printers: [{
    printerId: { type: String, required: true },
    name: { type: String, required: true },
    capabilities: {
      color: { type: Boolean, default: false },
      a3: { type: Boolean, default: false },
      duplex: { type: Boolean, default: true }
    },
    isOnline: { type: Boolean, default: true },
    isDefault: { type: Boolean, default: false }
  }],
}, {
  timestamps: true,
});

let connectionPromise = null;

const ensureConnection = async () => {
  if (mongoose.connection.readyState === 1) {
    return;
  }

  if (mongoose.connection.readyState === 2 && connectionPromise) {
    await connectionPromise;
    return;
  }

  if (!process.env.MONGODB_URI) {
    return;
  }

  if (!connectionPromise) {
    connectionPromise = mongoose.connect(process.env.MONGODB_URI);
  }

  try {
    await connectionPromise;
  } finally {
    if (mongoose.connection.readyState !== 2) {
      connectionPromise = null;
    }
  }
};

systemConfigSchema.statics.getInstance = async function getInstance() {
  await ensureConnection();

  let config = await this.findOne();
  if (!config) {
    config = await this.create({
      pricing: cloneValue(DEFAULT_PRICING),
      orderLimits: cloneValue(DEFAULT_ORDER_LIMITS),
      operatingHours: cloneValue(DEFAULT_OPERATING_HOURS),
    });
  }

  if (!config.printers || config.printers.length === 0) {
    config.printers = [{
      printerId: 'DEFAULT_PRINTER',
      name: 'Reprography Counter Printer',
      capabilities: { color: false, a3: false, duplex: true },
      isOnline: true,
      isDefault: true
    }];
    await config.save();
  }

  return config;
};

module.exports = mongoose.model('SystemConfig', systemConfigSchema);
