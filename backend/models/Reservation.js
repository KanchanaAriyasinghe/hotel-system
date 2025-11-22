const mongoose = require('mongoose');

const reservationSchema = new mongoose.Schema({
  guestId: mongoose.Schema.Types.ObjectId,
  roomId: mongoose.Schema.Types.ObjectId,
  checkInDate: Date,
  checkOutDate: Date,
  numberOfGuests: Number,
  status: { type: String, enum: ['pending', 'confirmed', 'checked-in', 'checked-out', 'cancelled'], default: 'pending' },
  totalPrice: Number,
  notes: String,
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Reservation', reservationSchema);