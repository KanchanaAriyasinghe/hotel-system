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
} = require('../controllers/userController');
const { protect, isAdmin } = require('../middleware/authMiddleware');

// All routes require authentication and admin role
router.use(protect, isAdmin);

// User CRUD routes
router.get('/', getAllUsers);
router.get('/:id', getUserById);
router.post('/', createUser);
router.put('/:id', updateUser);
router.delete('/:id', deleteUser);
router.get('/role/:role', getUsersByRole);

module.exports = router;