// backend/controllers/roomController.js

const Room        = require('../models/Room');
const User        = require('../models/User');
const Amenity     = require('../models/Amenity');
const Reservation = require('../models/Reservation');
const { sendRoomStatusEmail, sendHousekeeperAssignedEmail } = require('../utils/emailService');

const validRoomTypes = ['single', 'double', 'deluxe', 'suite', 'family'];

// Roles that are allowed to see maintenanceReason
const CAN_SEE_MAINTENANCE_REASON = ['admin', 'housekeeper', 'receptionist'];

// ── Helper: populate amenities + housekeeper ──────────────────────────────────
const populateRoom = q =>
  q
    .populate('assignedHousekeeper', 'fullName email phoneNumber')
    .populate('amenities', 'name label icon price description isActive');

// @desc      Get all rooms (admin sees all; housekeeper sees only assigned)
// @route     GET /api/rooms
// @access    Private
exports.getAllRooms = async (req, res) => {
  try {
    const role   = req.user?.role;
    const filter = {};
    if (role === 'housekeeper') {
      filter.assignedHousekeeper = req.user._id;
    }

    const rooms = await populateRoom(Room.find(filter).sort({ roomNumber: 1 }));

    const data = rooms.map(room => {
      const r = room.toObject();
      if (!CAN_SEE_MAINTENANCE_REASON.includes(role)) delete r.maintenanceReason;
      return r;
    });

    res.status(200).json({ success: true, count: data.length, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message || 'Error fetching rooms' });
  }
};

// @desc      Get ALL rooms in the hotel (no housekeeper filter) — read-only view
// @route     GET /api/rooms/all
// @access    Private (Admin + Housekeeper)
exports.getAllRoomsUnfiltered = async (req, res) => {
  try {
    const rooms = await populateRoom(Room.find({}).sort({ roomNumber: 1 }));
    const role  = req.user?.role;

    const data = rooms.map(room => {
      const r = room.toObject();
      if (!CAN_SEE_MAINTENANCE_REASON.includes(role)) delete r.maintenanceReason;
      return r;
    });

    res.status(200).json({ success: true, count: data.length, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message || 'Error fetching rooms' });
  }
};

// @desc      Get room by ID
// @route     GET /api/rooms/:id
// @access    Private
exports.getRoomById = async (req, res) => {
  try {
    const room = await populateRoom(Room.findById(req.params.id));

    if (!room) {
      return res.status(404).json({ success: false, message: 'Room not found' });
    }

    const role = req.user?.role;
    const r    = room.toObject();
    if (!CAN_SEE_MAINTENANCE_REASON.includes(role)) delete r.maintenanceReason;

    res.status(200).json({ success: true, data: r });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message || 'Error fetching room' });
  }
};

// @desc      Create new room
// @route     POST /api/rooms
// @access    Private/Admin
exports.createRoom = async (req, res) => {
  try {
    const {
      roomNumber, roomType, floor, capacity, pricePerNight,
      description, amenities, status, isActive, assignedHousekeeper,
      images,
    } = req.body;

    if (!roomNumber || !roomType || floor === undefined || !capacity || !pricePerNight) {
      return res.status(400).json({ success: false, message: 'Please provide all required fields' });
    }

    if (!validRoomTypes.includes(roomType)) {
      return res.status(400).json({
        success: false,
        message: `Room type must be one of: ${validRoomTypes.join(', ')}`,
      });
    }

    const existingRoom = await Room.findOne({ roomNumber });
    if (existingRoom) {
      return res.status(400).json({ success: false, message: 'Room number already exists' });
    }

    if (assignedHousekeeper) {
      const hk = await User.findById(assignedHousekeeper);
      if (!hk || hk.role !== 'housekeeper') {
        return res.status(400).json({
          success: false,
          message: 'assignedHousekeeper must be a valid user with role housekeeper',
        });
      }
    }

    // Validate amenity IDs if provided
    let amenityIds = [];
    if (Array.isArray(amenities) && amenities.length > 0) {
      const found = await Amenity.find({ _id: { $in: amenities }, isActive: true });
      amenityIds  = found.map(a => a._id);
    }

    const room = await Room.create({
      roomNumber,
      roomType,
      floor,
      capacity,
      pricePerNight,
      description,
      amenities:           amenityIds,
      status:              status   || 'available',
      isActive:            isActive !== undefined ? isActive : true,
      assignedHousekeeper: assignedHousekeeper || null,
      images:              Array.isArray(images) ? images.filter(Boolean) : [],
    });

    await populateRoom(room.populate.bind(room));

    // Re-fetch to get populated data
    const populated = await populateRoom(Room.findById(room._id));

    // Email housekeeper if assigned at creation
    if (populated.assignedHousekeeper && populated.assignedHousekeeper.email) {
      sendHousekeeperAssignedEmail({
        toEmail:    populated.assignedHousekeeper.email,
        toName:     populated.assignedHousekeeper.fullName,
        roomNumber: populated.roomNumber,
        roomType:   populated.roomType,
        floor:      populated.floor,
        assignedBy: req.user?.fullName || req.user?.email || 'An administrator',
      }).catch(err => console.error('[createRoom] housekeeper assign email failed:', err.message));
    }

    res.status(201).json({ success: true, message: 'Room created successfully', data: populated });
  } catch (error) {
    console.error('Error creating room:', error);
    res.status(500).json({ success: false, message: error.message || 'Error creating room' });
  }
};

