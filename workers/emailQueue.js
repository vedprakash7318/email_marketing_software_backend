const nodemailer = require('nodemailer');
const Account = require('../models/Account');
const Log = require('../models/Log');
const Campaign = require('../models/Campaign');

// Simple in-memory queue
class InMemoryQueue {
  constructor() {
    this.jobs = [];
    this.processing = false;
  }

  add(name, data) {
    this.jobs.push(data);
    this.processJobs();
  }

  async processJobs() {
    if (this.processing || this.jobs.length === 0) return;
    this.processing = true;

    const campaignBatchCount = {};

    while (this.jobs.length > 0) {
      const jobData = this.jobs.shift();
      await this.processJob(jobData);
      
      const { campaignId, delayPerEmail, pauseAfterCount, pauseDuration } = jobData;

      // Check for completion
      const campaign = await Campaign.findById(campaignId);
      if (campaign && (campaign.sentCount + campaign.failedCount >= campaign.targetContactsCount)) {
        if (campaign.status !== 'completed') {
          campaign.status = 'completed';
          await campaign.save();
        }
      }

      // Handle batch pausing
      if (pauseAfterCount > 0 && pauseDuration > 0) {
        campaignBatchCount[campaignId] = (campaignBatchCount[campaignId] || 0) + 1;
        if (campaignBatchCount[campaignId] >= pauseAfterCount) {
          console.log(`Campaign ${campaignId} pausing for ${pauseDuration} mins.`);
          await new Promise(res => setTimeout(res, pauseDuration * 60 * 1000));
          campaignBatchCount[campaignId] = 0;
        }
      }

      // Delay between emails
      const delayMs = delayPerEmail ? delayPerEmail * 1000 : 1000;
      await new Promise(res => setTimeout(res, delayMs));
    }

    this.processing = false;
  }

  async getAvailableAccount(selectedAccounts = []) {
    let query = { status: 'active' };
    if (selectedAccounts && selectedAccounts.length > 0) {
      query._id = { $in: selectedAccounts };
    }
    // Sort by oldest lastUsedDate to achieve Round Robin
    const accounts = await Account.find(query).sort({ lastUsedDate: 1 });
    
    for (const account of accounts) {
      await account.checkAndResetDailyLimit();
      if (account.emailsSentToday < account.dailyLimit && account.status === 'active') {
        return account;
      } else if (account.emailsSentToday >= account.dailyLimit && account.status === 'active') {
          account.status = 'exhausted';
          await account.save();
      }
    }
    return null;
  }

  async processJob(data) {
    const { campaignId, contactEmail, contactName, subject, bodyHtml, attachments, selectedAccounts } = data;

    try {
      let account = await this.getAvailableAccount(selectedAccounts);
      if (!account) {
        throw new Error('ALL_ACCOUNTS_EXHAUSTED');
      }

      let transporter;
      if (account.smtpHost && account.smtpHost.trim() !== '') {
        // Use Custom SMTP
        transporter = nodemailer.createTransport({
          host: account.smtpHost,
          port: account.smtpPort || 465,
          secure: (account.smtpPort == 465), // true for 465, false for other ports
          auth: {
            user: account.email,
            pass: account.password
          }
        });
      } else {
        // Fallback to Gmail
        transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: {
            user: account.email,
            pass: account.password
          }
        });
      }

      let personalizedBody = bodyHtml.replace(/{{name}}/g, contactName || 'Subscriber');
      
      // Unsubscribe Link Generation
      const backendUrl = process.env.BACKEND_URL || 'http://localhost:5000';
      const unsubscribeUrl = `${backendUrl}/unsubscribe/${encodeURIComponent(contactEmail)}`;
      
      const unsubscribeHtml = `<br><br><div style="font-size: 12px; color: #888; text-align: center; margin-top: 20px; border-top: 1px solid #ddd; padding-top: 10px;">
        You are receiving this email because you opted in. If you no longer wish to receive these emails, you can <a href="${unsubscribeUrl}" style="color: #888; text-decoration: underline;">unsubscribe here</a>.
      </div>`;
      
      personalizedBody += unsubscribeHtml;

      // Plain Text Fallback (Regex to strip HTML)
      const plainTextFallback = personalizedBody
        .replace(/<style[^>]*>.*?<\/style>/gi, '') // Remove style tags and content
        .replace(/<script[^>]*>.*?<\/script>/gi, '') // Remove script tags
        .replace(/<\/div>|<\/p>|<br\s*\/?>/gi, '\n') // Replace block tags with newline
        .replace(/<[^>]+>/g, '') // Remove all remaining tags
        .replace(/&nbsp;/g, ' ') // Replace html spaces
        .trim();

      const mailOptions = {
        from: account.email,
        to: contactEmail,
        subject: subject,
        html: personalizedBody,
        text: plainTextFallback,
      };

      if (attachments && attachments.length > 0) {
        mailOptions.attachments = attachments.map(att => ({
          filename: att.filename,
          path: att.path
        }));
      }

      await transporter.sendMail(mailOptions);

      account.emailsSentToday += 1;
      account.lastUsedDate = new Date(); // Update for round-robin
      if (account.emailsSentToday >= account.dailyLimit) {
        account.status = 'exhausted';
      }
      await account.save();

      await Log.create({
        campaignId,
        accountId: account._id,
        contactEmail,
        status: 'sent'
      });

      await Campaign.findByIdAndUpdate(campaignId, { $inc: { sentCount: 1 } });
      console.log(`Email sent to ${contactEmail} using ${account.email}`);

    } catch (error) {
      if (error.message === 'ALL_ACCOUNTS_EXHAUSTED') {
        console.log(`Campaign ${campaignId} paused because all selected sender accounts are exhausted for today.`);
        await Campaign.findByIdAndUpdate(campaignId, { status: 'paused' });
        // Remove all pending jobs for this campaign to stop processing it
        this.jobs = this.jobs.filter(j => j.campaignId.toString() !== campaignId.toString());
        return; // Don't log this contact as failed, it will be picked up when resumed
      }

      console.error(`Failed to send email to ${contactEmail}:`, error.message);
      
      await Log.create({
        campaignId,
        accountId: null,
        contactEmail,
        status: 'failed',
        errorMessage: error.message
      });

      await Campaign.findByIdAndUpdate(campaignId, { $inc: { failedCount: 1 } });
    }
  }
}

const emailQueue = new InMemoryQueue();

module.exports = { emailQueue };
