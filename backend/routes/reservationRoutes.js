// backend/routes/reservationRoutes.js

const express = require('express');
const router = express.Router();
const {
  getAllReservations,
  getAvailableRooms,
  createReservation,
  getReservationById,
  updateReservation,
  cancelReservation,
  getReservationsByEmail,
} = require('../controllers/reservationController');
const { protect, isAdmin } = require('../middleware/authMiddleware');

// Public routes
router.get('/available', getAvailableRooms); // Get available rooms (must be before other GET routes)
router.post('/', createReservation); // Create reservation
router.get('/guest/:email', getReservationsByEmail); // Get reservations by email

// Protected routes
router.use(protect); // All routes below require authentication

router.get('/', getAllReservations); // Get all reservations (protected)
router.get('/:id', getReservationById); // Get reservation by ID
router.put('/:id', updateReservation); // Update reservation
router.delete('/:id', cancelReservation); // Cancel reservation

module.exports = router;