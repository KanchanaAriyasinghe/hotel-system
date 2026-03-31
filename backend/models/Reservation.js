// backend/models/Reservation.js

const mongoose = require('mongoose');

const reservationSchema = new mongoose.Schema(
  {
    guestName: {
      type: String,
      required: [true, 'Guest name is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      lowercase: true,
      match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email'],
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true,
    },
    checkInDate: {
      type: Date,
      required: [true, 'Check-in date is required'],
    },
    checkOutDate: {
      type: Date,
      required: [true, 'Check-out date is required'],
    },
    roomIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Room',
        required: true,
      },
    ],
    roomType: {
      type: String,
      enum: ['single', 'double', 'deluxe', 'suite', 'family'],
      required: true,
    },
    numberOfGuests: {
      type: Number,
      required: true,
      min: 1,
      max: 10,
    },
    numberOfRooms: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    amenities: [
      {
        type: String,
        enum: ['wifi', 'pool', 'spa', 'restaurant', 'bar', 'gym'],
      },
    ],
    specialRequests: {
      type: String,
      default: '',
      trim: true,
    },
    totalPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'checked-in', 'checked-out', 'cancelled'],
      default: 'pending',
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'completed', 'failed', 'refunded'],
      default: 'pending',
    },
    confirmationNumber: {
      type: String,
      unique: true,
      sparse: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// Generate confirmation number before saving
reservationSchema.pre('save', async function (next) {
  if (!this.confirmationNumber) {
    const count = await this.constructor.countDocuments();
    this.confirmationNumber = `RES${Date.now()}${count + 1}`;
  }
  next();
});

module.exports = mongoose.model('Reservation', reservationSchema);