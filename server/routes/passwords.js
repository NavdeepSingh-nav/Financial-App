const express = require('express');
const Password = require('../models/Password');
const requireAuth = require('../middleware/auth');
const { encrypt, decrypt } = require('../utils/crypto');

const router = express.Router();
router.use(requireAuth);

// Decrypt a stored entry into the shape the frontend expects
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

router.get('/', async (_req, res) => {
  const docs = await Password.find().sort({ createdAt: -1 });
  res.json(docs.map(toClient));
});

router.post('/', async (req, res) => {
  const { site, username, password, note } = req.body;
  if (!site?.trim() || !username?.trim() || !password?.trim()) {
    return res.status(400).json({ message: 'site, username and password are required.' });
  }

  const doc = await Password.create({
    site: site.trim(),
    usernameEncrypted: encrypt(username),
    passwordEncrypted: encrypt(password),
    noteEncrypted: note ? encrypt(note) : '',
  });

  res.status(201).json(toClient(doc));
});

router.delete('/:id', async (req, res) => {
  await Password.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
