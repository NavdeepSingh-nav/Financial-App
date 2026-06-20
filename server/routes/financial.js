const express = require('express');
const FinancialEntry = require('../models/FinancialEntry');
const requireAuth = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

router.get('/', async (req, res, next) => {
  try {
    const entries = await FinancialEntry.find({ userId: req.user.userId }).sort({ createdAt: -1 });
    res.json(entries);
  } catch (err) { next(err); }
});

router.post('/', async (req, res, next) => {
  try {
    const { description, amount, type, date } = req.body;
    if (!description?.trim() || !amount || !type || !date) {
      return res.status(400).json({ message: 'description, amount, type and date are all required.' });
    }
    const entry = await FinancialEntry.create({
      userId: req.user.userId,
      description: description.trim(),
      amount, type, date,
    });
    res.status(201).json(entry);
  } catch (err) { next(err); }
});

router.delete('/:id', async (req, res, next) => {
  try {
    await FinancialEntry.findOneAndDelete({ _id: req.params.id, userId: req.user.userId });
    res.json({ ok: true });
  } catch (err) { next(err); }
});

module.exports = router;
