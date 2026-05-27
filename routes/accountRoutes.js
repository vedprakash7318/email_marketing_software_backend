const express = require('express');
const router = express.Router();
const multer = require('multer');
const xlsx = require('xlsx');
const Account = require('../models/Account');

const upload = multer({ dest: 'uploads/' });

// @desc    Get all accounts (paginated)
// @route   GET /api/accounts
router.get('/', async (req, res) => {
  try {
    if (req.query.all === 'true') {
      const accounts = await Account.find().sort({ createdAt: -1 });
      return res.json(accounts);
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || '';

    let query = {};
    if (search) {
      query = {
        $or: [
          { email: { $regex: search, $options: 'i' } },
          { smtpHost: { $regex: search, $options: 'i' } }
        ]
      };
    }

    const total = await Account.countDocuments(query);
    const accounts = await Account.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    res.json({
      accounts,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Add a new account
// @route   POST /api/accounts
router.get('/create', async (req, res) => {
    // just dummy for now
});
router.post('/', async (req, res) => {
  const { email, password, dailyLimit, smtpHost, smtpPort } = req.body;
  try {
    const account = await Account.create({ 
      email, 
      password, 
      dailyLimit: dailyLimit || 100,
      smtpHost: smtpHost || '',
      smtpPort: smtpPort || 465
    });
    res.status(201).json(account);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// @desc    Upload Excel/CSV accounts
// @route   POST /api/accounts/upload
router.post('/upload', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'Please upload a file' });
  try {
    const workbook = xlsx.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(sheet);

    let addedCount = 0;
    for (const row of data) {
      const email = row.email || row.Email || row.EMAIL;
      const password = row.password || row.Password || row.PASSWORD;
      
      if (email && password) {
        await Account.updateOne(
          { email },
          { 
            $set: { 
              email, 
              password: password.toString(),
              dailyLimit: row.dailyLimit || row.DailyLimit || 100,
              smtpHost: row.smtpHost || row.SmtpHost || '',
              smtpPort: row.smtpPort || row.SmtpPort || 465
            } 
          },
          { upsert: true }
        );
        addedCount++;
      }
    }
    res.json({ message: `Successfully processed ${addedCount} accounts.` });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Delete all accounts
// @route   DELETE /api/accounts/all
router.delete('/all', async (req, res) => {
  try {
    await Account.deleteMany({});
    res.json({ message: 'All accounts deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Update account
// @route   PUT /api/accounts/:id
router.put('/:id', async (req, res) => {
  const { email, password, dailyLimit, smtpHost, smtpPort } = req.body;
  try {
    const account = await Account.findByIdAndUpdate(
      req.params.id,
      { email, password, dailyLimit, smtpHost, smtpPort },
      { new: true, runValidators: true }
    );
    res.json(account);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// @desc    Delete account
// @route   DELETE /api/accounts/:id
router.delete('/:id', async (req, res) => {
  try {
    const account = await Account.findById(req.params.id);
    if (!account) return res.status(404).json({ message: 'Account not found' });
    await account.deleteOne();
    res.json({ message: 'Account removed' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
