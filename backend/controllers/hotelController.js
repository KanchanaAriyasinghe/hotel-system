// backend/controllers/hotelController.js

const Hotel = require('../models/Hotel');

// ── Helpers ───────────────────────────────────────────────────────
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

const success = (res, data, status = 200) =>
  res.status(status).json({ success: true, data });

const fail = (res, message, status = 400) =>
  res.status(status).json({ success: false, message });

// ─────────────────────────────────────────────────────────────────
// @desc    Get the hotel record (single-hotel system — returns first)
// @route   GET /api/hotel
// @access  Public
// ─────────────────────────────────────────────────────────────────
const getHotel = asyncHandler(async (req, res) => {
  const hotel = await Hotel.findOne().sort({ createdAt: 1 });

  if (!hotel) {
    return fail(res, 'No hotel record found', 404);
  }

  return success(res, hotel);
});

// ─────────────────────────────────────────────────────────────────
// @desc    Get hotel by ID
// @route   GET /api/hotel/:id
// @access  Public
// ─────────────────────────────────────────────────────────────────
const getHotelById = asyncHandler(async (req, res) => {
  const hotel = await Hotel.findById(req.params.id);

  if (!hotel) {
    return fail(res, 'Hotel not found', 404);
  }

  return success(res, hotel);
});

// ─────────────────────────────────────────────────────────────────
// @desc    Create a new hotel
// @route   POST /api/hotel
// @access  Private (admin)
// ─────────────────────────────────────────────────────────────────
const createHotel = asyncHandler(async (req, res) => {
  const {
    name, description, email, phone, whatsapp,
    address, city, latitude, longitude,
    images, amenities, checkInTime, checkOutTime, currency,
  } = req.body;

  // Validate required
  if (!name || !name.trim()) {
    return fail(res, 'Hotel name is required');
  }

  // Validate latitude / longitude if provided
  if (latitude !== undefined && (isNaN(Number(latitude)) || Number(latitude) < -90 || Number(latitude) > 90)) {
    return fail(res, 'Latitude must be a number between -90 and 90');
  }
  if (longitude !== undefined && (isNaN(Number(longitude)) || Number(longitude) < -180 || Number(longitude) > 180)) {
    return fail(res, 'Longitude must be a number between -180 and 180');
  }

  const sanitizedAmenities = Array.isArray(amenities)
    ? amenities.filter(a => typeof a === 'string')
    : [];

  const hotel = await Hotel.create({
    name:         name.trim(),
    description:  description?.trim(),
    email:        email?.trim().toLowerCase(),
    phone:        phone?.trim(),
    whatsapp:     whatsapp?.trim(),
    address:      address?.trim(),
    city:         city?.trim(),
    latitude:     latitude  !== undefined ? Number(latitude)  : undefined,
    longitude:    longitude !== undefined ? Number(longitude) : undefined,
    images:       Array.isArray(images) ? images.filter(Boolean) : [],
    amenities:    sanitizedAmenities,
    checkInTime:  checkInTime  || '14:00',
    checkOutTime: checkOutTime || '12:00',
    currency:     currency     || 'USD',
  });

  return success(res, hotel, 201);
});

// ─────────────────────────────────────────────────────────────────
// @desc    Update hotel by ID (full or partial)
// @route   PUT /api/hotel/:id
// @access  Private (admin)
// ─────────────────────────────────────────────────────────────────
const updateHotel = asyncHandler(async (req, res) => {
  const hotel = await Hotel.findById(req.params.id);

  if (!hotel) {
    return fail(res, 'Hotel not found', 404);
  }

  const {
    name, description, email, phone, whatsapp,
    address, city, latitude, longitude,
    images, amenities, checkInTime, checkOutTime, currency,
  } = req.body;

  // Validate name if included
  if (name !== undefined && !name.trim()) {
    return fail(res, 'Hotel name cannot be empty');
  }

  // Validate coordinates if included
  if (latitude  !== undefined && latitude  !== '' && (isNaN(Number(latitude))  || Number(latitude)  < -90  || Number(latitude)  > 90)) {
    return fail(res, 'Latitude must be between -90 and 90');
  }
  if (longitude !== undefined && longitude !== '' && (isNaN(Number(longitude)) || Number(longitude) < -180 || Number(longitude) > 180)) {
    return fail(res, 'Longitude must be between -180 and 180');
  }

  // Only update fields that were actually sent
  if (name         !== undefined) hotel.name         = name.trim();
  if (description  !== undefined) hotel.description  = description.trim();
  if (email        !== undefined) hotel.email        = email.trim().toLowerCase();
  if (phone        !== undefined) hotel.phone        = phone.trim();
  if (whatsapp     !== undefined) hotel.whatsapp     = whatsapp.trim();
  if (address      !== undefined) hotel.address      = address.trim();
  if (city         !== undefined) hotel.city         = city.trim();
  if (checkInTime  !== undefined) hotel.checkInTime  = checkInTime;
  if (checkOutTime !== undefined) hotel.checkOutTime = checkOutTime;
  if (currency     !== undefined) hotel.currency     = currency;

  if (latitude !== undefined) {
    hotel.latitude  = latitude  === '' ? undefined : Number(latitude);
  }
  if (longitude !== undefined) {
    hotel.longitude = longitude === '' ? undefined : Number(longitude);
  }
  if (Array.isArray(images)) {
    hotel.images = images.filter(Boolean);
  }
  if (Array.isArray(amenities)) {
    hotel.amenities = amenities.filter(a => typeof a === 'string');
  }

  const updated = await hotel.save();
  return success(res, updated);
});

