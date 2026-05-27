const mongoose = require('mongoose');

const campaignSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  subject: {
    type: String,
    required: true
  },
  bodyHtml: {
    type: String,
    required: true
  },
  attachments: [{
    filename: String,
    path: String
  }],
  status: {
    type: String,
    enum: ['draft', 'sending', 'completed', 'paused'],
    default: 'draft'
  },
  targetContactsCount: {
    type: Number,
    default: 0
  },
  sentCount: {
    type: Number,
    default: 0
  },
  failedCount: {
    type: Number,
    default: 0
  },
  selectedAccounts: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Account'
  }],
  delayPerEmail: {
    type: Number,
    default: 0 // In seconds
  },
  pauseAfterCount: {
    type: Number,
    default: 0 // 0 means no pausing
  },
  pauseDuration: {
    type: Number,
    default: 0 // In minutes
  }
}, { timestamps: true });

module.exports = mongoose.model('Campaign', campaignSchema);
