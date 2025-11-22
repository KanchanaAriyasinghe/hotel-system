const express = require('express');
const Guest = require('../models/Guest');
const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const guests = await Guest.find();
    res.json(guests);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/', async (req, res) => {
  const guest = new Guest(req.body);
  try {
    await guest.save();
    res.json(guest);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;