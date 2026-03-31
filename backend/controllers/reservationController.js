// backend/controllers/reservationController.js

const Reservation = require('../models/Reservation');
const Room = require('../models/Room');

// @desc      Get all reservations
// @route     GET /api/reservations
// @access    Private
exports.getAllReservations = async (req, res) => {
  try {
    const reservations = await Reservation.find()
      .populate('roomIds', 'roomNumber roomType floor')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: reservations.length,
      data: reservations,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Error fetching reservations',
    });
  }
};

// @desc      Get available rooms
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

    // Find all rooms of the selected type
    const allRooms = await Room.find({
      roomType,
      isActive: true,
    });

    // Find reservations that overlap with the requested dates
    const checkIn = new Date(checkInDate);
    const checkOut = new Date(checkOutDate);

    const bookedRooms = await Reservation.find({
      $or: [
        {
          checkInDate: { $lt: checkOut },
          checkOutDate: { $gt: checkIn },
          status: { $in: ['confirmed', 'checked-in'] },
        },
      ],
    }).select('roomIds');

    // Extract booked room IDs
    const bookedRoomIds = [];
    bookedRooms.forEach(reservation => {
      reservation.roomIds.forEach(roomId => {
        bookedRoomIds.push(roomId.toString());
      });
    });

    // Filter available rooms
    const availableRooms = allRooms.filter(
      room => !bookedRoomIds.includes(room._id.toString())
    );

    res.status(200).json({
      success: true,
      count: availableRooms.length,
      data: availableRooms,
    });
  } catch (error) {
    console.error('Error fetching available rooms:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error fetching available rooms',
    });
  }
};

// @desc      Create reservation
// @route     POST /api/reservations
// @access    Public
exports.createReservation = async (req, res) => {
  try {
    const {
      guestName,
      email,
      phone,
      checkInDate,
      checkOutDate,
      roomIds,
      roomType,
      numberOfGuests,
      numberOfRooms,
      amenities,
      specialRequests,
      totalPrice,
    } = req.body;

    // Validation
    if (!guestName || !email || !phone || !checkInDate || !checkOutDate) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields',
      });
    }

    if (!roomIds || roomIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please select at least one room',
      });
    }

    if (roomIds.length !== numberOfRooms) {
      return res.status(400).json({
        success: false,
        message: 'Number of selected rooms does not match number of rooms',
      });
    }

    // Check if rooms are available
    const checkIn = new Date(checkInDate);
    const checkOut = new Date(checkOutDate);

    const conflictingReservations = await Reservation.find({
      roomIds: { $in: roomIds },
      checkInDate: { $lt: checkOut },
      checkOutDate: { $gt: checkIn },
      status: { $in: ['confirmed', 'checked-in'] },
    });

    if (conflictingReservations.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'One or more selected rooms are not available for the selected dates',
      });
    }

    // Verify rooms exist and are of correct type
    const rooms = await Room.find({ _id: { $in: roomIds } });
    if (rooms.length !== roomIds.length) {
      return res.status(400).json({
        success: false,
        message: 'One or more rooms not found',
      });
    }

    // Create reservation
    const reservation = await Reservation.create({
      guestName,
      email,
      phone,
      checkInDate,
      checkOutDate,
      roomIds,
      roomType,
      numberOfGuests,
      numberOfRooms,
      amenities,
      specialRequests,
      totalPrice,
      status: 'pending',
      paymentStatus: 'pending',
    });

    // Populate room details
    const populatedReservation = await Reservation.findById(reservation._id)
      .populate('roomIds', 'roomNumber roomType floor');

    res.status(201).json({
      success: true,
      message: 'Reservation created successfully',
      data: populatedReservation,
    });
  } catch (error) {
    console.error('Error creating reservation:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error creating reservation',
    });
  }
};

// @desc      Get reservation by ID
// @route     GET /api/reservations/:id
// @access    Private
exports.getReservationById = async (req, res) => {
  try {
    const reservation = await Reservation.findById(req.params.id)
      .populate('roomIds', 'roomNumber roomType floor');

    if (!reservation) {
      return res.status(404).json({
        success: false,
        message: 'Reservation not found',
      });
    }

    res.status(200).json({
      success: true,
      data: reservation,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Error fetching reservation',
    });
  }
};

// @desc      Update reservation
// @route     PUT /api/reservations/:id
// @access    Private/Admin
exports.updateReservation = async (req, res) => {
  try {
    const { status, paymentStatus, specialRequests } = req.body;

    let reservation = await Reservation.findById(req.params.id);
    if (!reservation) {
      return res.status(404).json({
        success: false,
        message: 'Reservation not found',
      });
    }

    // Update fields
    if (status) reservation.status = status;
    if (paymentStatus) reservation.paymentStatus = paymentStatus;
    if (specialRequests) reservation.specialRequests = specialRequests;

    reservation = await reservation.save();

    res.status(200).json({
      success: true,
      message: 'Reservation updated successfully',
      data: reservation,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Error updating reservation',
    });
  }
};

// @desc      Cancel reservation
// @route     DELETE /api/reservations/:id
// @access    Private
exports.cancelReservation = async (req, res) => {
  try {
    const reservation = await Reservation.findById(req.params.id);

    if (!reservation) {
      return res.status(404).json({
        success: false,
        message: 'Reservation not found',
      });
    }

    reservation.status = 'cancelled';
    await reservation.save();

    res.status(200).json({
      success: true,
      message: 'Reservation cancelled successfully',
      data: reservation,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Error cancelling reservation',
    });
  }
};

// @desc      Get reservations by email
// @route     GET /api/reservations/guest/:email
// @access    Public
exports.getReservationsByEmail = async (req, res) => {
  try {
    const reservations = await Reservation.find({ email: req.params.email })
      .populate('roomIds', 'roomNumber roomType floor')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: reservations.length,
      data: reservations,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Error fetching reservations',
    });
  }
};