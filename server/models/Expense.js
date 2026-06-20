const mongoose = require('mongoose');

const CATEGORIES = ['Food', 'Transport', 'Housing', 'Health', 'Entertainment', 'Shopping', 'Education', 'Other'];

const schema = new mongoose.Schema({
  title:     { type: String, required: true, trim: true },
  amount:    { type: Number, required: true, min: 0 },
  category:  { type: String, enum: CATEGORIES, required: true },
  date:      { type: String, required: true },
  note:      { type: String, default: '' },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Expense', schema);
