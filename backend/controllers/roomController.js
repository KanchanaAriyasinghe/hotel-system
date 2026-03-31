// backend/controllers/roomController.js

const Room = require('../models/Room');

// @desc      Get all rooms
// @route     GET /api/rooms
// @access    Public
exports.getAllRooms = async (req, res) => {
  try {
    const rooms = await Room.find().sort({ roomNumber: 1 });

    res.status(200).json({
      success: true,
      count: rooms.length,
      data: rooms,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Error fetching rooms',
    });
  }
};

// @desc      Get room by ID
// @route     GET /api/rooms/:id
// @access    Public
exports.getRoomById = async (req, res) => {
  try {
    const room = await Room.findById(req.params.id);

    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'Room not found',
      });
    }

    res.status(200).json({
      success: true,
      data: room,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Error fetching room',
    });
  }
};

// @desc      Create new room
// @route     POST /api/rooms
// @access    Public (for testing - can be protected for production)
exports.createRoom = async (req, res) => {
  try {
    const {
      roomNumber,
      roomType,
      floor,
      capacity,
      pricePerNight,
      description,
      amenities,
      status,
      isActive,
    } = req.body;

    // Validation
    if (!roomNumber || !roomType || !floor || !capacity || !pricePerNight) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields',
      });
    }

    // Check if room already exists
    const existingRoom = await Room.findOne({ roomNumber });
    if (existingRoom) {
      return res.status(400).json({
        success: false,
        message: 'Room number already exists',
      });
    }

    // Validate room type
    const validRoomTypes = ['single', 'double', 'deluxe', 'suite', 'family'];
    if (!validRoomTypes.includes(roomType)) {
      return res.status(400).json({
        success: false,
        message: `Room type must be one of: ${validRoomTypes.join(', ')}`,
      });
    }

    // Create room
    const room = await Room.create({
      roomNumber,
      roomType,
      floor,
      capacity,
      pricePerNight,
      description,
      amenities: amenities || [],
      status: status || 'available',
      isActive: isActive !== undefined ? isActive : true,
    });

    res.status(201).json({
      success: true,
      message: 'Room created successfully',
      data: room,
    });
  } catch (error) {
    console.error('Error creating room:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error creating room',
    });
  }
};

// @desc      Update room
// @route     PUT /api/rooms/:id
// @access    Private/Admin
exports.updateRoom = async (req, res) => {
  try {
    const { roomNumber, roomType, floor, capacity, pricePerNight, description, amenities, status, isActive } = req.body;

    let room = await Room.findById(req.params.id);
    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'Room not found',
      });
    }

    // Update fields
    if (roomNumber) room.roomNumber = roomNumber;
    if (roomType) room.roomType = roomType;
    if (floor) room.floor = floor;
    if (capacity) room.capacity = capacity;
    if (pricePerNight) room.pricePerNight = pricePerNight;
    if (description) room.description = description;
    if (amenities) room.amenities = amenities;
    if (status) room.status = status;
    if (isActive !== undefined) room.isActive = isActive;

    room = await room.save();

    res.status(200).json({
      success: true,
      message: 'Room updated successfully',
      data: room,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Error updating room',
    });
  }
};

// @desc      Delete room
// @route     DELETE /api/rooms/:id
// @access    Private/Admin
exports.deleteRoom = async (req, res) => {
  try {
    const room = await Room.findByIdAndDelete(req.params.id);

    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'Room not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Room deleted successfully',
      data: room,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Error deleting room',
    });
  }
};

// @desc      Get available rooms (used in booking)
// @route     GET /api/rooms/available
// @access    Public
exports.getAvailableRooms = async (req, res) => {
  try {
    const { roomType, checkInDate, checkOutDate } = req.query;

    if (!roomType || !checkInDate || !checkOutDate) {
      return res.status(400).json({
        success: false,
        message: 'Room type, check-in date, and check-out date are required',
      });
    }

    // Find all active rooms of the selected type
    const allRooms = await Room.find({
      roomType,
      isActive: true,
      status: 'available',
    });

    res.status(200).json({
      success: true,
      count: allRooms.length,
      data: allRooms,
    });
  } catch (error) {
    console.error('Error fetching available rooms:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error fetching available rooms',
    });
  }
};

// @desc      Get rooms by type
// @route     GET /api/rooms/type/:roomType
// @access    Public
exports.getRoomsByType = async (req, res) => {
  try {
    const { roomType } = req.params;

    const validRoomTypes = ['single', 'double', 'deluxe', 'suite', 'family'];
    if (!validRoomTypes.includes(roomType)) {
      return res.status(400).json({
        success: false,
        message: `Room type must be one of: ${validRoomTypes.join(', ')}`,
      });
    }

    const rooms = await Room.find({ roomType }).sort({ roomNumber: 1 });

    res.status(200).json({
      success: true,
      count: rooms.length,
      data: rooms,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Error fetching rooms',
    });
  }
};