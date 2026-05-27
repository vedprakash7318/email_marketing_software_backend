const express = require('express');
const router = express.Router();
const Log = require('../models/Log');

// @desc    Get all logs
// @route   GET /api/logs
router.get('/', async (req, res) => {
  try {
    const logs = await Log.find()
      .populate('campaignId', 'name')
      .populate('accountId', 'email')
      .sort({ createdAt: -1 })
      .limit(500); // Limit for performance
    res.json(logs);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
