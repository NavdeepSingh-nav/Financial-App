const express = require('express');
const FinancialEntry = require('../models/FinancialEntry');
const RecurringTemplate = require('../models/RecurringTemplate');
const requireAuth = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

// Creates this month's entry for any recurring template that hasn't been
// materialized yet — runs lazily on read instead of needing a background scheduler,
// so it works even after the server (or a Render free-tier dyno) was asleep.
async function materializeRecurring(userId) {
  const currentMonth = new Date().toISOString().slice(0, 7);
  const due = await RecurringTemplate.find({ userId, lastGeneratedMonth: { $ne: currentMonth } });
  for (const t of due) {
    const date = `${currentMonth}-${String(t.dayOfMonth).padStart(2, '0')}`;
    await FinancialEntry.create({
      userId,
      description: `${t.description} (recurring)`,
      amount: t.amount, type: t.type, paymentMethod: t.paymentMethod, date,
      recurringId: t._id,
    });
    t.lastGeneratedMonth = currentMonth;
    await t.save();
  }
}

router.get('/', async (req, res, next) => {
  try {
    await materializeRecurring(req.user.userId);
    const entries = await FinancialEntry.find({ userId: req.user.userId }).sort({ createdAt: -1 });
    res.json(entries);
  } catch (err) { next(err); }
});

router.post('/', async (req, res, next) => {
  try {
    const { description, amount, type, paymentMethod, date, clientId } = req.body;
    if (!description?.trim() || !amount || !type || !date) {
      return res.status(400).json({ message: 'description, amount, type and date are all required.' });
    }
    const entry = await FinancialEntry.create({
      userId: req.user.userId,
      description: description.trim(),
      amount, type, paymentMethod, date,
      ...(clientId ? { clientId } : {}),
    });
    res.status(201).json(entry);
  } catch (err) {
    if (err.code === 11000 && err.keyPattern?.clientId && req.body.clientId) {
      const existing = await FinancialEntry.findOne({ clientId: req.body.clientId }).catch(() => null);
      if (existing) return res.status(201).json(existing);
    }
    next(err);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const { description, amount, type, paymentMethod, date } = req.body;
    if (!description?.trim() || !amount || !type || !date) {
      return res.status(400).json({ message: 'description, amount, type and date are all required.' });
    }
    const entry = await FinancialEntry.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.userId },
      { description: description.trim(), amount, type, paymentMethod, date },
      { new: true, runValidators: true }
    );
    if (!entry) return res.status(404).json({ message: 'Entry not found.' });
    res.json(entry);
  } catch (err) { next(err); }
});

router.delete('/:id', async (req, res, next) => {
  try {
    await FinancialEntry.findOneAndDelete({ _id: req.params.id, userId: req.user.userId });
    res.json({ ok: true });
  } catch (err) { next(err); }
});

module.exports = router;
