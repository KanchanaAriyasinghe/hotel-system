// backend/server.js

const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
require('dotenv').config();

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
  });

// ========== IMPORT ROUTES ==========
console.log('\n🔧 Loading routes...\n');

let authRoutes, userRoutes, roomRoutes, reservationRoutes, guestRoutes, hotelRoutes, staffRoutes;

try { authRoutes = require('./routes/authRoutes'); console.log('✓ authRoutes loaded'); } 
catch (e) { console.error('✗ authRoutes error:', e.message); }

try { userRoutes = require('./routes/userRoutes'); console.log('✓ userRoutes loaded'); } 
catch (e) { console.error('✗ userRoutes error:', e.message); }

try { roomRoutes = require('./routes/roomRoutes'); console.log('✓ roomRoutes loaded'); } 
catch (e) { console.error('✗ roomRoutes error:', e.message); }

try { reservationRoutes = require('./routes/reservationRoutes'); console.log('✓ reservationRoutes loaded'); } 
catch (e) { console.error('✗ reservationRoutes error:', e.message); }

try { guestRoutes = require('./routes/guestRoutes'); console.log('✓ guestRoutes loaded'); } 
catch (e) { console.error('✗ guestRoutes error:', e.message); }

try { hotelRoutes = require('./routes/hotelRoutes'); console.log('✓ hotelRoutes loaded'); } 
catch (e) { console.error('✗ hotelRoutes error:', e.message); }

try { staffRoutes = require('./routes/staffRoutes'); console.log('✓ staffRoutes loaded'); } 
catch (e) { console.error('✗ staffRoutes error:', e.message); }

console.log('\n🌐 Registering routes...\n');

// ========== REGISTER ROUTES ==========

// Authentication
if (authRoutes) { app.use('/api/auth', authRoutes); console.log('✓ Auth routes registered at /api/auth'); }

// User management
if (userRoutes) { app.use('/api/users', userRoutes); console.log('✓ User routes registered at /api/users'); }

// Staff management
if (staffRoutes) { app.use('/api/staff', staffRoutes); console.log('✓ Staff routes registered at /api/staff'); }

// Room management
if (roomRoutes) { app.use('/api/rooms', roomRoutes); console.log('✓ Room routes registered at /api/rooms'); }

// Reservation management
if (reservationRoutes) { app.use('/api/reservations', reservationRoutes); console.log('✓ Reservation routes registered at /api/reservations'); }

// Hotel info
if (hotelRoutes) { app.use('/api/hotel', hotelRoutes); console.log('✓ Hotel routes registered at /api/hotel'); }

// Guest management
if (guestRoutes) { app.use('/api/guests', guestRoutes); console.log('✓ Guest routes registered at /api/guests'); }

// Health check
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server is running',
    timestamp: new Date(),
    routes: {
      rooms: '/api/rooms',
      auth: '/api/auth',
      users: '/api/users',
      staff: '/api/staff',
      reservations: '/api/reservations',
      hotel: '/api/hotel',
      guests: '/api/guests',
    },
  });
});

// Test endpoint
app.get('/api/test', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server is working!',
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    path: req.originalUrl,
    availableRoutes: {
      rooms: 'POST /api/rooms, GET /api/rooms, GET /api/rooms/available',
      auth: '/api/auth/register, /api/auth/login',
      users: 'POST /api/users, GET /api/users',
      staff: 'POST /api/staff, GET /api/staff',
      health: '/api/health',
      test: '/api/test',
    },
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('❌ Error:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { error: err }),
  });
});

// Start server
const PORT = process.env.PORT || 5000;
const NODE_ENV = process.env.NODE_ENV || 'development';

const server = app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════╗
║   🏨 Hotel Management System Server   ║
╚════════════════════════════════════════╝

✓ Server running on: http://localhost:${PORT}
✓ Environment: ${NODE_ENV}
✓ Database: Connected
✓ Health Check: /api/health
✓ Test Endpoint: /api/test

📝 Available Endpoints:
   - POST   /api/rooms
   - GET    /api/rooms
   - GET    /api/rooms/available
   - POST   /api/auth/register
   - POST   /api/auth/login
   - GET    /api/users
   - POST   /api/users
   - GET    /api/staff
   - POST   /api/staff
   - GET    /api/health
`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, closing server...');
  server.close(() => {
    console.log('Server closed');
    mongoose.connection.close();
  });
});

module.exports = app;