const express = require('express');
const RecurringTemplate = require('../models/RecurringTemplate');
const requireAuth = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

router.get('/', async (req, res, next) => {
  try {
    const templates = await RecurringTemplate.find({ userId: req.user.userId }).sort({ createdAt: -1 });
    res.json(templates);
  } catch (err) { next(err); }
});

router.post('/', async (req, res, next) => {
  try {
    const { description, amount, type, paymentMethod, dayOfMonth } = req.body;
    if (!description?.trim() || !amount || !type || !dayOfMonth) {
      return res.status(400).json({ message: 'description, amount, type and dayOfMonth are required.' });
    }
    const template = await RecurringTemplate.create({
      userId: req.user.userId,
      description: description.trim(),
      amount, type, paymentMethod, dayOfMonth,
    });
    res.status(201).json(template);
  } catch (err) { next(err); }
});

router.delete('/:id', async (req, res, next) => {
  try {
    await RecurringTemplate.findOneAndDelete({ _id: req.params.id, userId: req.user.userId });
    res.json({ ok: true });
  } catch (err) { next(err); }
});

module.exports = router;
