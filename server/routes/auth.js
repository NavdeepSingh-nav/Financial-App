const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const requireAuth = require('../middleware/auth');

const router = express.Router();
const BCRYPT_ROUNDS = 12;

function issueToken(userId) {
  return jwt.sign({ userId: userId.toString() }, process.env.JWT_SECRET, { expiresIn: '7d' });
}

// Returns whether an account exists — lets the frontend decide setup vs login
router.get('/status', async (_req, res) => {
  const count = await User.countDocuments();
  res.json({ hasUser: count > 0 });
});

// First-time setup: create the single master account
router.post('/setup', async (req, res) => {
  const exists = await User.countDocuments();
  if (exists) return res.status(400).json({ message: 'Account already exists. Please log in.' });

  const { password } = req.body;
  if (!password || password.length < 8) {
    return res.status(400).json({ message: 'Master password must be at least 8 characters.' });
  }

  const hash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  const user = await User.create({ masterPasswordHash: hash });
  res.status(201).json({ token: issueToken(user._id) });
});

// Login
router.post('/login', async (req, res) => {
  const user = await User.findOne();
  if (!user) return res.status(404).json({ message: 'No account found. Please complete setup first.' });

  const ok = await user.verifyPassword(req.body.password || '');
  if (!ok) return res.status(401).json({ message: 'Incorrect master password.' });

  res.json({ token: issueToken(user._id) });
});

// Verify token (used by frontend on load)
router.get('/me', requireAuth, (req, res) => {
  res.json({ userId: req.user.userId });
});

module.exports = router;
