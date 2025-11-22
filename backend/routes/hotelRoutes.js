const express = require('express');
const Hotel = require('../models/Hotel');
const router = express.Router();

// Get hotel info
router.get('/info', async (req, res) => {
  try {
    let hotel = await Hotel.findOne();
    if (!hotel) {
      hotel = new Hotel({
        name: 'Luxury Hotel',
        description: 'Experience luxury and comfort at our 5-star hotel',
        email: 'info@luxuryhotel.com',
        phone: '+1 (555) 123-4567',
        whatsapp: '+15551234567',
        address: '123 Main Street',
        city: 'New York',
        latitude: 40.7128,
        longitude: -74.0060,
        images: [],
        amenities: ['WiFi', 'Swimming Pool', 'Spa', 'Restaurant', 'Bar', 'Gym'],
        checkInTime: '14:00',
        checkOutTime: '11:00',
        currency: 'USD'
      });
      await hotel.save();
    }
    res.json(hotel);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Update hotel info
router.put('/info', async (req, res) => {
  try {
    let hotel = await Hotel.findOne();
    if (!hotel) {
      hotel = new Hotel(req.body);
    } else {
      Object.assign(hotel, req.body);
    }
    await hotel.save();
    res.json(hotel);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;