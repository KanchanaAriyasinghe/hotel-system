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
    guestRoutes, hotelRoutes, staffRoutes, amenityRoutes, galleryRoutes;

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

try { amenityRoutes     = require('./routes/amenityRoutes');     console.log('✓ amenityRoutes loaded');     }
catch (e) { console.error('✗ amenityRoutes error:', e.message); }

try { galleryRoutes     = require('./routes/galleryRoutes');     console.log('✓ galleryRoutes loaded');     }
catch (e) { console.error('✗ galleryRoutes error:', e.message); }

console.log('\n🌐 Registering routes...\n');

// ========== REGISTER ROUTES ==========

if (authRoutes)        { app.use('/api/auth',         authRoutes);        console.log('✓ /api/auth');         }
if (userRoutes)        { app.use('/api/users',         userRoutes);        console.log('✓ /api/users');        }
if (staffRoutes)       { app.use('/api/staff',         staffRoutes);       console.log('✓ /api/staff');        }
if (roomRoutes)        { app.use('/api/rooms',         roomRoutes);        console.log('✓ /api/rooms');        }
if (reservationRoutes) { app.use('/api/reservations',  reservationRoutes); console.log('✓ /api/reservations'); }
if (hotelRoutes)       { app.use('/api/hotel',         hotelRoutes);       console.log('✓ /api/hotel');        }
if (guestRoutes)       { app.use('/api/guests',        guestRoutes);       console.log('✓ /api/guests');       }
if (amenityRoutes)     { app.use('/api/amenities',     amenityRoutes);     console.log('✓ /api/amenities');    }
if (galleryRoutes)     { app.use('/api/gallery',       galleryRoutes);     console.log('✓ /api/gallery');      }

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
      amenities:    '/api/amenities',
      gallery:      '/api/gallery',
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

   USERS         GET    /api/users
                 POST   /api/users
                 GET    /api/users/:id
                 PUT    /api/users/:id
                 DELETE /api/users/:id

   ROOMS         GET    /api/rooms
                 GET    /api/rooms/available
                 GET    /api/rooms/:id
                 POST   /api/rooms
                 PUT    /api/rooms/:id
                 DELETE /api/rooms/:id

   AMENITIES     GET    /api/amenities
                 POST   /api/amenities
                 PUT    /api/amenities/:id
                 DELETE /api/amenities/:id
                 PATCH  /api/amenities/:id/toggle

   GALLERY       GET    /api/gallery/public      ← public (no auth)
                 GET    /api/gallery/stats        ← admin only
                 GET    /api/gallery              ← admin only
                 POST   /api/gallery              ← admin only
                 PUT    /api/gallery/:id          ← admin only
                 PATCH  /api/gallery/:id/toggle   ← admin only
                 DELETE /api/gallery/bulk         ← admin only
                 DELETE /api/gallery/:id          ← admin only

   RESERVATIONS  GET    /api/reservations
                 POST   /api/reservations
                 GET    /api/reservations/:id
                 PUT    /api/reservations/:id
                 DELETE /api/reservations/:id

   HOTEL         GET    /api/hotel
                 GET    /api/hotel/public
                 POST   /api/hotel
                 PUT    /api/hotel/:id
                 PATCH  /api/hotel

   GUESTS        GET    /api/guests
                 POST   /api/guests
                 GET    /api/guests/:id
                 PUT    /api/guests/:id
                 DELETE /api/guests/:id
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