const express = require('express');
const Staff = require('../models/Staff');
const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const staff = await Staff.find();
    res.json(staff);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/', async (req, res) => {
  const staff = new Staff(req.body);
  try {
    await staff.save();
    res.json(staff);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;