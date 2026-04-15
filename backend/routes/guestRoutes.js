// backend/routes/guestRoutes.js

const express = require('express');
const router  = express.Router();

const {
  registerGuest,
  loginGuest,
  forgotPassword,
  resetPassword,
  getGuestMe,
  updateGuestProfile,
  getGuestById,
  getAllGuests,
} = require('../controllers/guestController');

const { protectGuest }       = require('../middleware/guestAuthMiddleware');
const { protect, authorize } = require('../middleware/authMiddleware');

// ── Public — guest auth ────────────────────────────────────────────────────
router.post('/register',       registerGuest);
router.post('/login',          loginGuest);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password/:token', resetPassword);

// ── Guest self-service ─────────────────────────────────────────────────────
router.get('/me',  protectGuest, getGuestMe);
router.put('/me',  protectGuest, updateGuestProfile);

// ── Staff / admin — manage all guests ─────────────────────────────────────
router.get('/',    protect, authorize('admin', 'receptionist'), getAllGuests);
router.get('/:id', protect, authorize('admin', 'receptionist'), getGuestById);

module.exports = router;