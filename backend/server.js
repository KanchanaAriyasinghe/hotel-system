// backend/server.js

const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
require('dotenv').config();

// Import routes
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const guestRoutes = require('./routes/guestRoutes');
const hotelRoutes = require('./routes/hotelRoutes');
const housekeepingRoutes = require('./routes/housekeepingRoutes');
const invoiceRoutes = require('./routes/invoiceRoutes');
const reservationRoutes = require('./routes/reservationRoutes');
const roomRoutes = require('./routes/roomRoutes');
const staffRoutes = require('./routes/staffRoutes');

// Initialize express
const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors({
  origin: process.env.REACT_APP_URL || 'http://localhost:3000',
  credentials: true,
}));

// Database connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/hotel_management')
  .then(() => console.log('✓ MongoDB connected successfully'))
  .catch((err) => {
    console.error('✗ MongoDB connection error:', err.message);
    process.exit(1);
  });

// API Routes
console.log('Registering routes...');

// Authentication routes (must be first)
app.use('/api/auth', authRoutes);
console.log('✓ Auth routes registered');

// User management routes (admin only)
app.use('/api/users', userRoutes);
console.log('✓ User routes registered');

// Hotel routes
app.use('/api/hotel', hotelRoutes);
console.log('✓ Hotel routes registered');

// Guest routes
app.use('/api/guests', guestRoutes);
console.log('✓ Guest routes registered');

// Room routes
app.use('/api/rooms', roomRoutes);
console.log('✓ Room routes registered');

// Reservation routes
app.use('/api/reservations', reservationRoutes);
console.log('✓ Reservation routes registered');

// Invoice routes
app.use('/api/invoices', invoiceRoutes);
console.log('✓ Invoice routes registered');

// Housekeeping routes
app.use('/api/housekeeping', housekeepingRoutes);
console.log('✓ Housekeeping routes registered');

// Staff routes
app.use('/api/staff', staffRoutes);
console.log('✓ Staff routes registered');

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server is running',
    timestamp: new Date(),
  });
});

// 404 handler - must be last
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    path: req.originalUrl,
  });
});

// Global error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { error: err }),
  });
});

// Start server
const PORT = process.env.PORT || 5000;
const NODE_ENV = process.env.NODE_ENV || 'development';

app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════╗
║    Hotel Management System Server    ║
╚══════════════════════════════════════╝

✓ Server running on: http://localhost:${PORT}
✓ Environment: ${NODE_ENV}
✓ Database: Connected
✓ API Documentation: /api/health

Press Ctrl+C to stop the server
  `);
});

module.exports = app;