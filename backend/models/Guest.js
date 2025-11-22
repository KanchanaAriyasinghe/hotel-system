const mongoose = require('mongoose');

const guestSchema = new mongoose.Schema({
  userId: mongoose.Schema.Types.ObjectId,
  name: String,
  email: String,
  phone: String,
  idProof: String,
  address: String,
  city: String,
  country: String,
  preferences: [String],
  bookingHistory: [mongoose.Schema.Types.ObjectId],
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Guest', guestSchema);