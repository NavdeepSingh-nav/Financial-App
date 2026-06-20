const express = require('express');
const Expense = require('../models/Expense');
const requireAuth = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

router.get('/', async (req, res, next) => {
  try {
    const expenses = await Expense.find({ userId: req.user.userId }).sort({ createdAt: -1 });
    res.json(expenses);
  } catch (err) { next(err); }
});

router.post('/', async (req, res, next) => {
  try {
    const { title, amount, category, date, note, clientId } = req.body;
    if (!title?.trim() || !amount || !category || !date) {
      return res.status(400).json({ message: 'title, amount, category and date are required.' });
    }
    const expense = await Expense.create({
      userId: req.user.userId,
      title: title.trim(),
      amount, category, date,
      note: note || '',
      ...(clientId ? { clientId } : {}),
    });
    res.status(201).json(expense);
  } catch (err) {
    if (err.code === 11000 && err.keyPattern?.clientId && req.body.clientId) {
      const existing = await Expense.findOne({ clientId: req.body.clientId }).catch(() => null);
      if (existing) return res.status(201).json(existing);
    }
    next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    await Expense.findOneAndDelete({ _id: req.params.id, userId: req.user.userId });
    res.json({ ok: true });
  } catch (err) { next(err); }
});

module.exports = router;
