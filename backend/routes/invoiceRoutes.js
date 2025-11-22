const express = require('express');
const Invoice = require('../models/Invoice');
const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const invoices = await Invoice.find();
    res.json(invoices);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/', async (req, res) => {
  const invoice = new Invoice(req.body);
  try {
    await invoice.save();
    res.json(invoice);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;