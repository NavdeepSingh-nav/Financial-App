const mongoose = require('mongoose');

const schema = new mongoose.Schema({
  userId:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  description: { type: String, required: true, trim: true },
  amount:      { type: Number, required: true, min: 0 },
  type:        { type: String, enum: ['Income', 'Expense', 'Savings', 'Investment'], required: true },
  date:        { type: String, required: true },
  createdAt:   { type: Date, default: Date.now },
});

module.exports = mongoose.model('FinancialEntry', schema);
