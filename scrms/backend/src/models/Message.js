const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  recipientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  groupId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group',
    default: null
  },
  content: {
    type: String,
    default: ''
  },
  mediaUrl: {
    type: String,
    default: null
  },
  mediaType: {
    type: String,
    enum: ['image', 'pdf', 'none'],
    default: 'none'
  },
  read: {
    type: Boolean,
    default: false
  },
  type: {
    type: String,
    enum: ['text', 'voice'],
    default: 'text'
  },
  audioUrl: {
    type: String,
    default: null
  },
  audioDuration: {
    type: Number,
    default: null
  },
  splitCardData: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  isSystem: {
    type: Boolean,
    default: false
  },
  isDeleted: {
    type: Boolean,
    default: false
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

messageSchema.pre('validate', async function() {
  if (!this.recipientId && !this.groupId) {
    throw new Error('Message must have either a recipientId or a groupId');
  }
});

messageSchema.index({ senderId: 1, recipientId: 1 });
messageSchema.index({ groupId: 1 });
messageSchema.index({ timestamp: -1 });

module.exports = mongoose.model('Message', messageSchema);
