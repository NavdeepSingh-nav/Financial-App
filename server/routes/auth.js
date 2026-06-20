const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const requireAuth = require('../middleware/auth');

const router = express.Router();
const BCRYPT_ROUNDS = 10; // 12 times out on Render free tier (~8s); 10 is still secure (~1s)

function issueToken(user) {
  if (!process.env.JWT_SECRET) {
    console.error('Missing JWT_SECRET environment variable');
    throw new Error('Server misconfiguration: JWT_SECRET not set');
  }

  return jwt.sign(
    { userId: user._id.toString(), email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
}

router.post('/register', async (req, res, next) => {
  const { email, password } = req.body ?? {};
  let createAttempted = false;

  try {
    if (!email?.trim()) return res.status(400).json({ message: 'Email is required.' });
    if (!password || password.length < 8)
      return res.status(400).json({ message: 'Password must be at least 8 characters.' });

    const existing = await User.findOne({ email: email.toLowerCase().trim() });
    if (existing) return res.status(409).json({ message: 'An account with this email already exists.' });

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    createAttempted = true;
    const user = await User.create({ email: email.toLowerCase().trim(), passwordHash });
    const token = issueToken(user);
    res.status(201).json({ token, email: user.email });
  } catch (err) {
    console.error('[register error]', err.name, err.code, err.message);

    if (err.message?.includes('JWT_SECRET')) {
      return res.status(500).json({ message: 'Server configuration error: missing JWT secret.' });
    }

    if (err.code === 11000) {
      return res.status(409).json({ message: 'An account with this email already exists.' });
    }

    if (err.name?.startsWith('Mongo')) {
      // Atlas may have written the document even if the driver threw a network error.
      // If the row is there, return a token rather than leaving the user stranded.
      if (createAttempted) {
        try {
          const saved = await User.findOne({ email: email.toLowerCase().trim() });
          if (saved) return res.status(201).json({ token: issueToken(saved), email: saved.email });
        } catch (_) {}
      }
      return res.status(503).json({ message: 'Server is starting up — please try again in a few seconds.' });
    }

    return res.status(500).json({ message: 'Registration failed. Please try again.' });
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body ?? {};
    if (!email?.trim() || !password)
      return res.status(400).json({ message: 'Email and password are required.' });

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) return res.status(401).json({ message: 'No account found with this email.' });

    const ok = await user.verifyPassword(password);
    if (!ok) return res.status(401).json({ message: 'Incorrect password.' });

    res.json({ token: issueToken(user), email: user.email });
  } catch (err) {
    console.error('[login error]', err);

    if (err.message && err.message.includes('JWT_SECRET')) {
      return res.status(500).json({ message: 'Server configuration error: missing JWT secret.' });
    }

    if (err.name?.startsWith('Mongo')) {
      return res.status(503).json({ message: 'Server is starting up — please try again in a few seconds.' });
    }

    return res.status(500).json({ message: 'Login failed. Please try again.' });
  }
});

router.get('/me', requireAuth, (req, res) => {
  res.json({ userId: req.user.userId, email: req.user.email });
});

module.exports = router;
