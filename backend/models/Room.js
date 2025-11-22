const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema({
  roomNumber: { type: String, required: true, unique: true },
  type: { type: String, enum: ['single', 'double', 'suite', 'deluxe', 'penthouse'] },
  price: Number,
  capacity: Number,
  amenities: [String],
  images: [String],
  status: { type: String, enum: ['available', 'occupied', 'maintenance', 'reserved'], default: 'available' },
  description: String,
  floor: Number,
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Room', roomSchema);