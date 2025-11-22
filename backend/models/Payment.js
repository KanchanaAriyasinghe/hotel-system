const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  invoiceId: mongoose.Schema.Types.ObjectId,
  guestId: mongoose.Schema.Types.ObjectId,
  amount: Number,
  method: { type: String, enum: ['card', 'cash', 'upi', 'wallet'] },
  transactionId: String,
  status: { type: String, enum: ['success', 'failed', 'pending'], default: 'pending' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Payment', paymentSchema);