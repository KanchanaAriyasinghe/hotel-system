// backend/controllers/amenityController.js

const Amenity = require('../models/Amenity');
const Room    = require('../models/Room');
const Hotel   = require('../models/Hotel');

// ── Helper: sync hotel.amenities with all active Amenity names ──────────────
const syncHotelAmenities = async () => {
  try {
    const activeAmenities = await Amenity.find({ isActive: true }).select('name');
    const names = activeAmenities.map(a => a.name);
    await Hotel.updateOne({}, { amenities: names }, { upsert: false });
  } catch (err) {
    console.error('[syncHotelAmenities] Failed:', err.message);
  }
};

// @desc      Get all amenities
// @route     GET /api/amenities
// @access    Public (guests need this for the booking page)
exports.getAllAmenities = async (req, res) => {
  try {
    const { active } = req.query;
    const filter = {};
    if (active === 'true')  filter.isActive = true;
    if (active === 'false') filter.isActive = false;

    const amenities = await Amenity.find(filter).sort({ name: 1 });
    res.status(200).json({ success: true, count: amenities.length, data: amenities });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message || 'Error fetching amenities' });
  }
};

// @desc      Get amenity by ID
// @route     GET /api/amenities/:id
// @access    Public
exports.getAmenityById = async (req, res) => {
  try {
    const amenity = await Amenity.findById(req.params.id);
    if (!amenity) {
      return res.status(404).json({ success: false, message: 'Amenity not found' });
    }
    res.status(200).json({ success: true, data: amenity });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message || 'Error fetching amenity' });
  }
};

// @desc      Create amenity
// @route     POST /api/amenities
// @access    Private/Admin
exports.createAmenity = async (req, res) => {
  try {
    const { name, label, icon, price, pricingModel, description, isActive } = req.body;

    if (!name || !label || price === undefined) {
      return res.status(400).json({
        success: false,
        message: 'name, label, and price are required',
      });
    }

    const existing = await Amenity.findOne({ name: name.trim().toLowerCase() });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Amenity with this name already exists' });
    }

    const willBeActive = isActive !== undefined ? isActive : true;

    const amenity = await Amenity.create({
      name:         name.trim().toLowerCase(),
      label:        label.trim(),
      icon:         icon         || '✦',
      price:        Number(price),
      pricingModel: pricingModel || 'flat',
      description:  description  || '',
      isActive:     willBeActive,
    });

    await syncHotelAmenities();

    res.status(201).json({ success: true, message: 'Amenity created successfully', data: amenity });
  } catch (error) {
    console.error('Error creating amenity:', error);
    res.status(500).json({ success: false, message: error.message || 'Error creating amenity' });
  }
};

// @desc      Update amenity
// @route     PUT /api/amenities/:id
// @access    Private/Admin
exports.updateAmenity = async (req, res) => {
  try {
    const { name, label, icon, price, pricingModel, description, isActive } = req.body;

    const amenity = await Amenity.findById(req.params.id);
    if (!amenity) {
      return res.status(404).json({ success: false, message: 'Amenity not found' });
    }

    let needsHotelSync = false;

    if (name && name.trim().toLowerCase() !== amenity.name) {
      const dup = await Amenity.findOne({ name: name.trim().toLowerCase() });
      if (dup) {
        return res.status(400).json({ success: false, message: 'Amenity with this name already exists' });
      }
      amenity.name = name.trim().toLowerCase();
      needsHotelSync = true;
    }

    if (label        !== undefined) amenity.label        = label.trim();
    if (icon         !== undefined) amenity.icon         = icon;
    if (price        !== undefined) amenity.price        = Number(price);
    if (pricingModel !== undefined) amenity.pricingModel = pricingModel;
    if (description  !== undefined) amenity.description  = description;
    if (isActive     !== undefined) {
      if (amenity.isActive !== isActive) needsHotelSync = true;
      amenity.isActive = isActive;
    }

    await amenity.save();

    if (needsHotelSync) await syncHotelAmenities();

    res.status(200).json({ success: true, message: 'Amenity updated successfully', data: amenity });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message || 'Error updating amenity' });
  }
};

// @desc      Delete amenity
// @route     DELETE /api/amenities/:id
// @access    Private/Admin
exports.deleteAmenity = async (req, res) => {
  try {
    const amenity = await Amenity.findById(req.params.id);
    if (!amenity) {
      return res.status(404).json({ success: false, message: 'Amenity not found' });
    }

    await Room.updateMany(
      { amenities: amenity._id },
      { $pull: { amenities: amenity._id } }
    );

    await amenity.deleteOne();
    await syncHotelAmenities();

    res.status(200).json({ success: true, message: 'Amenity deleted and removed from all rooms' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message || 'Error deleting amenity' });
  }
};

// @desc      Toggle amenity active state
// @route     PATCH /api/amenities/:id/toggle
// @access    Private/Admin
exports.toggleAmenity = async (req, res) => {
  try {
    const amenity = await Amenity.findById(req.params.id);
    if (!amenity) {
      return res.status(404).json({ success: false, message: 'Amenity not found' });
    }

    amenity.isActive = !amenity.isActive;
    await amenity.save();
    await syncHotelAmenities();

    res.status(200).json({
      success: true,
      message: `Amenity ${amenity.isActive ? 'activated' : 'deactivated'} successfully`,
      data: amenity,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message || 'Error toggling amenity' });
  }
};