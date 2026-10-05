const mongoose = require('mongoose');

const groupSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 60
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  members: {
    type: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }],
    validate: {
      validator: function(v) {
        if (this.isNew) {
          return v && v.length >= 3;
        }
        return v && v.length >= 1;
      },
      message: 'members array must have at least 3 entries (creator + 2 others)'
    }
  },
  isDisbanded: {
    type: Boolean,
    default: false
  },
  deletedByUsers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Group', groupSchema);
