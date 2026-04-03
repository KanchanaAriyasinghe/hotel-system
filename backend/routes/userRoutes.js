// backend/routes/userRoutes.js

const express = require('express');
const router = express.Router();
const {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  getUsersByRole,
  changePassword,       // ← new
} = require('../controllers/userController');
const { protect, isAdmin } = require('../middleware/authMiddleware');

// ─────────────────────────────────────────────────────────────
// ✅ PASSWORD CHANGE — any authenticated user, own account only
//    MUST be declared BEFORE router.use(protect, isAdmin)
//    so it is NOT subject to the admin-only guard.
// ─────────────────────────────────────────────────────────────
router.put('/:id/password', protect, changePassword);

// ─────────────────────────────────────────────────────────────
// All routes below this line require authentication + admin role
// ─────────────────────────────────────────────────────────────
router.use(protect, isAdmin);

router.get('/',              getAllUsers);
router.get('/role/:role',    getUsersByRole);
router.get('/:id',           getUserById);
router.post('/',             createUser);
router.put('/:id',           updateUser);
router.delete('/:id',        deleteUser);

module.exports = router;