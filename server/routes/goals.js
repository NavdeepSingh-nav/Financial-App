const express = require('express');
const Goal = require('../models/Goal');
const requireAuth = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

router.get('/', async (req, res, next) => {
  try {
    const goals = await Goal.find({ userId: req.user.userId }).sort({ createdAt: -1 });
    res.json(goals);
  } catch (err) { next(err); }
});

router.post('/', async (req, res, next) => {
  try {
    const { name, targetAmount, targetDate } = req.body;
    if (!name?.trim() || !targetAmount || targetAmount <= 0) {
      return res.status(400).json({ message: 'name and a positive targetAmount are required.' });
    }
    const goal = await Goal.create({
      userId: req.user.userId,
      name: name.trim(),
      targetAmount,
      targetDate: targetDate || '',
    });
    res.status(201).json(goal);
  } catch (err) { next(err); }
});

// Add a contribution towards the goal's target.
router.put('/:id/contribute', async (req, res, next) => {
  try {
    const { amount } = req.body;
    if (!amount || amount <= 0) {
      return res.status(400).json({ message: 'A positive amount is required.' });
    }
    const goal = await Goal.findOne({ _id: req.params.id, userId: req.user.userId });
    if (!goal) return res.status(404).json({ message: 'Goal not found.' });
    goal.currentAmount += amount;
    await goal.save();
    res.json(goal);
  } catch (err) { next(err); }
});

router.delete('/:id', async (req, res, next) => {
  try {
    await Goal.findOneAndDelete({ _id: req.params.id, userId: req.user.userId });
    res.json({ ok: true });
  } catch (err) { next(err); }
});

module.exports = router;
