const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  masterPasswordHash: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

userSchema.methods.verifyPassword = function (password) {
  return bcrypt.compare(password, this.masterPasswordHash);
};

module.exports = mongoose.model('User', userSchema);
