const mongoose = require('mongoose');

const PAYMENT_METHODS = ['Cash', 'Bank Account', 'Debit Card', 'Credit Card', 'UPI', 'Wallet'];

const schema = new mongoose.Schema({
  userId:        { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  description:   { type: String, required: true, trim: true },
  amount:        { type: Number, required: true, min: 0 },
  type:          { type: String, enum: ['Income', 'Expense', 'Savings', 'Investment'], required: true },
  paymentMethod: { type: String, enum: PAYMENT_METHODS, default: 'Cash' },
  date:          { type: String, required: true },
  recurringId:   { type: mongoose.Schema.Types.ObjectId, ref: 'RecurringTemplate' },
  clientId:      { type: String, unique: true, sparse: true },
  createdAt:     { type: Date, default: Date.now },
});

module.exports = mongoose.model('FinancialEntry', schema);
