const Reservation = require('../models/Reservation');
const Room        = require('../models/Room');
const User        = require('../models/User');
const {
  sendNewReservationEmail,
  sendCheckInEmail,
  sendCheckOutEmail,
  sendCancellationEmail,
} = require('../utils/emailService');

// ── Helper: fetch admin emails filtered by notification preference ─────────
const getAdminEmailsForPref = async (prefKey) => {
  const admins = await User.find({
    role:     'admin',
    isActive: true,
    [`notificationPrefs.${prefKey}`]: true,
  }).select('email');
  return admins.map(a => a.email).filter(Boolean);
};

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
      data:  reservations,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message || 'Error fetching reservations' });
  }
};

// @desc      Get available rooms
// @route     GET /api/reservations/available
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

    const allRooms = await Room.find({ roomType, isActive: true });

    const checkIn  = new Date(checkInDate);
    const checkOut = new Date(checkOutDate);

    const bookedRooms = await Reservation.find({
      $or: [{
        checkInDate:  { $lt: checkOut },
        checkOutDate: { $gt: checkIn  },
        status: { $in: ['confirmed', 'checked-in'] },
      }],
    }).select('roomIds');

    const bookedRoomIds = [];
    bookedRooms.forEach(r => r.roomIds.forEach(id => bookedRoomIds.push(id.toString())));

    const availableRooms = allRooms.filter(r => !bookedRoomIds.includes(r._id.toString()));

    res.status(200).json({ success: true, count: availableRooms.length, data: availableRooms });
  } catch (error) {
    console.error('Error fetching available rooms:', error);
    res.status(500).json({ success: false, message: error.message || 'Error fetching available rooms' });
  }
};

// @desc      Create reservation
// @route     POST /api/reservations
// @access    Public
exports.createReservation = async (req, res) => {
  try {
    const {
      guestName, email, phone,
      checkInDate, checkOutDate,
      roomIds, roomType,
      numberOfGuests, numberOfRooms,
      freeAmenities, paidAmenities, amenityHours,
      selectedRestaurant, selectedBar,
      specialRequests, stayType,
      totalPrice, amenitiesBreakdown,
    } = req.body;

    // Validation
    if (!guestName || !email || !phone || !checkInDate || !checkOutDate) {
      return res.status(400).json({ success: false, message: 'Please provide all required fields' });
    }
    if (!roomIds || roomIds.length === 0) {
      return res.status(400).json({ success: false, message: 'Please select at least one room' });
    }
    if (roomIds.length !== numberOfRooms) {
      return res.status(400).json({ success: false, message: 'Number of selected rooms does not match' });
    }

    // Check for conflicts
    const checkIn  = new Date(checkInDate);
    const checkOut = new Date(checkOutDate);

    const conflicts = await Reservation.find({
      roomIds:      { $in: roomIds },
      checkInDate:  { $lt: checkOut },
      checkOutDate: { $gt: checkIn  },
      status: { $in: ['confirmed', 'checked-in'] },
    });

    if (conflicts.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'One or more selected rooms are not available for the selected dates',
      });
    }

    // Verify rooms exist
    const rooms = await Room.find({ _id: { $in: roomIds } });
    if (rooms.length !== roomIds.length) {
      return res.status(400).json({ success: false, message: 'One or more rooms not found' });
    }

    // Create reservation
    const reservation = await Reservation.create({
      guestName, email, phone,
      checkInDate, checkOutDate,
      roomIds, roomType,
      numberOfGuests, numberOfRooms,
      freeAmenities:     freeAmenities     || [],
      paidAmenities:     paidAmenities     || [],
      amenityHours:      amenityHours      || {},
      selectedRestaurant: selectedRestaurant || false,
      selectedBar:        selectedBar        || false,
      specialRequests,
      stayType:      stayType      || 'overnight',
      totalPrice:    totalPrice    || 0,
      status:        'pending',
      paymentStatus: 'pending',
    });

    const populated = await Reservation.findById(reservation._id)
      .populate('roomIds', 'roomNumber roomType floor');

    // ── Email admins who have newReservation enabled ──────────────────────
    const adminEmails = await getAdminEmailsForPref('newReservation');
    if (adminEmails.length > 0) {
      const roomNumbers = populated.roomIds.map(r => `#${r.roomNumber}`).join(', ');
      sendNewReservationEmail({
        adminEmails,
        guestName,
        email,
        phone,
        roomType,
        roomNumbers,
        checkInDate,
        checkOutDate,
        stayType:           stayType || 'overnight',
        totalPrice:         totalPrice || 0,
        amenitiesBreakdown: amenitiesBreakdown || {},
      }).catch(err => console.error('[createReservation] email failed:', err.message));
    }

    res.status(201).json({
      success: true,
      message: 'Reservation created successfully',
      data:    populated,
    });
  } catch (error) {
    console.error('Error creating reservation:', error);
    res.status(500).json({ success: false, message: error.message || 'Error creating reservation' });
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
      return res.status(404).json({ success: false, message: 'Reservation not found' });
    }

    res.status(200).json({ success: true, data: reservation });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message || 'Error fetching reservation' });
  }
};

