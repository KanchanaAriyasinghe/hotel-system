const User = require('../models/User');
const { sendWelcomeEmail, sendRoleAssignedEmail } = require('../utils/emailService');

const validRoles = ['admin', 'receptionist', 'housekeeper'];

// @desc      Get all users
// @route     GET /api/users
// @access    Private/Admin
exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select('-password');
    res.status(200).json({ success: true, count: users.length, data: users });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message || 'Error fetching users' });
  }
};

// @desc      Get user by ID
// @route     GET /api/users/:id
// @access    Private/Admin
exports.getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    res.status(200).json({ success: true, data: user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message || 'Error fetching user' });
  }
};

// @desc      Create new user
// @route     POST /api/users
// @access    Private/Admin
exports.createUser = async (req, res) => {
  try {
    const { fullName, email, phoneNumber, password, role } = req.body;

    if (!fullName || !email || !phoneNumber || !password || !role) {
      return res.status(400).json({ success: false, message: 'Please provide all required fields' });
    }

    if (!validRoles.includes(role)) {
      return res.status(400).json({ success: false, message: 'Invalid role provided' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'User already exists with this email' });
    }

    // Create user — pre-save hook hashes the password
    const user = await User.create({ fullName, email, phoneNumber, password, role });

    // Send welcome email with plain-text password from req.body
    sendWelcomeEmail({
      toEmail:      user.email,
      toName:       user.fullName,
      role:         user.role,
      tempPassword: password,
    }).catch(err => console.error('[createUser] welcome email failed:', err.message));

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: {
        id:          user._id,
        fullName:    user.fullName,
        email:       user.email,
        phoneNumber: user.phoneNumber,
        role:        user.role,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message || 'Error creating user' });
  }
};

// @desc      Update user
// @route     PUT /api/users/:id
// @access    Private/Admin
exports.updateUser = async (req, res) => {
  try {
    const { fullName, email, phoneNumber, role, isActive } = req.body;

    let user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Capture old role BEFORE mutations
    const oldRole = user.role;

    if (role && !validRoles.includes(role)) {
      return res.status(400).json({ success: false, message: 'Invalid role provided' });
    }

    if (fullName)               user.fullName    = fullName;
    if (email)                  user.email       = email;
    if (phoneNumber)            user.phoneNumber = phoneNumber;
    if (role)                   user.role        = role;
    if (isActive !== undefined) user.isActive    = isActive;

    await user.save();

    // Send role-change email if role actually changed
    if (role && role !== oldRole) {
      sendRoleAssignedEmail({
        toEmail:    user.email,
        toName:     user.fullName,
        newRole:    role,
        assignedBy: req.user?.fullName || req.user?.email || 'An administrator',
      }).catch(err => console.error('[updateUser] role email failed:', err.message));
    }

    res.status(200).json({
      success: true,
      message: 'User updated successfully',
      data: {
        id:          user._id,
        fullName:    user.fullName,
        email:       user.email,
        phoneNumber: user.phoneNumber,
        role:        user.role,
        isActive:    user.isActive,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message || 'Error updating user' });
  }
};

// @desc      Delete user
// @route     DELETE /api/users/:id
// @access    Private/Admin
exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    res.status(200).json({ success: true, message: 'User deleted successfully', data: user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message || 'Error deleting user' });
  }
};

// @desc      Get users by role
// @route     GET /api/users/role/:role
// @access    Private/Admin
exports.getUsersByRole = async (req, res) => {
  try {
    const { role } = req.params;
    if (!validRoles.includes(role)) {
      return res.status(400).json({ success: false, message: 'Invalid role provided' });
    }
    const users = await User.find({ role }).select('-password');
    res.status(200).json({ success: true, count: users.length, data: users });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message || 'Error fetching users' });
  }
};

// @desc      Change own password
// @route     PUT /api/users/:id/password
// @access    Private
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (req.user._id.toString() !== req.params.id) {
      return res.status(403).json({ success: false, message: 'You can only change your own password' });
    }

    const user = await User.findById(req.params.id).select('+password');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const isMatch = await user.matchPassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Current password is incorrect' });
    }

    user.password = newPassword;
    await user.save();

    res.status(200).json({ success: true, message: 'Password updated successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc      Update notification preferences
// @route     PUT /api/users/:id/notification-prefs
// @access    Private (own account only)
exports.updateNotificationPrefs = async (req, res) => {
  try {
    if (req.user._id.toString() !== req.params.id) {
      return res.status(403).json({ success: false, message: 'You can only update your own preferences' });
    }

    const allowed = ['newReservation', 'checkIn', 'checkOut', 'cancellation', 'payment', 'systemAlerts'];
    const prefs   = {};
    allowed.forEach(key => {
      if (req.body[key] !== undefined) {
        prefs[`notificationPrefs.${key}`] = req.body[key];
      }
    });

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { $set: prefs },
      { new: true }
    ).select('notificationPrefs');

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.status(200).json({ success: true, data: user.notificationPrefs });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};