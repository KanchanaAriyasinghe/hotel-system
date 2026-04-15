// backend/routes/roomRoutes.js

const express = require('express');
const router = express.Router();
const {
  getAllRooms,
  getAllRoomsUnfiltered,
  getRoomById,
  createRoom,
  updateRoom,
  deleteRoom,
  getAvailableRooms,
  getRoomsByType,
  getRoomTypeSummary,  
} = require('../controllers/roomController');
const { protect, isAdmin, authorize } = require('../middleware/authMiddleware');

// ─────────────────────────────────────────────────────────────
// Special GET routes — must be declared BEFORE /:id
// ─────────────────────────────────────────────────────────────
router.get('/types/summary', getRoomTypeSummary);
router.get('/available',      protect, getAvailableRooms);
router.get('/type/:roomType', protect, getRoomsByType);

// ALL rooms in the hotel — no housekeeper assignment filter applied.
// Used by the housekeeper "All Rooms" read-only view.
// Accessible by admin and housekeeper roles.
router.get('/all', protect, authorize('admin', 'housekeeper'), getAllRoomsUnfiltered);

// Standard list — housekeepers only see their assigned rooms
router.get('/',    protect, getAllRooms);
router.get('/:id', protect, getRoomById);

// ─────────────────────────────────────────────────────────────
// Admin only — create, delete
// ─────────────────────────────────────────────────────────────
router.post('/',      protect, isAdmin, createRoom);
router.delete('/:id', protect, isAdmin, deleteRoom);

// ─────────────────────────────────────────────────────────────
// Admin + Housekeeper — update (controller handles field-level permissions)
// ─────────────────────────────────────────────────────────────
router.put('/:id', protect, authorize('admin', 'housekeeper'), updateRoom);

module.exports = router;
