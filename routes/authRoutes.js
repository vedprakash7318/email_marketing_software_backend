const express = require('express');
const router = express.Router();
const { loginAdmin, getMe } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

router.post('/login', loginAdmin);
router.get('/me', protect, getMe);

module.exports = router;
