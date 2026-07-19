const mongoose = require('mongoose');

// Debit (expense) and Credit (money-in) use different category vocabularies —
// "Investment" appears in both since it means different things (money invested
// out vs. investment income received) but shares one enum entry.
const EXPENSE_CATEGORIES = ['Food & Dining', 'Fuel', 'Shopping', 'Travel', 'Rent', 'Bills', 'Medical', 'Entertainment', 'Education', 'EMI', 'Subscription', 'Investment', 'Family', 'Other'];
const INCOME_CATEGORIES = ['Salary', 'Freelance', 'Investment', 'Gift Received', 'Refund', 'Interest', 'Other Income'];
// Retired names from before the category rename — kept valid so existing documents
// can still be re-saved (e.g. edited) without failing enum validation.
const RETIRED_CATEGORIES = ['Food', 'Transport', 'Housing', 'Health'];
const CATEGORIES = [...new Set([...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES, ...RETIRED_CATEGORIES])];
const PAYMENT_METHODS = ['Cash', 'Bank Account', 'Debit Card', 'Credit Card', 'UPI', 'Wallet'];

const schema = new mongoose.Schema({
  userId:        { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  title:         { type: String, required: true, trim: true },
  amount:        { type: Number, required: true, min: 0 },
  category:      { type: String, enum: CATEGORIES, required: true },
  // Debit = money out (expense), Credit = money back in (refund/cashback) — kept
  // separate from `category` so a refund can still be tagged to the category it offsets.
  type:          { type: String, enum: ['Debit', 'Credit'], default: 'Debit' },
  paymentMethod: { type: String, enum: PAYMENT_METHODS, default: 'Cash' },
  date:          { type: String, required: true },
  note:          { type: String, default: '' },
  clientId:      { type: String, unique: true, sparse: true },
  createdAt:     { type: Date, default: Date.now },
});

module.exports = mongoose.model('Expense', schema);
