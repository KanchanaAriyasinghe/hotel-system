// backend/controllers/staffController.js

const Staff = require('../models/Staff');
const User = require('../models/User');

// @desc      Get all staff
// @route     GET /api/staff
// @access    Private/Admin
exports.getAllStaff = async (req, res) => {
  try {
    const staff = await Staff.find()
      .populate('userId', 'fullName email role')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: staff.length,
      data: staff,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Error fetching staff',
    });
  }
};

// @desc      Get staff by ID
// @route     GET /api/staff/:id
// @access    Private/Admin
exports.getStaffById = async (req, res) => {
  try {
    const staff = await Staff.findById(req.params.id)
      .populate('userId', 'fullName email role');

    if (!staff) {
      return res.status(404).json({
        success: false,
        message: 'Staff not found',
      });
    }

    res.status(200).json({
      success: true,
      data: staff,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Error fetching staff',
    });
  }
};

// @desc      Create staff (optionally link user)
// @route     POST /api/staff
// @access    Private/Admin
exports.createStaff = async (req, res) => {
  try {
    const {
      userId,
      name,
      email,
      phone,
      department,
      position,
      salary,
      joinDate,
      shiftTiming
    } = req.body;

    // ✅ Basic validation
    if (!name || !email || !phone || !department || !position) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields',
      });
    }

    // ✅ Optional: validate userId exists
    if (userId) {
      const user = await User.findById(userId);
      if (!user) {
        return res.status(400).json({
          success: false,
          message: 'Invalid userId',
        });
      }
    }

    const staff = await Staff.create({
      userId,
      name,
      email,
      phone,
      department,
      position,
      salary,
      joinDate,
      shiftTiming
    });

    res.status(201).json({
      success: true,
      message: 'Staff created successfully',
      data: staff,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Error creating staff',
    });
  }
};

// @desc      Update staff
// @route     PUT /api/staff/:id
// @access    Private/Admin
exports.updateStaff = async (req, res) => {
  try {
    const {
      name,
      email,
      phone,
      department,
      position,
      salary,
      joinDate,
      shiftTiming,
      isActive
    } = req.body;

    let staff = await Staff.findById(req.params.id);

    if (!staff) {
      return res.status(404).json({
        success: false,
        message: 'Staff not found',
      });
    }

    // ✅ Update fields
    if (name) staff.name = name;
    if (email) staff.email = email;
    if (phone) staff.phone = phone;
    if (department) staff.department = department;
    if (position) staff.position = position;
    if (salary !== undefined) staff.salary = salary;
    if (joinDate) staff.joinDate = joinDate;
    if (shiftTiming) staff.shiftTiming = shiftTiming;
    if (isActive !== undefined) staff.isActive = isActive;

    await staff.save();

    res.status(200).json({
      success: true,
      message: 'Staff updated successfully',
      data: staff,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Error updating staff',
    });
  }
};

// @desc      Delete staff
// @route     DELETE /api/staff/:id
// @access    Private/Admin
exports.deleteStaff = async (req, res) => {
  try {
    const staff = await Staff.findByIdAndDelete(req.params.id);

    if (!staff) {
      return res.status(404).json({
        success: false,
        message: 'Staff not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Staff deleted successfully',
      data: staff,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Error deleting staff',
    });
  }
};

// @desc      Get staff by department
// @route     GET /api/staff/department/:department
// @access    Private/Admin
exports.getStaffByDepartment = async (req, res) => {
  try {
    const { department } = req.params;

    const staff = await Staff.find({ department })
      .populate('userId', 'fullName email role');

    res.status(200).json({
      success: true,
      count: staff.length,
      data: staff,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Error fetching staff by department',
    });
  }
};