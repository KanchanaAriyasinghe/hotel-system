// backend/routes/roomRoutes.js

const express = require('express');
const router = express.Router();
const {
  getAllRooms,
  getRoomById,
  createRoom,
  updateRoom,
  deleteRoom,
  getAvailableRooms,
  getRoomsByType,
} = require('../controllers/roomController');

// Public routes
router.get('/', getAllRooms); // Get all rooms
router.post('/', createRoom); // Create room (public for now, can be protected later)
router.get('/available', getAvailableRooms); // Get available rooms (must be before /:id)
router.get('/type/:roomType', getRoomsByType); // Get rooms by type

// Protected routes (can add protection later if needed)
router.get('/:id', getRoomById); // Get room by ID
router.put('/:id', updateRoom); // Update room
router.delete('/:id', deleteRoom); // Delete room

module.exports = router;