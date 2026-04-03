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

    // ── Assigned Housekeeper ───────────────────────────────────────────────────
    // References a User whose role === 'housekeeper'.
    // Optional — a room may not always have an assigned housekeeper.
    assignedHousekeeper: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },

    // ── Maintenance Reason ─────────────────────────────────────────────────────
    // Only meaningful when status === 'maintenance'.
    // Housekeeper can enter the reason; admin can read it.
    // Automatically cleared when the room leaves maintenance status.
    maintenanceReason: {
      type: String,
      default: null,
      trim: true,
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
  },
  { timestamps: true } // handles createdAt + updatedAt automatically
);

// ── Middleware: clear maintenanceReason when status leaves 'maintenance' ───────
// Runs on save() calls (e.g. from roomController.updateRoom)
roomSchema.pre('save', function (next) {
  if (this.isModified('status') && this.status !== 'maintenance') {
    this.maintenanceReason = null;
  }
  next();
});

// Runs on findOneAndUpdate() calls
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
roomSchema.index({ assignedHousekeeper: 1 }); // quickly find rooms by housekeeper

module.exports = mongoose.model('Room', roomSchema);