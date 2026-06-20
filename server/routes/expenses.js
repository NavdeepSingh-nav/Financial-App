const express = require('express');
const Expense = require('../models/Expense');
const requireAuth = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

router.get('/', async (req, res) => {
  const expenses = await Expense.find({ userId: req.user.userId }).sort({ createdAt: -1 });
  res.json(expenses);
});

router.post('/', async (req, res) => {
  const { title, amount, category, date, note } = req.body;
  if (!title?.trim() || !amount || !category || !date) {
    return res.status(400).json({ message: 'title, amount, category and date are required.' });
  }
  const expense = await Expense.create({
    userId: req.user.userId,
    title: title.trim(),
    amount, category, date,
    note: note || '',
  });
  res.status(201).json(expense);
});

router.delete('/:id', async (req, res) => {
  await Expense.findOneAndDelete({ _id: req.params.id, userId: req.user.userId });
  res.json({ ok: true });
});

module.exports = router;