// @desc      Update room
// @route     PUT /api/rooms/:id
// @access    Private — Admin (all fields) | Housekeeper (limited fields for assigned rooms)
exports.updateRoom = async (req, res) => {
  try {
    const role = req.user.role;

    let room = await Room.findById(req.params.id);
    if (!room) {
      return res.status(404).json({ success: false, message: 'Room not found' });
    }

    const oldStatus      = room.status;
    const oldHousekeeper = room.assignedHousekeeper?.toString() || null;

    // ── Housekeeper branch ─────────────────────────────────────────────────────
    if (role === 'housekeeper') {
      if (room.assignedHousekeeper?.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'You are not authorized to edit this room.',
        });
      }

      const { status, amenities, floor, capacity, maintenanceReason } = req.body;

      if (status   !== undefined) room.status   = status;
      if (floor    !== undefined) room.floor    = Number(floor);
      if (capacity !== undefined) room.capacity = Number(capacity);

      if (Array.isArray(amenities)) {
        const found    = await Amenity.find({ _id: { $in: amenities } });
        room.amenities = found.map(a => a._id);
      }

      const effectiveStatus = status || room.status;
      if (effectiveStatus === 'maintenance') {
        if (maintenanceReason !== undefined) room.maintenanceReason = maintenanceReason ?? null;
      } else {
        room.maintenanceReason = null;
      }

      room = await room.save();
      room = await populateRoom(Room.findById(room._id));

      if (
        (oldStatus === 'cleaning' || oldStatus === 'maintenance') &&
        room.status === 'available'
      ) {
        const adminUsers  = await User.find({ role: 'admin', isActive: true }).select('email');
        const adminEmails = adminUsers.map(u => u.email).filter(Boolean);
        await sendRoomStatusEmail({
          adminEmails,
          roomNumber: room.roomNumber,
          roomType:   room.roomType,
          oldStatus,
          newStatus:  room.status,
          updatedBy:  req.user.fullName || req.user.email,
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Room updated successfully',
        data:    room.toObject(),
      });
    }

    // ── Admin branch ───────────────────────────────────────────────────────────
    const {
      roomNumber, roomType, floor, capacity, pricePerNight,
      description, amenities, status, isActive, assignedHousekeeper,
      maintenanceReason, images,
    } = req.body;

    if (roomNumber    !== undefined) room.roomNumber    = roomNumber;
    if (roomType      !== undefined) room.roomType      = roomType;
    if (floor         !== undefined) room.floor         = floor;
    if (capacity      !== undefined) room.capacity      = capacity;
    if (pricePerNight !== undefined) room.pricePerNight = pricePerNight;
    if (description   !== undefined) room.description   = description;
    if (status        !== undefined) room.status        = status;
    if (isActive      !== undefined) room.isActive      = isActive;

    if (images !== undefined) {
      room.images = Array.isArray(images) ? images.filter(Boolean) : [];
    }

    // Validate and update amenity refs
    if (Array.isArray(amenities)) {
      const found    = await Amenity.find({ _id: { $in: amenities } });
      room.amenities = found.map(a => a._id);
    }

    if (assignedHousekeeper !== undefined) {
      if (assignedHousekeeper === null) {
        room.assignedHousekeeper = null;
      } else {
        const hk = await User.findById(assignedHousekeeper);
        if (!hk || hk.role !== 'housekeeper') {
          return res.status(400).json({
            success: false,
            message: 'assignedHousekeeper must be a valid user with role housekeeper',
          });
        }
        room.assignedHousekeeper = assignedHousekeeper;
      }
    }

    const effectiveStatus = status || room.status;
    if (effectiveStatus === 'maintenance') {
      if (maintenanceReason !== undefined) room.maintenanceReason = maintenanceReason;
    } else {
      room.maintenanceReason = null;
    }

    room = await room.save();
    room = await populateRoom(Room.findById(room._id));

    if (
      (oldStatus === 'cleaning' || oldStatus === 'maintenance') &&
      room.status === 'available'
    ) {
      const adminUsers  = await User.find({ role: 'admin', isActive: true }).select('email');
      const adminEmails = adminUsers.map(u => u.email).filter(Boolean);
      await sendRoomStatusEmail({
        adminEmails,
        roomNumber: room.roomNumber,
        roomType:   room.roomType,
        oldStatus,
        newStatus:  room.status,
        updatedBy:  req.user.fullName || req.user.email,
      });
    }

    if (
      assignedHousekeeper &&
      assignedHousekeeper.toString() !== oldHousekeeper
    ) {
      const hk = room.assignedHousekeeper;
      if (hk && hk.email) {
        sendHousekeeperAssignedEmail({
          toEmail:    hk.email,
          toName:     hk.fullName,
          roomNumber: room.roomNumber,
          roomType:   room.roomType,
          floor:      room.floor,
          assignedBy: req.user?.fullName || req.user?.email || 'An administrator',
        }).catch(err => console.error('[updateRoom] housekeeper assign email failed:', err.message));
      }
    }

    res.status(200).json({ success: true, message: 'Room updated successfully', data: room });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message || 'Error updating room' });
  }
};

