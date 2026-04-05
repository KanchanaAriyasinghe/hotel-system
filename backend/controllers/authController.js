// backend/controllers/authController.js

const crypto = require('crypto');   // built-in Node.js module — no install needed
const User   = require('../models/User');
const jwt    = require('jsonwebtoken');

// ── Generate JWT Token ────────────────────────────────────────────
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d',
  });
};

// ═══════════════════════════════════════════════════════════════════
// @desc      Register user
// @route     POST /api/auth/register
// @access    Public
// ═══════════════════════════════════════════════════════════════════
exports.register = async (req, res) => {
  try {
    const { fullName, email, phoneNumber, password, role } = req.body;

    if (!fullName || !email || !phoneNumber || !password || !role) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields',
      });
    }

    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email',
      });
    }

    const validRoles = ['admin', 'receptionist', 'housekeeper'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role provided',
      });
    }

    user = await User.create({ fullName, email, phoneNumber, password, role });

    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      token,
      user: {
        id:          user._id,
        fullName:    user.fullName,
        email:       user.email,
        phoneNumber: user.phoneNumber,
        role:        String(user.role).toLowerCase().trim(),
      },
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error during registration',
    });
  }
};

// ═══════════════════════════════════════════════════════════════════
// @desc      Login user
// @route     POST /api/auth/login
// @access    Public
// ═══════════════════════════════════════════════════════════════════
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password',
      });
    }

    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'This user account is inactive',
      });
    }

    const isPasswordCorrect = await user.matchPassword(password);
    if (!isPasswordCorrect) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    user.lastLogin = new Date();
    await user.save();

    const token = generateToken(user._id);

    res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id:          user._id,
        fullName:    user.fullName,
        email:       user.email,
        phoneNumber: user.phoneNumber,
        role:        String(user.role).toLowerCase().trim(),
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error during login',
    });
  }
};

// ═══════════════════════════════════════════════════════════════════
// @desc      Get current logged in user
// @route     GET /api/auth/me
// @access    Private
// ═══════════════════════════════════════════════════════════════════
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    res.status(200).json({ success: true, user });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Error fetching user',
    });
  }
};

// ═══════════════════════════════════════════════════════════════════
// @desc      Update user profile
// @route     PUT /api/auth/update-profile
// @access    Private
// ═══════════════════════════════════════════════════════════════════
exports.updateProfile = async (req, res) => {
  try {
    const { fullName, phoneNumber, profileImage } = req.body;

    let user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (fullName)      user.fullName    = fullName;
    if (phoneNumber)   user.phoneNumber = phoneNumber;
    if (profileImage)  user.profileImage = profileImage;

    user = await user.save();

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      user: {
        id:           user._id,
        fullName:     user.fullName,
        email:        user.email,
        phoneNumber:  user.phoneNumber,
        role:         user.role,
        profileImage: user.profileImage,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Error updating profile',
    });
  }
};

// ═══════════════════════════════════════════════════════════════════
// @desc      Logout user
// @route     POST /api/auth/logout
// @access    Private
// ═══════════════════════════════════════════════════════════════════
exports.logout = async (req, res) => {
  try {
    res.status(200).json({ success: true, message: 'Logout successful' });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Error during logout',
    });
  }
};

// ═══════════════════════════════════════════════════════════════════
// @desc      Forgot password — generate token & send reset email
// @route     POST /api/auth/forgot-password
// @access    Public
// ═══════════════════════════════════════════════════════════════════
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Please provide your email address',
      });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });

    // Always return 200 to prevent email enumeration attacks
    if (!user) {
      return res.status(200).json({
        success: true,
        message: 'If that email is registered, you will receive a reset link shortly.',
      });
    }

    // Generate a cryptographically secure random token
    const rawToken    = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');

    // Save hashed token + expiry (15 minutes) to user document
    user.passwordResetToken   = hashedToken;
    user.passwordResetExpires = Date.now() + 15 * 60 * 1000; // 15 min
    await user.save({ validateBeforeSave: false });

    // Build the reset URL (links to your React app)
    const resetURL = `${process.env.REACT_APP_URL || 'http://localhost:3000'}/reset-password/${rawToken}`;

    try {
      const { sendPasswordResetEmail } = require('../utils/emailService');
      await sendPasswordResetEmail({
        toEmail:   user.email,
        toName:    user.fullName,
        resetURL,
        expiresIn: '15 minutes',
      });
    } catch (emailErr) {
      console.error('[forgotPassword] email send failed:', emailErr.message);
      // Clear tokens so the user can retry cleanly
      user.passwordResetToken   = undefined;
      user.passwordResetExpires = undefined;
      await user.save({ validateBeforeSave: false });
      return res.status(500).json({
        success: false,
        message: 'Email could not be sent. Please try again later.',
      });
    }

    res.status(200).json({
      success: true,
      message: 'If that email is registered, you will receive a reset link shortly.',
    });
  } catch (error) {
    console.error('[forgotPassword] error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error. Please try again.',
    });
  }
};

// ═══════════════════════════════════════════════════════════════════
// @desc      Reset password using token from email link
// @route     PUT /api/auth/reset-password/:token
// @access    Public
// ═══════════════════════════════════════════════════════════════════
exports.resetPassword = async (req, res) => {
  try {
    const { token }    = req.params;
    const { password } = req.body;

    if (!password || password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters',
      });
    }

    // Hash the raw token from the URL to compare against the DB
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    // Find user with matching token that has NOT expired
    const user = await User.findOne({
      passwordResetToken:   hashedToken,
      passwordResetExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Reset link is invalid or has expired. Please request a new one.',
      });
    }

    // Set the new password (pre-save hook hashes it automatically)
    user.password             = password;
    user.passwordResetToken   = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    // Issue a fresh JWT so the user is immediately logged in
    const jwtToken = generateToken(user._id);

    res.status(200).json({
      success: true,
      message: 'Password has been reset successfully',
      token:   jwtToken,
      user: {
        id:       user._id,
        fullName: user.fullName,
        email:    user.email,
        role:     String(user.role).toLowerCase().trim(),
      },
    });
  } catch (error) {
    console.error('[resetPassword] error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error. Please try again.',
    });
  }
};