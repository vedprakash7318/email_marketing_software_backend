const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');

// Generate JWT
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '24h',
  });
};

// @desc    Auth admin & get token
// @route   POST /api/auth/login
// @access  Public
const loginAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check for admin email
    const admin = await Admin.findOne({ email });

    if (admin && (await admin.matchPassword(password))) {
      res.json({
        _id: admin.id,
        email: admin.email,
        token: generateToken(admin._id),
      });
    } else {
      res.status(401).json({ message: 'Invalid email or password' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Get current admin data
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res) => {
  try {
    // req.admin is set in authMiddleware
    res.status(200).json(req.admin);
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
};

module.exports = {
  loginAdmin,
  getMe,
};