// @desc      Delete room
// @route     DELETE /api/rooms/:id
// @access    Private/Admin
exports.deleteRoom = async (req, res) => {
  try {
    const room = await Room.findByIdAndDelete(req.params.id);
    if (!room) {
      return res.status(404).json({ success: false, message: 'Room not found' });
    }
    res.status(200).json({ success: true, message: 'Room deleted successfully', data: room });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message || 'Error deleting room' });
  }
};

// @desc      Get available rooms — checks both room status AND reservation conflicts
// @route     GET /api/rooms/available
// @access    Private
exports.getAvailableRooms = async (req, res) => {
  try {
    const { roomType, checkInDate, checkOutDate } = req.query;

    if (!roomType || !checkInDate || !checkOutDate) {
      return res.status(400).json({
        success: false,
        message: 'Room type, check-in date, and check-out date are required',
      });
    }

    const checkIn  = new Date(checkInDate);
    const checkOut = new Date(checkOutDate);

    const allRooms = await populateRoom(
      Room.find({ roomType, isActive: true, status: 'available' })
    );

    const bookedRooms = await Reservation.find({
      checkInDate:  { $lt: checkOut },
      checkOutDate: { $gt: checkIn  },
      status: { $in: ['pending', 'confirmed', 'checked-in'] },
    }).select('roomIds');

    const bookedRoomIds = new Set();
    bookedRooms.forEach(r =>
      r.roomIds.forEach(id => bookedRoomIds.add(id.toString()))
    );

    const available = allRooms.filter(r => !bookedRoomIds.has(r._id.toString()));

    res.status(200).json({ success: true, count: available.length, data: available });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message || 'Error fetching available rooms' });
  }
};

// @desc      Get rooms by type
// @route     GET /api/rooms/type/:roomType
// @access    Private
exports.getRoomsByType = async (req, res) => {
  try {
    const { roomType } = req.params;

    if (!validRoomTypes.includes(roomType)) {
      return res.status(400).json({
        success: false,
        message: `Room type must be one of: ${validRoomTypes.join(', ')}`,
      });
    }

    const rooms = await populateRoom(
      Room.find({ roomType }).sort({ roomNumber: 1 })
    );

    res.status(200).json({ success: true, count: rooms.length, data: rooms });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message || 'Error fetching rooms' });
  }
};