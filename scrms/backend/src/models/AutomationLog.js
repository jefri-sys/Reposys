const mongoose = require('mongoose');

const automationLogSchema = new mongoose.Schema({
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: true,
    index: true,
  },
  printJobId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PrintJob',
    default: null,
  },
  event: {
    type: String,
    required: true,
  },
  action: {
    type: String,
    required: true,
  },
  result: {
    type: String,
    enum: ['Success', 'Failed', 'Skipped', 'QueueFull', 'AwaitingCash'],
    required: true,
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
  timestamp: {
    type: Date,
    default: Date.now,
    expires: '30d', // Automatically delete logs older than 30 days
  },
}, {
  timestamps: false,
  versionKey: false,
});

const blockMutation = function blockMutation(next) {
  next(new Error('AutomationLog entries are immutable.'));
};

automationLogSchema.pre('findOneAndUpdate', blockMutation);
automationLogSchema.pre('updateOne', blockMutation);
automationLogSchema.pre('updateMany', blockMutation);
automationLogSchema.pre('replaceOne', blockMutation);
automationLogSchema.pre('findOneAndDelete', blockMutation);
automationLogSchema.pre('findOneAndRemove', blockMutation);
automationLogSchema.pre('deleteOne', { document: true, query: false }, blockMutation);
automationLogSchema.pre('deleteOne', { document: false, query: true }, blockMutation);
automationLogSchema.pre('deleteMany', blockMutation);
automationLogSchema.pre('remove', blockMutation);

module.exports = mongoose.model('AutomationLog', automationLogSchema);
