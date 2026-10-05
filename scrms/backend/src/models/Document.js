const mongoose = require('mongoose');

const qualityIssueSchema = new mongoose.Schema({
  page: {
    type: Number,
  },
  issue: {
    type: String,
  },
}, { _id: false });

const analysisResultsSchema = new mongoose.Schema({
  blankPages: {
    type: [Number],
    default: [],
  },
  qualityIssues: {
    type: [qualityIssueSchema],
    default: [],
  },
  isPasswordProtected: {
    type: Boolean,
    default: false,
  },
  colourHeavyPages: {
    type: [Number],
    default: [],
  },
}, { _id: false });

const documentSchema = new mongoose.Schema({
  cloudinaryUrl: {
    type: String,
    required: true,
  },
  publicId: {
    type: String,
    required: true,
  },
  originalFilename: {
    type: String,
    required: true,
  },
  fileType: {
    type: String,
    enum: ['pdf', 'doc', 'docx', 'jpg', 'png'],
    required: true,
  },
  pageCount: {
    type: Number,
  },
  analysisResults: {
    type: analysisResultsSchema,
    default: () => ({}),
  },
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required() {
      return !this.isGuest;
    },
  },
  isGuest: {
    type: Boolean,
    default: false,
  },
  guestSessionId: {
    type: String,
  },
}, {
  timestamps: true,
});

module.exports = mongoose.model('Document', documentSchema);
