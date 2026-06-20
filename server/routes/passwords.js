const express = require('express');
const Password = require('../models/Password');
const requireAuth = require('../middleware/auth');
const { encrypt, decrypt } = require('../utils/crypto');

const router = express.Router();
router.use(requireAuth);

function toClient(doc) {
  return {
    _id: doc._id,
    site: doc.site,
    username: decrypt(doc.usernameEncrypted),
    password: decrypt(doc.passwordEncrypted),
    note: doc.noteEncrypted ? decrypt(doc.noteEncrypted) : '',
    createdAt: doc.createdAt,
  };
}

router.get('/', async (req, res, next) => {
  try {
    const docs = await Password.find({ userId: req.user.userId }).sort({ createdAt: -1 });
    res.json(docs.map(toClient));
  } catch (err) { next(err); }
});

router.post('/', async (req, res, next) => {
  try {
    const { site, username, password, note, clientId } = req.body;
    if (!site?.trim() || !username?.trim() || !password?.trim()) {
      return res.status(400).json({ message: 'site, username and password are required.' });
    }
    const doc = await Password.create({
      userId: req.user.userId,
      site: site.trim(),
      usernameEncrypted: encrypt(username),
      passwordEncrypted: encrypt(password),
      noteEncrypted: note ? encrypt(note) : '',
      ...(clientId ? { clientId } : {}),
    });
    res.status(201).json(toClient(doc));
  } catch (err) {
    if (err.code === 11000 && err.keyPattern?.clientId && req.body.clientId) {
      const existing = await Password.findOne({ clientId: req.body.clientId }).catch(() => null);
      if (existing) return res.status(201).json(toClient(existing));
    }
    next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    await Password.findOneAndDelete({ _id: req.params.id, userId: req.user.userId });
    res.json({ ok: true });
  } catch (err) { next(err); }
});

module.exports = router;
