const mongoose = require('mongoose');

const templateSchema = new mongoose.Schema({
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
  }]
}, { timestamps: true });

module.exports = mongoose.model('Template', templateSchema);
