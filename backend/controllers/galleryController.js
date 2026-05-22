// backend/controllers/galleryController.js

const GalleryImage = require('../models/Gallery');

// ── Helper ────────────────────────────────────────────────────────
const sendError = (res, status, message) =>
  res.status(status).json({ success: false, message });

const sendSuccess = (res, status, data, message = 'Success') =>
  res.status(status).json({ success: true, message, data });

// ─────────────────────────────────────────────────────────────────
// PUBLIC
// ─────────────────────────────────────────────────────────────────

/**
 * GET /api/gallery/public
 * Returns all active images grouped by category (no auth required).
 */
exports.getPublicGallery = async (req, res) => {
  try {
    const images = await GalleryImage.find({ active: true })
      .sort({ category: 1, order: 1, createdAt: 1 })
      .select('-uploadedBy -__v');

    // Group by category
    const grouped = {};
    images.forEach(img => {
      if (!grouped[img.category]) grouped[img.category] = [];
      grouped[img.category].push(img);
    });

    return sendSuccess(res, 200, grouped, 'Gallery fetched');
  } catch (err) {
    console.error('getPublicGallery error:', err);
    return sendError(res, 500, 'Failed to fetch gallery');
  }
};

// ─────────────────────────────────────────────────────────────────
// ADMIN — requires auth + admin role (enforced in route middleware)
// ─────────────────────────────────────────────────────────────────

/**
 * GET /api/gallery
 * Returns ALL images (including inactive) for admin management.
 */
exports.getAllImages = async (req, res) => {
  try {
    const { category, active } = req.query;
    const filter = {};
    if (category) filter.category = category;
    if (active !== undefined) filter.active = active === 'true';

    const images = await GalleryImage.find(filter)
      .populate('uploadedBy', 'fullName email')
      .sort({ category: 1, order: 1, createdAt: -1 });

    return sendSuccess(res, 200, images, 'Images fetched');
  } catch (err) {
    console.error('getAllImages error:', err);
    return sendError(res, 500, 'Failed to fetch images');
  }
};

/**
 * POST /api/gallery
 * Add one or more images (supports bulk via array body).
 */
exports.addImages = async (req, res) => {
  try {
    const body = req.body;
    const items = Array.isArray(body) ? body : [body];

    if (!items.length) return sendError(res, 400, 'No image data provided');

    const docs = items.map(item => ({
      url:        item.url,
      caption:    item.caption,
      category:   item.category,
      order:      item.order ?? 0,
      active:     item.active ?? true,
      uploadedBy: req.user?._id,
    }));

    const created = await GalleryImage.insertMany(docs, { ordered: false });
    return sendSuccess(res, 201, created, `${created.length} image(s) added`);
  } catch (err) {
    if (err.name === 'ValidationError') {
      const messages = Object.values(err.errors).map(e => e.message);
      return sendError(res, 400, messages.join(', '));
    }
    console.error('addImages error:', err);
    return sendError(res, 500, 'Failed to add images');
  }
};

/**
 * PUT /api/gallery/:id
 * Update a single image.
 */
exports.updateImage = async (req, res) => {
  try {
    const { id } = req.params;
    const { url, caption, category, order, active } = req.body;

    const image = await GalleryImage.findByIdAndUpdate(
      id,
      { url, caption, category, order, active },
      { new: true, runValidators: true }
    );

    if (!image) return sendError(res, 404, 'Image not found');
    return sendSuccess(res, 200, image, 'Image updated');
  } catch (err) {
    if (err.name === 'ValidationError') {
      const messages = Object.values(err.errors).map(e => e.message);
      return sendError(res, 400, messages.join(', '));
    }
    console.error('updateImage error:', err);
    return sendError(res, 500, 'Failed to update image');
  }
};

/**
 * PATCH /api/gallery/:id/toggle
 * Toggle active status of an image.
 */
exports.toggleImage = async (req, res) => {
  try {
    const { id } = req.params;
    const image = await GalleryImage.findById(id);
    if (!image) return sendError(res, 404, 'Image not found');

    image.active = !image.active;
    await image.save();
    return sendSuccess(res, 200, image, `Image ${image.active ? 'activated' : 'deactivated'}`);
  } catch (err) {
    console.error('toggleImage error:', err);
    return sendError(res, 500, 'Failed to toggle image');
  }
};

/**
 * DELETE /api/gallery/:id
 * Delete a single image.
 */
exports.deleteImage = async (req, res) => {
  try {
    const { id } = req.params;
    const image = await GalleryImage.findByIdAndDelete(id);
    if (!image) return sendError(res, 404, 'Image not found');
    return sendSuccess(res, 200, { id }, 'Image deleted');
  } catch (err) {
    console.error('deleteImage error:', err);
    return sendError(res, 500, 'Failed to delete image');
  }
};

/**
 * DELETE /api/gallery/bulk
 * Delete multiple images by IDs.
 */
exports.bulkDelete = async (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || !ids.length)
      return sendError(res, 400, 'Provide an array of IDs to delete');

    const result = await GalleryImage.deleteMany({ _id: { $in: ids } });
    return sendSuccess(res, 200, { deleted: result.deletedCount }, `${result.deletedCount} image(s) deleted`);
  } catch (err) {
    console.error('bulkDelete error:', err);
    return sendError(res, 500, 'Failed to delete images');
  }
};

/**
 * GET /api/gallery/stats
 * Count images per category for the admin dashboard.
 */
exports.getStats = async (req, res) => {
  try {
    const stats = await GalleryImage.aggregate([
      {
        $group: {
          _id:      '$category',
          total:    { $sum: 1 },
          active:   { $sum: { $cond: ['$active', 1, 0] } },
          inactive: { $sum: { $cond: ['$active', 0, 1] } },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const totalAll    = stats.reduce((s, c) => s + c.total,    0);
    const totalActive = stats.reduce((s, c) => s + c.active,   0);

    return sendSuccess(res, 200, { categories: stats, totalAll, totalActive }, 'Stats fetched');
  } catch (err) {
    console.error('getStats error:', err);
    return sendError(res, 500, 'Failed to fetch stats');
  }
};