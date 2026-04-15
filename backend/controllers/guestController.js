// backend/controllers/guestController.js

const crypto  = require('crypto');
const Guest   = require('../models/Guest');
const jwt     = require('jsonwebtoken');
const nodemailer = require('nodemailer');

// ── Generate JWT for guest ─────────────────────────────────────────────────
const generateGuestToken = (id) =>
  jwt.sign({ id, role: 'guest' }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d',
  });

// ── Helper: safe guest payload ─────────────────────────────────────────────
const guestPayload = (g) => ({
  id:          g._id,
  name:        g.name,
  email:       g.email,
  phone:       g.phone,
  address:     g.address     || '',
  city:        g.city        || '',
  country:     g.country     || '',
  idProof:     g.idProof     || '',
  preferences: g.preferences || [],
});

// ── Mailer helper ──────────────────────────────────────────────────────────
const createTransporter = () =>
  nodemailer.createTransport({
    host:   process.env.SMTP_HOST   || 'smtp.gmail.com',
    port:   Number(process.env.SMTP_PORT || 587),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

// ═══════════════════════════════════════════════════════════════════════════
// @desc   Register a new guest
// @route  POST /api/guests/register
// @access Public
// ═══════════════════════════════════════════════════════════════════════════
exports.registerGuest = async (req, res) => {
  try {
    const { name, email, phone, password, address, city, country, idProof } = req.body;

    if (!name || !email || !phone || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide name, email, phone and password',
      });
    }

    const existing = await Guest.findOne({ email: email.toLowerCase().trim() });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'An account with this email already exists',
      });
    }

    // Hash password
    const salt           = crypto.randomBytes(16).toString('hex');
    const hashedPassword = crypto
      .pbkdf2Sync(password, salt, 1000, 64, 'sha512')
      .toString('hex');

    const guest = await Guest.create({
      name:     name.trim(),
      email:    email.toLowerCase().trim(),
      phone:    phone.trim(),
      password: `${salt}:${hashedPassword}`,
      address:  address  || '',
      city:     city     || '',
      country:  country  || '',
      idProof:  idProof  || '',
    });

    const token = generateGuestToken(guest._id);

    res.status(201).json({
      success: true,
      message: 'Account created successfully',
      token,
      guest: guestPayload(guest),
    });
  } catch (error) {
    console.error('[registerGuest]', error);
    res.status(500).json({ success: false, message: error.message || 'Registration failed' });
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// @desc   Login a guest
// @route  POST /api/guests/login
// @access Public
// ═══════════════════════════════════════════════════════════════════════════
exports.loginGuest = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide email and password' });
    }

    const guest = await Guest.findOne({ email: email.toLowerCase().trim() }).select('+password');
    if (!guest || !guest.password) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    // Verify password
    const [salt, hash] = guest.password.split(':');
    const checkHash    = crypto
      .pbkdf2Sync(password, salt, 1000, 64, 'sha512')
      .toString('hex');

    if (checkHash !== hash) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    const token = generateGuestToken(guest._id);

    res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      guest: guestPayload(guest),
    });
  } catch (error) {
    console.error('[loginGuest]', error);
    res.status(500).json({ success: false, message: error.message || 'Login failed' });
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// @desc   Forgot password — generate token & send reset email
// @route  POST /api/guests/forgot-password
// @access Public
// ═══════════════════════════════════════════════════════════════════════════
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, message: 'Please provide your email address' });
    }

    const guest = await Guest.findOne({ email: email.toLowerCase().trim() });

    // Always respond with success to prevent email enumeration
    if (!guest) {
      return res.status(200).json({
        success: true,
        message: 'If an account with that email exists, a reset link has been sent.',
      });
    }

    // Generate reset token
    const resetToken  = crypto.randomBytes(32).toString('hex');
    const tokenExpiry = Date.now() + 60 * 60 * 1000; // 1 hour

    guest.passwordResetToken  = crypto.createHash('sha256').update(resetToken).digest('hex');
    guest.passwordResetExpiry = tokenExpiry;
    await guest.save({ validateBeforeSave: false });

    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/guest/reset-password/${resetToken}`;

    try {
      const transporter = createTransporter();
      await transporter.sendMail({
        from:    `"${process.env.HOTEL_NAME || 'Hotel'}" <${process.env.SMTP_USER}>`,
        to:      guest.email,
        subject: 'Guest Account — Password Reset Request',
        html: `
          <div style="font-family:'Segoe UI',sans-serif;max-width:520px;margin:0 auto;background:#faf8f4;border:1px solid #e3ddd5;overflow:hidden;">
            <div style="background:#1c1a17;padding:2rem 2.5rem;">
              <h1 style="font-family:Georgia,serif;color:#fff;font-size:1.6rem;font-weight:400;margin:0 0 0.4rem;">
                Reset Your Password
              </h1>
              <p style="color:rgba(255,255,255,0.45);font-size:0.8rem;margin:0;">Guest Account Recovery</p>
            </div>
            <div style="padding:2rem 2.5rem;">
              <p style="color:#3a3530;font-size:0.9rem;line-height:1.7;margin:0 0 1.25rem;">
                Hi <strong>${guest.name}</strong>,
              </p>
              <p style="color:#3a3530;font-size:0.9rem;line-height:1.7;margin:0 0 1.5rem;">
                We received a request to reset your guest account password. Click the button below to choose a new password. This link expires in <strong>1 hour</strong>.
              </p>
              <a href="${resetUrl}"
                 style="display:inline-block;padding:0.85rem 2rem;background:#c9a96e;color:#fff;text-decoration:none;font-family:'Segoe UI',sans-serif;font-size:0.8rem;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;">
                Reset Password
              </a>
              <p style="color:#9a9088;font-size:0.75rem;line-height:1.6;margin:1.5rem 0 0;">
                If you didn't request this, you can safely ignore this email. Your password will remain unchanged.
              </p>
              <hr style="border:none;border-top:1px solid #e3ddd5;margin:1.5rem 0;" />
              <p style="color:#b0a898;font-size:0.72rem;">
                Or copy this link: <a href="${resetUrl}" style="color:#c9a96e;">${resetUrl}</a>
              </p>
            </div>
          </div>
        `,
      });
    } catch (mailError) {
      console.error('[forgotPassword] email error:', mailError);
      guest.passwordResetToken  = undefined;
      guest.passwordResetExpiry = undefined;
      await guest.save({ validateBeforeSave: false });
      return res.status(500).json({ success: false, message: 'Could not send reset email. Please try again.' });
    }

    res.status(200).json({
      success: true,
      message: 'If an account with that email exists, a reset link has been sent.',
    });
  } catch (error) {
    console.error('[forgotPassword]', error);
    res.status(500).json({ success: false, message: error.message || 'Request failed' });
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// @desc   Reset password using token from email
// @route  POST /api/guests/reset-password/:token
// @access Public
// ═══════════════════════════════════════════════════════════════════════════
exports.resetPassword = async (req, res) => {
  try {
    const { token }    = req.params;
    const { password } = req.body;

    if (!password || password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
    }

    // Hash the incoming token to compare with stored hash
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const guest = await Guest.findOne({
      passwordResetToken:  hashedToken,
      passwordResetExpiry: { $gt: Date.now() },
    });

    if (!guest) {
      return res.status(400).json({ success: false, message: 'Reset link is invalid or has expired' });
    }

    // Set new password
    const salt           = crypto.randomBytes(16).toString('hex');
    const hashedPassword = crypto
      .pbkdf2Sync(password, salt, 1000, 64, 'sha512')
      .toString('hex');

    guest.password            = `${salt}:${hashedPassword}`;
    guest.passwordResetToken  = undefined;
    guest.passwordResetExpiry = undefined;
    await guest.save();

    const jwtToken = generateGuestToken(guest._id);

    res.status(200).json({
      success: true,
      message: 'Password reset successfully',
      token:   jwtToken,
      guest:   guestPayload(guest),
    });
  } catch (error) {
    console.error('[resetPassword]', error);
    res.status(500).json({ success: false, message: error.message || 'Reset failed' });
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// @desc   Get current guest profile
// @route  GET /api/guests/me
// @access Private (guest token)
// ═══════════════════════════════════════════════════════════════════════════
exports.getGuestMe = async (req, res) => {
  try {
    const guest = await Guest.findById(req.guestId);
    if (!guest) {
      return res.status(404).json({ success: false, message: 'Guest not found' });
    }
    res.status(200).json({ success: true, guest: guestPayload(guest) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// @desc   Update guest profile
// @route  PUT /api/guests/me
// @access Private (guest token)
// ═══════════════════════════════════════════════════════════════════════════
exports.updateGuestProfile = async (req, res) => {
  try {
    const { name, phone, address, city, country, idProof, preferences } = req.body;

    const guest = await Guest.findById(req.guestId);
    if (!guest) {
      return res.status(404).json({ success: false, message: 'Guest not found' });
    }

    if (name)        guest.name        = name.trim();
    if (phone)       guest.phone       = phone.trim();
    if (address)     guest.address     = address;
    if (city)        guest.city        = city;
    if (country)     guest.country     = country;
    if (idProof)     guest.idProof     = idProof;
    if (preferences) guest.preferences = preferences;

    await guest.save();

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      guest: guestPayload(guest),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// @desc   Get guest by ID (admin use)
// @route  GET /api/guests/:id
// @access Private (staff)
// ═══════════════════════════════════════════════════════════════════════════
exports.getGuestById = async (req, res) => {
  try {
    const guest = await Guest.findById(req.params.id);
    if (!guest) {
      return res.status(404).json({ success: false, message: 'Guest not found' });
    }
    res.status(200).json({ success: true, guest: guestPayload(guest) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// @desc   Get all guests (admin use)
// @route  GET /api/guests
// @access Private (staff)
// ═══════════════════════════════════════════════════════════════════════════
exports.getAllGuests = async (req, res) => {
  try {
    const guests = await Guest.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, count: guests.length, data: guests });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};