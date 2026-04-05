const express = require('express');
const router  = express.Router();
const {
  getAllReservations,
  getAvailableRooms,
  createReservation,
  getReservationById,
  updateReservation,
  cancelReservation,
  getReservationsByEmail,
  getRoomBookingStatus,
  getRoomBookingStatuses,
} = require('../controllers/reservationController');
const { protect, isAdmin, authorize } = require('../middleware/authMiddleware');

// ─────────────────────────────────────────────────────────────
// Public routes — no auth required
// ─────────────────────────────────────────────────────────────
router.get('/available',     getAvailableRooms);
router.post('/',             createReservation);
router.get('/guest/:email',  getReservationsByEmail);

// ─────────────────────────────────────────────────────────────
// Protected routes — must be logged in
// ─────────────────────────────────────────────────────────────
router.use(protect);

// ── Room booking-status helpers (used by housekeeper dashboard) ────────────
// Batch: POST /api/reservations/room-statuses  { roomIds: [...] }
router.post('/room-statuses', getRoomBookingStatuses);
// Single: GET /api/reservations/room-status/:roomId
router.get('/room-status/:roomId', getRoomBookingStatus);

router.get('/',    authorize('admin', 'receptionist'), getAllReservations);
router.get('/:id', authorize('admin', 'receptionist'), getReservationById);
router.put('/:id', authorize('admin', 'receptionist'), updateReservation);

// Cancel (active) or permanently delete (already-cancelled) — admin + receptionist
router.delete('/:id', authorize('admin', 'receptionist'), cancelReservation);

module.exports = router;