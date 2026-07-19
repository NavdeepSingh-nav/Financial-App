const mongoose = require('mongoose');

const schema = new mongoose.Schema({
  userId:        { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  name:          { type: String, required: true, trim: true },
  targetAmount:  { type: Number, required: true, min: 0 },
  currentAmount: { type: Number, default: 0, min: 0 },
  targetDate:    { type: String, default: '' },
  createdAt:     { type: Date, default: Date.now },
});

module.exports = mongoose.model('Goal', schema);
