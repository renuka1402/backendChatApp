const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
  sender: { type: String, required: true, trim: true, index: true },
  recipient: { type: String, required: true, trim: true, index: true },
  message: { type: String, required: true, trim: true },
  timestamp: { type: Date, default: Date.now, index: true },
  isRead: { type: Boolean, default: false }     
});

module.exports = mongoose.model('Message', MessageSchema);
