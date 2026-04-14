// backend/models/Room.js

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

    // ── Amenities — references the Amenity collection ──────────────────────────
    amenities: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Amenity',
      },
    ],

    status: {
      type: String,
      enum: ['available', 'occupied', 'maintenance', 'cleaning'],
      default: 'available',
    },

    // ── Assigned Housekeeper ───────────────────────────────────────────────────
    assignedHousekeeper: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },

    // ── Maintenance Reason ─────────────────────────────────────────────────────
    maintenanceReason: {
      type: String,
      default: null,
      trim: true,
    },

    // ── Images ─────────────────────────────────────────────────────────────────
    images: {
      type: [String],
      default: [],
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

// ── Middleware: clear maintenanceReason when status leaves 'maintenance' ───────
roomSchema.pre('save', function (next) {
  if (this.isModified('status') && this.status !== 'maintenance') {
    this.maintenanceReason = null;
  }
  next();
});

roomSchema.pre('findOneAndUpdate', function (next) {
  const update = this.getUpdate();
  if (update.status && update.status !== 'maintenance') {
    update.maintenanceReason = null;
  }
  next();
});

// ── Indexes ────────────────────────────────────────────────────────────────────
roomSchema.index({ roomType: 1, status: 1 });
roomSchema.index({ roomNumber: 1 });
roomSchema.index({ assignedHousekeeper: 1 });

module.exports = mongoose.model('Room', roomSchema);