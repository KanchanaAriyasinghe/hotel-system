// backend/routes/galleryRoutes.js

const express    = require('express');
const router     = express.Router();
const controller = require('../controllers/galleryController');

// ── Middleware imports ────────────────────────────────────────────
// Adjust the path to match your project's auth middleware location.
// Typical pattern: protect = JWT check, adminOnly = role guard.
let protect, adminOnly;
try {
  const mw   = require('../middleware/authMiddleware');
  protect    = mw.protect    || mw.verifyToken || mw.authenticate;
  adminOnly  = mw.adminOnly  || mw.isAdmin     || mw.requireAdmin;
} catch {
  // Fallback: if your project uses a different structure, update the require path.
  console.warn('⚠  galleryRoutes: could not load authMiddleware — routes will be unprotected in dev');
  protect   = (req, res, next) => next();
  adminOnly = (req, res, next) => next();
}

// ─────────────────────────────────────────────────────────────────
// PUBLIC ROUTES (no auth)
// ─────────────────────────────────────────────────────────────────
router.get('/public', controller.getPublicGallery);

// ─────────────────────────────────────────────────────────────────
// ADMIN ROUTES (auth required)
// ─────────────────────────────────────────────────────────────────
router.get(   '/stats',    protect, adminOnly, controller.getStats);
router.get(   '/',         protect, adminOnly, controller.getAllImages);
router.post(  '/',         protect, adminOnly, controller.addImages);
router.put(   '/:id',      protect, adminOnly, controller.updateImage);
router.patch( '/:id/toggle', protect, adminOnly, controller.toggleImage);
router.delete('/bulk',     protect, adminOnly, controller.bulkDelete);
router.delete('/:id',      protect, adminOnly, controller.deleteImage);

module.exports = router;