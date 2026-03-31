// backend/routes/staffRoutes.js

const express = require('express');
const router  = express.Router();
const staffController = require('../controllers/staffController');

// ⚠️  IMPORTANT: specific routes must come BEFORE dynamic /:id routes
//     Otherwise GET /department/Housekeeping would be caught by /:id first.

// 🔹 Get staff by department  (must be above /:id)
router.get('/department/:department', staffController.getStaffByDepartment);

// 🔹 Get all staff
router.get('/', staffController.getAllStaff);

// 🔹 Get staff by ID
router.get('/:id', staffController.getStaffById);

// 🔹 Create new staff
router.post('/', staffController.createStaff);

// 🔹 Update staff
router.put('/:id', staffController.updateStaff);

// 🔹 Delete staff
router.delete('/:id', staffController.deleteStaff);

module.exports = router;