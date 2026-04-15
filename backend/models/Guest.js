// backend/models/Guest.js

const mongoose = require('mongoose');

const guestSchema = new mongoose.Schema(
  {
    userId: mongoose.Schema.Types.ObjectId,

    name: {
      type:     String,
      required: [true, 'Name is required'],
      trim:     true,
    },
    email: {
      type:      String,
      required:  [true, 'Email is required'],
      unique:    true,
      lowercase: true,
      trim:      true,
      match:     [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Invalid email'],
    },
    phone: {
      type: String,
      trim: true,
    },

    // Stored as "salt:hash" — never returned to client
    password: {
      type:   String,
      select: false,
    },

    // ID proof type selected during registration
    idProof: {
      type:    String,
      default: '',
      enum: {
        values: [
          '',
          'passport',
          'national_id',
          'drivers_license',
          'voter_id',
          'residence_permit',
          'military_id',
          'other',
        ],
        message: '{VALUE} is not a valid ID proof type',
      },
    },

    address:  { type: String, default: '' },
    city:     { type: String, default: '' },
    country:  { type: String, default: '' },

    preferences:    { type: [String], default: [] },
    bookingHistory: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Reservation' }],

    // ── Password reset ──────────────────────────────────────────
    passwordResetToken:  { type: String, select: false },
    passwordResetExpiry: { type: Date,   select: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Guest', guestSchema);