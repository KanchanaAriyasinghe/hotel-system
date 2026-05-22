// backend/models/Gallery.js

const mongoose = require('mongoose');

const GalleryImageSchema = new mongoose.Schema(
  {
    url: {
      type: String,
      required: [true, 'Image URL is required'],
      trim: true,
    },
    caption: {
      type: String,
      required: [true, 'Caption is required'],
      trim: true,
      maxlength: [200, 'Caption cannot exceed 200 characters'],
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      enum: {
        values: ['rooms', 'pool', 'restaurant', 'spa', 'food', 'exclusive', 'services'],
        message: 'Category must be one of: rooms, pool, restaurant, spa, food, exclusive, services',
      },
    },
    order: {
      type: Number,
      default: 0,
    },
    active: {
      type: Boolean,
      default: true,
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

// Index for faster queries
GalleryImageSchema.index({ category: 1, order: 1 });
GalleryImageSchema.index({ active: 1 });

module.exports = mongoose.model('GalleryImage', GalleryImageSchema);