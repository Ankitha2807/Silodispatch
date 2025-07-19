const express = require('express');
const { authMiddleware } = require('../middleware/authMiddleware');
const User = require('../models/User');

const router = express.Router();

// GET /api/users?role=DRIVER
router.get('/', authMiddleware, async (req, res) => {
  try {
    const filter = {};
    if (req.query.role) {
      filter.role = req.query.role;
    }
    const users = await User.find(filter).select('-passwordHash');
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch users', error: err.message });
  }
});

module.exports = router; 