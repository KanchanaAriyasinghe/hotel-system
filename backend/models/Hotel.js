const mongoose = require('mongoose');

const hotelSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,
  email: String,
  phone: String,
  whatsapp: String,
  address: String,
  city: String,
  latitude: Number,
  longitude: Number,
  images: [String],
  amenities: [String],
  checkInTime: String,
  checkOutTime: String,
  currency: String,
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Hotel', hotelSchema);