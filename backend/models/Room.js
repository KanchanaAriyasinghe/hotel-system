const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema(
  {
    roomNumber: {
      type: String,
      required: [true, 'Room number is required'],
      unique: true,
      trim: true,
    },
    roomType: {
      type: String,
      enum: ['single', 'double', 'deluxe', 'suite', 'family'],
      required: [true, 'Room type is required'],
    },
    floor: {
      type: Number,
      required: true,
      min: 0,
      max: 50,
    },
    capacity: {
      type: Number,
      required: true,
      min: 1,
      max: 10,
    },
    pricePerNight: {
      type: Number,
      required: true,
      min: 0,
    },
    description: {
      type: String,
      default: '',
    },
    amenities: [
      {
        type: String,
        enum: ['wifi', 'pool', 'spa', 'restaurant', 'bar', 'gym', 'tv', 'ac'],
      },
    ],
    status: {
      type: String,
      enum: ['available', 'occupied', 'maintenance', 'cleaning'],
      default: 'available',
    },
    images: [
      {
        type: String,
        default: null,
      },
    ],
    isActive: {
      type: Boolean,
      default: true,
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

roomSchema.index({ roomType: 1, status: 1 });
roomSchema.index({ roomNumber: 1 });

module.exports = mongoose.model('Room', roomSchema);