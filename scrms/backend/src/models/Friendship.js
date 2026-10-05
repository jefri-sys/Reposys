const mongoose = require('mongoose');

const friendshipSchema = new mongoose.Schema({
  requester: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'declined'],
    default: 'pending'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Add a compound index on { requester: 1, recipient: 1 } with unique: true
friendshipSchema.index({ requester: 1, recipient: 1 }, { unique: true });

// Add a pre-save hook that sets updatedAt to Date.now on every save
friendshipSchema.pre('save', function () {
  this.updatedAt = Date.now();
});

module.exports = mongoose.model('Friendship', friendshipSchema);
