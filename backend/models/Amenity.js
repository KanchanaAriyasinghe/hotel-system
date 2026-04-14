// backend/models/Amenity.js

const mongoose = require('mongoose');

const amenitySchema = new mongoose.Schema(
  {
    name: {
      type:      String,
      required:  [true, 'Amenity name is required'],
      unique:    true,
      trim:      true,
      lowercase: true,
    },
    label: {
      type:     String,
      required: [true, 'Amenity label is required'],
      trim:     true,
    },
    icon: {
      type:    String,
      default: '✦',
      trim:    true,
    },
    price: {
      type:     Number,
      required: [true, 'Amenity price is required'],
      min:      [0, 'Price cannot be negative'],
      default:  0,
    },
    // ── pricingModel: how the price is applied ────────────────────────────────
    // 'flat'   → one-time charge regardless of nights/hours
    // 'hourly' → price × hours (guest chooses hours)
    // 'daily'  → price × number of nights in stay
    pricingModel: {
      type:    String,
      enum:    ['flat', 'hourly', 'daily'],
      default: 'flat',
    },
    description: {
      type:    String,
      default: '',
      trim:    true,
    },
    isActive: {
      type:    Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

amenitySchema.index({ name: 1 });
amenitySchema.index({ isActive: 1 });

module.exports = mongoose.model('Amenity', amenitySchema);