// backend/middleware/guestAuthMiddleware.js

const jwt   = require('jsonwebtoken');
const Guest = require('../models/Guest');

// ── Protect routes for authenticated guests ────────────────────────────────
exports.protectGuest = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({ success: false, message: 'Not authorized — please log in' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.role !== 'guest') {
      return res.status(403).json({ success: false, message: 'This route is for guests only' });
    }

    const guest = await Guest.findById(decoded.id);
    if (!guest) {
      return res.status(404).json({ success: false, message: 'Guest account not found' });
    }

    req.guestId = guest._id;
    req.guest   = guest;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
};

// ── Optional: attach guest info if token present (no 401 if absent) ────────
exports.optionalGuest = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) return next();

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.role === 'guest') {
      const guest = await Guest.findById(decoded.id);
      if (guest) {
        req.guestId = guest._id;
        req.guest   = guest;
      }
    }
  } catch (_) {
    // silently ignore invalid token
  }

  next();
};