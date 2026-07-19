const mongoose = require('mongoose');

const PAYMENT_METHODS = ['Cash', 'Bank Account', 'Debit Card', 'Credit Card', 'UPI', 'Wallet'];

const schema = new mongoose.Schema({
  userId:             { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  description:        { type: String, required: true, trim: true },
  amount:             { type: Number, required: true, min: 0 },
  type:               { type: String, enum: ['Income', 'Expense', 'Savings', 'Investment'], required: true },
  paymentMethod:      { type: String, enum: PAYMENT_METHODS, default: 'Cash' },
  // Capped at 28 so it lands in every month regardless of length.
  dayOfMonth:         { type: Number, required: true, min: 1, max: 28 },
  // 'YYYY-MM' of the last month an entry was auto-created for — prevents duplicates.
  lastGeneratedMonth: { type: String, default: '' },
  createdAt:          { type: Date, default: Date.now },
});

module.exports = mongoose.model('RecurringTemplate', schema);
