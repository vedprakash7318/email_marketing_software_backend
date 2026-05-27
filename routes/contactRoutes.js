const express = require('express');
const router = express.Router();
const multer = require('multer');
const xlsx = require('xlsx');
const Contact = require('../models/Contact');

const upload = multer({ dest: 'uploads/' });

// @desc    Get all contacts (paginated)
// @route   GET /api/contacts
router.get('/', async (req, res) => {
  try {
    if (req.query.all === 'true') {
      const contacts = await Contact.find().sort({ createdAt: -1 });
      return res.json(contacts);
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || '';

    let query = {};
    if (search) {
      query = {
        $or: [
          { email: { $regex: search, $options: 'i' } },
          { name: { $regex: search, $options: 'i' } }
        ]
      };
    }

    const total = await Contact.countDocuments(query);
    const contacts = await Contact.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    res.json({
      contacts,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Add single contact
// @route   POST /api/contacts
router.post('/', async (req, res) => {
  const { email, name } = req.body;
  try {
    const contact = await Contact.create({ email, name });
    res.status(201).json(contact);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Contact with this email already exists.' });
    }
    res.status(400).json({ message: error.message });
  }
});

// @desc    Update a contact
// @route   PUT /api/contacts/:id
router.put('/:id', async (req, res) => {
  const { email, name, status } = req.body;
  try {
    const contact = await Contact.findByIdAndUpdate(
      req.params.id,
      { email, name, status },
      { new: true, runValidators: true }
    );
    res.json(contact);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Contact with this email already exists.' });
    }
    res.status(400).json({ message: error.message });
  }
});

// @desc    Upload Excel/CSV contacts
// @route   POST /api/contacts/upload
router.post('/upload', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'Please upload a file' });
  try {
    const workbook = xlsx.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(sheet);

    let addedCount = 0;
    for (const row of data) {
      // Assuming columns are 'email' and 'name'
      const email = row.email || row.Email || row.EMAIL;
      const name = row.name || row.Name || row.NAME || '';
      
      if (email) {
        // Upsert to avoid duplicates crashing the loop
        await Contact.updateOne(
          { email },
          { $set: { email, name } },
          { upsert: true }
        );
        addedCount++;
      }
    }
    res.json({ message: `Successfully processed ${addedCount} contacts.` });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Delete contact
// @route   DELETE /api/contacts/:id
router.delete('/:id', async (req, res) => {
  try {
    await Contact.findByIdAndDelete(req.params.id);
    res.json({ message: 'Contact removed' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
