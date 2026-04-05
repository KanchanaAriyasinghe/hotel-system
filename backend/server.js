// backend/server.js

const express  = require('express');
const cors     = require('cors');
const mongoose = require('mongoose');
require('dotenv').config();

// Initialize express
const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors({
  origin:      process.env.REACT_APP_URL || 'http://localhost:3000',
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

let authRoutes, userRoutes, roomRoutes, reservationRoutes,
    guestRoutes, hotelRoutes, staffRoutes;

try { authRoutes        = require('./routes/authRoutes');        console.log('✓ authRoutes loaded');        }
catch (e) { console.error('✗ authRoutes error:', e.message); }

try { userRoutes        = require('./routes/userRoutes');        console.log('✓ userRoutes loaded');        }
catch (e) { console.error('✗ userRoutes error:', e.message); }

try { roomRoutes        = require('./routes/roomRoutes');        console.log('✓ roomRoutes loaded');        }
catch (e) { console.error('✗ roomRoutes error:', e.message); }

try { reservationRoutes = require('./routes/reservationRoutes'); console.log('✓ reservationRoutes loaded'); }
catch (e) { console.error('✗ reservationRoutes error:', e.message); }

try { guestRoutes       = require('./routes/guestRoutes');       console.log('✓ guestRoutes loaded');       }
catch (e) { console.error('✗ guestRoutes error:', e.message); }

try { hotelRoutes       = require('./routes/hotelRoutes');       console.log('✓ hotelRoutes loaded');       }
catch (e) { console.error('✗ hotelRoutes error:', e.message); }

try { staffRoutes       = require('./routes/staffRoutes');       console.log('✓ staffRoutes loaded');       }
catch (e) { console.error('✗ staffRoutes error:', e.message); }

console.log('\n🌐 Registering routes...\n');

// ========== REGISTER ROUTES ==========

if (authRoutes)        { app.use('/api/auth',         authRoutes);        console.log('✓ /api/auth');         }
if (userRoutes)        { app.use('/api/users',         userRoutes);        console.log('✓ /api/users');        }
if (staffRoutes)       { app.use('/api/staff',         staffRoutes);       console.log('✓ /api/staff');        }
if (roomRoutes)        { app.use('/api/rooms',         roomRoutes);        console.log('✓ /api/rooms');        }
if (reservationRoutes) { app.use('/api/reservations',  reservationRoutes); console.log('✓ /api/reservations'); }
if (hotelRoutes)       { app.use('/api/hotel',         hotelRoutes);       console.log('✓ /api/hotel');        }
if (guestRoutes)       { app.use('/api/guests',        guestRoutes);       console.log('✓ /api/guests');       }

// ========== UTILITY ENDPOINTS ==========

// Health check
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success:     true,
    message:     'Server is running',
    timestamp:   new Date(),
    environment: process.env.NODE_ENV || 'development',
    routes: {
      auth:         '/api/auth',
      users:        '/api/users',
      staff:        '/api/staff',
      rooms:        '/api/rooms',
      reservations: '/api/reservations',
      hotel:        '/api/hotel',
      guests:       '/api/guests',
    },
  });
});

// Quick smoke-test
app.get('/api/test', (req, res) => {
  res.status(200).json({ success: true, message: 'Server is working!' });
});

// ========== ERROR HANDLERS ==========

// 404 — unknown route
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    path:    req.originalUrl,
    hint:    'See /api/health for all available routes',
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('❌ Unhandled error:', err);

  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map(e => e.message);
    return res.status(400).json({ success: false, message: messages.join(', ') });
  }

  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    return res.status(400).json({ success: false, message: `Duplicate value for ${field}` });
  }

  if (err.name === 'CastError') {
    return res.status(400).json({ success: false, message: `Invalid ID: ${err.value}` });
  }

  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

// ========== START SERVER ==========
const PORT     = process.env.PORT     || 5000;
const NODE_ENV = process.env.NODE_ENV || 'development';

const server = app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════╗
║   🏨 Hotel Management System Server   ║
╚════════════════════════════════════════╝

✓ Running   →  http://localhost:${PORT}
✓ Env       →  ${NODE_ENV}
✓ Health    →  http://localhost:${PORT}/api/health

📝 Registered Endpoints:
   AUTH          POST   /api/auth/register
                 POST   /api/auth/login

   USERS         GET    /api/users                        ← admin only
                 POST   /api/users                        ← admin only
                 GET    /api/users/:id                    ← admin only
                 PUT    /api/users/:id                    ← admin only
                 DELETE /api/users/:id                    ← admin only
                 GET    /api/users/role/:role             ← admin only
                 PUT    /api/users/:id/password           ← any authenticated user (own account)

   STAFF         GET    /api/staff
                 POST   /api/staff

   ROOMS         GET    /api/rooms                        ← private (housekeeper: assigned only)
                 GET    /api/rooms/all                    ← admin + housekeeper (all rooms, no filter)
                 GET    /api/rooms/available              ← private
                 GET    /api/rooms/type/:roomType         ← private
                 GET    /api/rooms/:id                    ← private
                 POST   /api/rooms                        ← admin only
                 PUT    /api/rooms/:id                    ← admin (all fields) | housekeeper (status + maintenanceReason)
                 DELETE /api/rooms/:id                    ← admin only

   RESERVATIONS  GET    /api/reservations/available       ← public  (room availability check)
                 POST   /api/reservations                 ← public  (guest booking; sends emails to admin + guest)
                 GET    /api/reservations/guest/:email    ← public  (guest self-lookup by email)
                 GET    /api/reservations                 ← admin + receptionist
                 GET    /api/reservations/:id             ← admin + receptionist
                 PUT    /api/reservations/:id             ← admin + receptionist
                                                             check-in  → sends email to admin + guest
                                                             check-out → sends email to admin + guest
                 DELETE /api/reservations/:id             ← admin only (cancels; sends email to admin + guest)

   HOTEL         GET    /api/hotel                        ← public
                 GET    /api/hotel/public                 ← public (landing page)
                 GET    /api/hotel/:id
                 POST   /api/hotel                        ← admin only
                 PUT    /api/hotel/:id                    ← admin only
                 PATCH  /api/hotel                        ← upsert (admin)
                 POST   /api/hotel/:id/images             ← admin only
                 DELETE /api/hotel/:id/images             ← admin only
                 POST   /api/hotel/:id/amenities
                 DELETE /api/hotel/:id/amenities
                 DELETE /api/hotel/:id                    ← admin only

   GUESTS        GET    /api/guests
                 POST   /api/guests
                 GET    /api/guests/:id
                 PUT    /api/guests/:id
                 DELETE /api/guests/:id

📧 Email Notifications:
   New Reservation  → admin (notificationPrefs.newReservation) + guest (confirmation)
   Check-in         → admin (notificationPrefs.checkIn)        + guest (welcome)
   Check-out        → admin (notificationPrefs.checkOut)       + guest (farewell + receipt)
   Cancellation     → admin (notificationPrefs.cancellation)   + guest (cancellation notice)
`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('\n⚠  SIGTERM received — shutting down gracefully…');
  server.close(() => {
    console.log('✓ HTTP server closed');
    mongoose.connection.close(false, () => {
      console.log('✓ MongoDB connection closed');
      process.exit(0);
    });
  });
});

process.on('SIGINT', () => {
  console.log('\n⚠  SIGINT received — shutting down gracefully…');
  server.close(() => {
    mongoose.connection.close(false, () => {
      process.exit(0);
    });
  });
});

module.exports = app;