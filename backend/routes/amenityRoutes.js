// backend/routes/amenityRoutes.js

const express = require('express');
const router  = express.Router();
const {
  getAllAmenities,
  getAmenityById,
  createAmenity,
  updateAmenity,
  deleteAmenity,
  toggleAmenity,
} = require('../controllers/amenityController');
const { protect, isAdmin } = require('../middleware/authMiddleware');

// ── Public read — booking page fetches amenities without auth ─────────────
// Guests need the full amenity list to see optional add-ons during booking
router.get('/',    getAllAmenities);
router.get('/:id', getAmenityById);

// ── Admin only — write operations ─────────────────────────────────────────
router.post('/',            protect, isAdmin, createAmenity);
router.put('/:id',          protect, isAdmin, updateAmenity);
router.delete('/:id',       protect, isAdmin, deleteAmenity);
router.patch('/:id/toggle', protect, isAdmin, toggleAmenity);

module.exports = router;