// @desc      Update reservation
//            Supports:
//              - Status transitions  (status field)
//              - Payment status      (paymentStatus field)
//              - Guest info edits    (guestName, email, phone)
//              - Date edits          (checkInDate, checkOutDate)
//              - Guest count         (numberOfGuests)
//              - Special requests    (specialRequests)
// @route     PUT /api/reservations/:id
// @access    Private
exports.updateReservation = async (req, res) => {
  try {
    const {
      status,
      paymentStatus,
      guestName,
      email,
      phone,
      checkInDate,
      checkOutDate,
      numberOfGuests,
      specialRequests,
    } = req.body;

    let reservation = await Reservation.findById(req.params.id)
      .populate('roomIds', 'roomNumber roomType floor');

    if (!reservation) {
      return res.status(404).json({ success: false, message: 'Reservation not found' });
    }

    const oldStatus = reservation.status;

    // ── Apply all supplied fields ──────────────────────────────────────────
    if (status          !== undefined) reservation.status          = status;
    if (paymentStatus   !== undefined) reservation.paymentStatus   = paymentStatus;
    if (guestName       !== undefined) reservation.guestName       = guestName.trim();
    if (email           !== undefined) reservation.email           = email.trim();
    if (phone           !== undefined) reservation.phone           = phone.trim();
    if (numberOfGuests  !== undefined) reservation.numberOfGuests  = Number(numberOfGuests);
    if (specialRequests !== undefined) reservation.specialRequests = specialRequests;

    // Date changes — validate that check-out is after check-in
    if (checkInDate  !== undefined) reservation.checkInDate  = new Date(checkInDate);
    if (checkOutDate !== undefined) reservation.checkOutDate = new Date(checkOutDate);

    const effectiveCheckIn  = reservation.checkInDate;
    const effectiveCheckOut = reservation.checkOutDate;
    if (effectiveCheckOut <= effectiveCheckIn) {
      return res.status(400).json({
        success: false,
        message: 'Check-out date must be after check-in date',
      });
    }

    reservation = await reservation.save();

    const roomNumbers = reservation.roomIds?.map(r => `#${r.roomNumber}`).join(', ') || '—';
    const actorName   = req.user?.fullName || req.user?.email || 'Staff';

    // ── Check-in email ────────────────────────────────────────────────────
    if (status === 'checked-in' && oldStatus !== 'checked-in') {
      const adminEmails = await getAdminEmailsForPref('checkIn');
      if (adminEmails.length > 0) {
        sendCheckInEmail({
          adminEmails,
          guestName:   reservation.guestName,
          roomNumbers,
          checkInDate:  reservation.checkInDate,
          checkOutDate: reservation.checkOutDate,
          checkedInBy:  actorName,
        }).catch(err => console.error('[checkIn] email failed:', err.message));
      }
    }

    // ── Check-out email ───────────────────────────────────────────────────
    if (status === 'checked-out' && oldStatus !== 'checked-out') {
      const adminEmails = await getAdminEmailsForPref('checkOut');
      if (adminEmails.length > 0) {
        sendCheckOutEmail({
          adminEmails,
          guestName:    reservation.guestName,
          roomNumbers,
          checkOutDate: reservation.checkOutDate,
          checkedOutBy: actorName,
        }).catch(err => console.error('[checkOut] email failed:', err.message));
      }
    }

    res.status(200).json({ success: true, message: 'Reservation updated successfully', data: reservation });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message || 'Error updating reservation' });
  }
};

// @desc      Cancel / delete reservation
// @route     DELETE /api/reservations/:id
// @access    Private
exports.cancelReservation = async (req, res) => {
  try {
    const reservation = await Reservation.findById(req.params.id)
      .populate('roomIds', 'roomNumber roomType floor');

    if (!reservation) {
      return res.status(404).json({ success: false, message: 'Reservation not found' });
    }

    reservation.status = 'cancelled';
    await reservation.save();

    // ── Cancellation email ────────────────────────────────────────────────
    const adminEmails = await getAdminEmailsForPref('cancellation');
    if (adminEmails.length > 0) {
      const roomNumbers = reservation.roomIds?.map(r => `#${r.roomNumber}`).join(', ') || '—';
      sendCancellationEmail({
        adminEmails,
        guestName:   reservation.guestName,
        roomNumbers,
        checkInDate:  reservation.checkInDate,
        checkOutDate: reservation.checkOutDate,
        cancelledBy:  req.user?.fullName || req.user?.email || 'Guest/Staff',
        reason:       req.body?.reason || null,
      }).catch(err => console.error('[cancel] email failed:', err.message));
    }

    res.status(200).json({ success: true, message: 'Reservation cancelled successfully', data: reservation });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message || 'Error cancelling reservation' });
  }
};

// @desc      Get reservations by guest email
// @route     GET /api/reservations/guest/:email
// @access    Public
exports.getReservationsByEmail = async (req, res) => {
  try {
    const reservations = await Reservation.find({ email: req.params.email })
      .populate('roomIds', 'roomNumber roomType floor')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, count: reservations.length, data: reservations });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message || 'Error fetching reservations' });
  }
};