// ─────────────────────────────────────────────────────────────────
// @desc    Upsert hotel — update if exists, create if not
// @route   PATCH /api/hotel
// @access  Private (admin)
// ─────────────────────────────────────────────────────────────────
const upsertHotel = asyncHandler(async (req, res) => {
  const existing = await Hotel.findOne().sort({ createdAt: 1 });

  if (existing) {
    req.params.id = existing._id.toString();
    return updateHotel(req, res);
  }

  return createHotel(req, res);
});

// ─────────────────────────────────────────────────────────────────
// @desc    Add image URL(s) to hotel
// @route   POST /api/hotel/:id/images
// @access  Private (admin)
// ─────────────────────────────────────────────────────────────────
const addImages = asyncHandler(async (req, res) => {
  const { images } = req.body;

  if (!Array.isArray(images) || images.length === 0) {
    return fail(res, 'Provide an array of image URLs in "images"');
  }

  const hotel = await Hotel.findByIdAndUpdate(
    req.params.id,
    { $addToSet: { images: { $each: images.filter(Boolean) } } },
    { new: true, runValidators: true }
  );

  if (!hotel) return fail(res, 'Hotel not found', 404);
  return success(res, hotel);
});

// ─────────────────────────────────────────────────────────────────
// @desc    Remove a single image URL from hotel
// @route   DELETE /api/hotel/:id/images
// @access  Private (admin)
// ─────────────────────────────────────────────────────────────────
const removeImage = asyncHandler(async (req, res) => {
  const { url } = req.body;

  if (!url) return fail(res, 'Provide the image "url" to remove');

  const hotel = await Hotel.findByIdAndUpdate(
    req.params.id,
    { $pull: { images: url } },
    { new: true }
  );

  if (!hotel) return fail(res, 'Hotel not found', 404);
  return success(res, hotel);
});

// ─────────────────────────────────────────────────────────────────
// @desc    Add amenities to hotel
// @route   POST /api/hotel/:id/amenities
// @access  Private (admin)
// ─────────────────────────────────────────────────────────────────
const addAmenities = asyncHandler(async (req, res) => {
  const { amenities } = req.body;

  if (!Array.isArray(amenities) || amenities.length === 0) {
    return fail(res, 'Provide an array of amenity strings');
  }

  const hotel = await Hotel.findByIdAndUpdate(
    req.params.id,
    { $addToSet: { amenities: { $each: amenities.filter(a => typeof a === 'string') } } },
    { new: true }
  );

  if (!hotel) return fail(res, 'Hotel not found', 404);
  return success(res, hotel);
});

// ─────────────────────────────────────────────────────────────────
// @desc    Remove amenity from hotel
// @route   DELETE /api/hotel/:id/amenities
// @access  Private (admin)
// ─────────────────────────────────────────────────────────────────
const removeAmenity = asyncHandler(async (req, res) => {
  const { amenity } = req.body;

  if (!amenity) return fail(res, 'Provide the "amenity" string to remove');

  const hotel = await Hotel.findByIdAndUpdate(
    req.params.id,
    { $pull: { amenities: amenity } },
    { new: true }
  );

  if (!hotel) return fail(res, 'Hotel not found', 404);
  return success(res, hotel);
});

// ─────────────────────────────────────────────────────────────────
// @desc    Delete hotel
// @route   DELETE /api/hotel/:id
// @access  Private (admin)
// ─────────────────────────────────────────────────────────────────
const deleteHotel = asyncHandler(async (req, res) => {
  const hotel = await Hotel.findById(req.params.id);

  if (!hotel) return fail(res, 'Hotel not found', 404);

  await hotel.deleteOne();
  return success(res, { message: 'Hotel deleted successfully', id: req.params.id });
});

// ─────────────────────────────────────────────────────────────────
// @desc    Get public hotel info (no auth — for landing page etc.)
// @route   GET /api/hotel/public
// @access  Public
// ─────────────────────────────────────────────────────────────────
const getPublicHotel = asyncHandler(async (req, res) => {
  const hotel = await Hotel.findOne()
    .select('-__v')
    .sort({ createdAt: 1 })
    .lean();

  if (!hotel) return fail(res, 'Hotel not found', 404);

  // Include all contact fields (email, phone, whatsapp) — guests need these
  // Only restructure lat/lng into a nested location object for convenience
  const { latitude, longitude, ...rest } = hotel;

  return success(res, {
    ...rest,
    location: latitude && longitude ? { latitude, longitude } : null,
  });
});

// ─────────────────────────────────────────────────────────────────
module.exports = {
  getHotel,
  getHotelById,
  createHotel,
  updateHotel,
  upsertHotel,
  addImages,
  removeImage,
  addAmenities,
  removeAmenity,
  deleteHotel,
  getPublicHotel,
};