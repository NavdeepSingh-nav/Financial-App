const express = require('express');
const Budget = require('../models/Budget');
const requireAuth = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

router.get('/', async (req, res, next) => {
  try {
    const budgets = await Budget.find({ userId: req.user.userId });
    res.json(budgets);
  } catch (err) { next(err); }
});

// Upsert — setting a budget for a category that already has one just updates the limit.
router.put('/:category', async (req, res, next) => {
  try {
    const { limit } = req.body;
    if (!limit || limit <= 0) {
      return res.status(400).json({ message: 'A positive limit is required.' });
    }
    const budget = await Budget.findOneAndUpdate(
      { userId: req.user.userId, category: req.params.category },
      { limit },
      { upsert: true, new: true, runValidators: true }
    );
    res.json(budget);
  } catch (err) { next(err); }
});

router.delete('/:category', async (req, res, next) => {
  try {
    await Budget.findOneAndDelete({ userId: req.user.userId, category: req.params.category });
    res.json({ ok: true });
  } catch (err) { next(err); }
});

module.exports = router;
