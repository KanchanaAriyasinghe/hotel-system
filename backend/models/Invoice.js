const mongoose = require('mongoose');

const invoiceSchema = new mongoose.Schema({
  reservationId: mongoose.Schema.Types.ObjectId,
  guestId: mongoose.Schema.Types.ObjectId,
  items: [{
    description: String,
    quantity: Number,
    price: Number
  }],
  subtotal: Number,
  tax: Number,
  total: Number,
  status: { type: String, enum: ['pending', 'paid', 'cancelled'], default: 'pending' },
  dueDate: Date,
  paidDate: Date,
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Invoice', invoiceSchema);