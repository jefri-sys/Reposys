const mongoose = require('mongoose');

const activityLogSchema = new mongoose.Schema({
  actionType: {
    type: String,
    required: true,
  },
  performedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  description: {
    type: String,
    required: true,
  },
  affectedRecordId: {
    type: mongoose.Schema.Types.ObjectId,
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
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
  next(new Error('ActivityLog entries are immutable.'));
};

activityLogSchema.pre('findOneAndUpdate', blockMutation);
activityLogSchema.pre('updateOne', blockMutation);
activityLogSchema.pre('updateMany', blockMutation);
activityLogSchema.pre('replaceOne', blockMutation);
activityLogSchema.pre('findOneAndDelete', blockMutation);
activityLogSchema.pre('findOneAndRemove', blockMutation);
activityLogSchema.pre('deleteOne', { document: true, query: false }, blockMutation);
activityLogSchema.pre('deleteOne', { document: false, query: true }, blockMutation);
activityLogSchema.pre('deleteMany', blockMutation);
activityLogSchema.pre('remove', blockMutation);

module.exports = mongoose.model('ActivityLog', activityLogSchema);
