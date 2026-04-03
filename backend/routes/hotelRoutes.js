// backend/routes/hotelRoutes.js

const express = require('express');
const router  = express.Router();
const {
  getHotel,
  getHotelById,
  createHotel,
  updateHotel,
  upsertHotel,
  addImages,
  removeImage,
  addAmenities,
  removeAmenity,
  deleteHotel,
  getPublicHotel,
} = require('../controllers/hotelController');

const { protect, isAdmin } = require('../middleware/authMiddleware');
// protect  → any logged-in user (JWT verified)
// isAdmin  → role must be 'admin'

// ── Public (no auth needed) ───────────────────────────────────────
router.get('/public', getPublicHotel);   // GET  /api/hotel/public
router.get('/',       getHotel);         // GET  /api/hotel
router.get('/:id',    getHotelById);     // GET  /api/hotel/:id

// ── Admin only ────────────────────────────────────────────────────
router.post(  '/',                protect, isAdmin, createHotel);    // POST   /api/hotel
router.put(   '/:id',             protect, isAdmin, updateHotel);    // PUT    /api/hotel/:id
router.patch( '/',                protect, isAdmin, upsertHotel);    // PATCH  /api/hotel

router.post(  '/:id/images',      protect, isAdmin, addImages);      // POST   /api/hotel/:id/images
router.delete('/:id/images',      protect, isAdmin, removeImage);    // DELETE /api/hotel/:id/images

router.post(  '/:id/amenities',   protect, isAdmin, addAmenities);   // POST   /api/hotel/:id/amenities
router.delete('/:id/amenities',   protect, isAdmin, removeAmenity);  // DELETE /api/hotel/:id/amenities

router.delete('/:id',             protect, isAdmin, deleteHotel);    // DELETE /api/hotel/:id

module.exports = router;