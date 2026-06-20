const mongoose = require('mongoose');

// Sensitive fields (username, password, note) are stored AES-256-GCM encrypted.
const schema = new mongoose.Schema({
  userId:            { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  site:              { type: String, required: true, trim: true },
  usernameEncrypted: { type: String, required: true },
  passwordEncrypted: { type: String, required: true },
  noteEncrypted:     { type: String, default: '' },
  createdAt:         { type: Date, default: Date.now },
});

module.exports = mongoose.model('Password', schema);
