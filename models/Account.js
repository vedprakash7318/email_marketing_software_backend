const mongoose = require('mongoose');

const accountSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true, // App Password or SMTP Password
  },
  smtpHost: {
    type: String,
    default: '' // e.g., smtp.hostinger.com
  },
  smtpPort: {
    type: Number,
    default: 465 // standard secure port
  },
  dailyLimit: {
    type: Number,
    default: 100
  },
  emailsSentToday: {
    type: Number,
    default: 0
  },
  lastUsedDate: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['active', 'exhausted', 'error'],
    default: 'active'
  },
  errorMessage: {
    type: String,
    default: ''
  }
}, { timestamps: true });

// Reset count if it's a new day
accountSchema.methods.checkAndResetDailyLimit = async function() {
  const today = new Date();
  const lastUsed = new Date(this.lastUsedDate);
  
  if (lastUsed.toDateString() !== today.toDateString()) {
    this.emailsSentToday = 0;
    this.status = 'active';
    this.lastUsedDate = today;
    await this.save();
  }
};

module.exports = mongoose.model('Account', accountSchema);
