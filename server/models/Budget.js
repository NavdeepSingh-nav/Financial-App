const mongoose = require('mongoose');

// Matches ExpenseTracker's DEBIT_CATEGORIES — budgets only apply to spending categories.
const CATEGORIES = ['Food & Dining', 'Fuel', 'Shopping', 'Travel', 'Rent', 'Bills', 'Medical', 'Entertainment', 'Education', 'EMI', 'Subscription', 'Investment', 'Family', 'Other'];

const schema = new mongoose.Schema({
  userId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  category:  { type: String, enum: CATEGORIES, required: true },
  limit:     { type: Number, required: true, min: 0 },
  createdAt: { type: Date, default: Date.now },
});

schema.index({ userId: 1, category: 1 }, { unique: true });

module.exports = mongoose.model('Budget', schema);
