// backend/controllers/roomController.js

const Room        = require('../models/Room');
const User        = require('../models/User');
const Reservation = require('../models/Reservation');
const { sendRoomStatusEmail, sendHousekeeperAssignedEmail } = require('../utils/emailService');

const validRoomTypes = ['single', 'double', 'deluxe', 'suite', 'family'];

// Roles that are allowed to see maintenanceReason
const CAN_SEE_MAINTENANCE_REASON = ['admin', 'housekeeper', 'receptionist'];

// @desc      Get all rooms (admin sees all; housekeeper sees only assigned)
// @route     GET /api/rooms
// @access    Private
exports.getAllRooms = async (req, res) => {
  try {
    const role = req.user?.role;

    const filter = {};
    if (role === 'housekeeper') {
      filter.assignedHousekeeper = req.user._id;
    }

    const rooms = await Room.find(filter)
      .populate('assignedHousekeeper', 'fullName email phoneNumber')
      .sort({ roomNumber: 1 });

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
    const rooms = await Room.find({})
      .populate('assignedHousekeeper', 'fullName email phoneNumber')
      .sort({ roomNumber: 1 });

    const role = req.user?.role;
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
    const room = await Room.findById(req.params.id)
      .populate('assignedHousekeeper', 'fullName email phoneNumber');

    if (!room) {
      return res.status(404).json({ success: false, message: 'Room not found' });
    }

    const role = req.user?.role;
    const r = room.toObject();
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
    } = req.body;

    if (!roomNumber || !roomType || !floor || !capacity || !pricePerNight) {
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

    const room = await Room.create({
      roomNumber, roomType, floor, capacity, pricePerNight,
      description,
      amenities:           amenities || [],
      status:              status    || 'available',
      isActive:            isActive  !== undefined ? isActive : true,
      assignedHousekeeper: assignedHousekeeper || null,
    });

    await room.populate('assignedHousekeeper', 'fullName email phoneNumber');

    // ── Email housekeeper if one was assigned at creation time ────────────
    if (room.assignedHousekeeper && room.assignedHousekeeper.email) {
      sendHousekeeperAssignedEmail({
        toEmail:    room.assignedHousekeeper.email,
        toName:     room.assignedHousekeeper.fullName,
        roomNumber: room.roomNumber,
        roomType:   room.roomType,
        floor:      room.floor,
        assignedBy: req.user?.fullName || req.user?.email || 'An administrator',
      }).catch(err => console.error('[createRoom] housekeeper assign email failed:', err.message));
    }

    res.status(201).json({ success: true, message: 'Room created successfully', data: room });
  } catch (error) {
    console.error('Error creating room:', error);
    res.status(500).json({ success: false, message: error.message || 'Error creating room' });
  }
};

// @desc      Update room
// @route     PUT /api/rooms/:id
// @access    Private — Admin (all fields) | Housekeeper (status, amenities, floor, capacity, maintenanceReason for ASSIGNED rooms only)
exports.updateRoom = async (req, res) => {
  try {
    const role = req.user.role;

    let room = await Room.findById(req.params.id);
    if (!room) {
      return res.status(404).json({ success: false, message: 'Room not found' });
    }

    // ── Capture old values BEFORE any mutations ───────────────────────────
    const oldStatus      = room.status;
    const oldHousekeeper = room.assignedHousekeeper?.toString() || null;

    // ── Housekeeper branch ────────────────────────────────────────────────
    if (role === 'housekeeper') {
      if (room.assignedHousekeeper?.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'You are not authorized to edit this room.',
        });
      }

      const { status, amenities, floor, capacity, maintenanceReason } = req.body;

      if (status    !== undefined) room.status    = status;
      if (amenities !== undefined) room.amenities = amenities;
      if (floor     !== undefined) room.floor     = Number(floor);
      if (capacity  !== undefined) room.capacity  = Number(capacity);

      const effectiveStatus = status || room.status;
      if (effectiveStatus === 'maintenance') {
        if (maintenanceReason !== undefined) room.maintenanceReason = maintenanceReason ?? null;
      } else {
        room.maintenanceReason = null;
      }

      room = await room.save();
      await room.populate('assignedHousekeeper', 'fullName email phoneNumber');

      // ── Email admins if room became available after cleaning/maintenance ─
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

    // ── Admin branch ──────────────────────────────────────────────────────
    const {
      roomNumber, roomType, floor, capacity, pricePerNight,
      description, amenities, status, isActive, assignedHousekeeper, maintenanceReason,
    } = req.body;

    if (roomNumber    !== undefined) room.roomNumber    = roomNumber;
    if (roomType      !== undefined) room.roomType      = roomType;
    if (floor         !== undefined) room.floor         = floor;
    if (capacity      !== undefined) room.capacity      = capacity;
    if (pricePerNight !== undefined) room.pricePerNight = pricePerNight;
    if (description   !== undefined) room.description   = description;
    if (amenities     !== undefined) room.amenities     = amenities;
    if (status        !== undefined) room.status        = status;
    if (isActive      !== undefined) room.isActive      = isActive;

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
    await room.populate('assignedHousekeeper', 'fullName email phoneNumber');

    // ── Email admins if room became available after cleaning/maintenance ───
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

    // ── Email housekeeper if they were newly assigned to this room ─────────
    if (
      assignedHousekeeper &&
      assignedHousekeeper.toString() !== oldHousekeeper
    ) {
      const hk = room.assignedHousekeeper; // already populated above
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

    // Only rooms whose own status is 'available' (not in cleaning/maintenance/occupied)
    const allRooms = await Room.find({
      roomType,
      isActive: true,
      status: 'available',
    }).populate('assignedHousekeeper', 'fullName email phoneNumber');

    // Also exclude rooms that have an overlapping active reservation
    // (pending/confirmed/checked-in) even if the room record itself says 'available'
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

    const rooms = await Room.find({ roomType })
      .populate('assignedHousekeeper', 'fullName email phoneNumber')
      .sort({ roomNumber: 1 });

    res.status(200).json({ success: true, count: rooms.length, data: rooms });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message || 'Error fetching rooms' });
  }
};