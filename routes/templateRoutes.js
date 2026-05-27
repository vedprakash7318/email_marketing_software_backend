const express = require('express');
const router = express.Router();
const Template = require('../models/Template');

// @desc    Get all templates
// @route   GET /api/templates
router.get('/', async (req, res) => {
  try {
    const templates = await Template.find().sort({ createdAt: -1 });
    res.json(templates);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Create a template
// @route   POST /api/templates
router.post('/', async (req, res) => {
  const { name, subject, bodyHtml, attachments } = req.body;
  try {
    const template = await Template.create({ name, subject, bodyHtml, attachments: attachments || [] });
    res.status(201).json(template);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// @desc    Update a template
// @route   PUT /api/templates/:id
router.put('/:id', async (req, res) => {
  const { name, subject, bodyHtml, attachments } = req.body;
  try {
    const template = await Template.findByIdAndUpdate(
      req.params.id,
      { name, subject, bodyHtml, attachments },
      { new: true }
    );
    res.json(template);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// @desc    Delete a template
// @route   DELETE /api/templates/:id
router.delete('/:id', async (req, res) => {
  try {
    await Template.findByIdAndDelete(req.params.id);
    res.json({ message: 'Template removed' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
