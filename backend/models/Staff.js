const mongoose = require('mongoose');

const staffSchema = new mongoose.Schema({
  userId: mongoose.Schema.Types.ObjectId,
  name: String,
  email: String,
  phone: String,
  department: String,
  position: String,
  salary: Number,
  joinDate: Date,
  shiftTiming: String,
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Staff', staffSchema);