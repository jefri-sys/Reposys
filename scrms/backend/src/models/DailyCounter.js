const mongoose = require('mongoose');

const dailyCounterSchema = new mongoose.Schema({
  date: {
    type: String,
    required: true,
  },
  prefix: {
    type: String,
    required: true,
    default: 'Order',
  },
  count: {
    type: Number,
    default: 0,
  },
}, {
  timestamps: true,
});

dailyCounterSchema.index({ date: 1, prefix: 1 }, { unique: true });

module.exports = mongoose.model('DailyCounter', dailyCounterSchema);
