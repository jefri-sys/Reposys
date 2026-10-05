const mongoose = require('mongoose');

const inventoryItemSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  category: {
    type: String,
    enum: ['Paper', 'Toner', 'Binding'],
    required: true,
  },
  unit: {
    type: String,
    required: true,
    trim: true,
  },
  currentStock: {
    type: Number,
    required: true,
  },
  minimumThreshold: {
    type: Number,
    required: true,
  },
  usageRate: {
    type: Number,
    default: 0,
  },
  daysOfStockRemaining: {
    type: Number,
    default: 0,
  },
  lastUpdatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  lastUpdatedAt: {
    type: Date,
    default: null,
  },
}, {
  timestamps: true,
});

module.exports = mongoose.model('InventoryItem', inventoryItemSchema);
