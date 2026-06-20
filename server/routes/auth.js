const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const requireAuth = require('../middleware/auth');

const router = express.Router();
const BCRYPT_ROUNDS = 10; // 12 times out on Render free tier (~8s); 10 is still secure (~1s)

function issueToken(user) {
  return jwt.sign(
    { userId: user._id.toString(), email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
}

router.post('/register', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email?.trim()) return res.status(400).json({ message: 'Email is required.' });
    if (!password || password.length < 8)
      return res.status(400).json({ message: 'Password must be at least 8 characters.' });

    const existing = await User.findOne({ email: email.toLowerCase().trim() });
    if (existing) return res.status(409).json({ message: 'An account with this email already exists.' });

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const user = await User.create({ email: email.toLowerCase().trim(), passwordHash });
    res.status(201).json({ token: issueToken(user), email: user.email });
  } catch (err) { next(err); }
});

router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email?.trim() || !password)
      return res.status(400).json({ message: 'Email and password are required.' });

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) return res.status(401).json({ message: 'No account found with this email.' });

    const ok = await user.verifyPassword(password);
    if (!ok) return res.status(401).json({ message: 'Incorrect password.' });

    res.json({ token: issueToken(user), email: user.email });
  } catch (err) { next(err); }
});

router.get('/me', requireAuth, (req, res) => {
  res.json({ userId: req.user.userId, email: req.user.email });
});

module.exports = router;
