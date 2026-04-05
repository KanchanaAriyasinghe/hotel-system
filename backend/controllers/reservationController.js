const Reservation = require('../models/Reservation');
const Room        = require('../models/Room');
const User        = require('../models/User');
const {
  sendNewReservationEmail,
  sendBookingUpdatedEmail,
  sendCheckInEmail,
  sendCheckOutEmail,
  sendCancellationEmail,
  sendReservationConfirmationToGuest,
  sendBookingUpdateToGuest,
  sendCheckInConfirmationToGuest,
  sendCheckOutFarewellToGuest,
  sendCancellationNotificationToGuest,
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

// ── Helper: format a date value for display in change emails ──────────────
const fmtDateShort = (d) =>
  new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });

// ── Helper: build the `changes` array by comparing old vs. new values ──────
// Tracks: roomNumbers, roomType, numberOfGuests, checkInDate, checkOutDate, totalPrice
// Returns [] when nothing relevant changed — caller should skip emails in that case.
const detectBookingChanges = ({ old: o, updated: u, oldRoomNumbers, newRoomNumbers }) => {
  const changes = [];

  if (oldRoomNumbers !== newRoomNumbers) {
    changes.push({ label: 'Room(s)', oldVal: oldRoomNumbers, newVal: newRoomNumbers });
  }

  if (o.roomType !== u.roomType) {
    const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
    changes.push({ label: 'Room Type', oldVal: cap(o.roomType), newVal: cap(u.roomType) });
  }

  if (Number(o.numberOfGuests) !== Number(u.numberOfGuests)) {
    changes.push({
      label:  'Guests',
      oldVal: `${o.numberOfGuests} guest${o.numberOfGuests !== 1 ? 's' : ''}`,
      newVal: `${u.numberOfGuests} guest${u.numberOfGuests !== 1 ? 's' : ''}`,
    });
  }

  const oldIn  = new Date(o.checkInDate).toDateString();
  const newIn  = new Date(u.checkInDate).toDateString();
  if (oldIn !== newIn) {
    changes.push({ label: 'Check-in', oldVal: fmtDateShort(o.checkInDate), newVal: fmtDateShort(u.checkInDate) });
  }

  const oldOut = new Date(o.checkOutDate).toDateString();
  const newOut = new Date(u.checkOutDate).toDateString();
  if (oldOut !== newOut) {
    changes.push({ label: 'Check-out', oldVal: fmtDateShort(o.checkOutDate), newVal: fmtDateShort(u.checkOutDate) });
  }

  if (Number(o.totalPrice) !== Number(u.totalPrice)) {
    changes.push({ label: 'Total Price', oldVal: `$${o.totalPrice}`, newVal: `$${u.totalPrice}` });
  }

  return changes;
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
      checkInDate:  { $lt: checkOut },
      checkOutDate: { $gt: checkIn  },
      status: { $in: ['pending', 'confirmed', 'checked-in'] },
    }).select('roomIds');

    const bookedRoomIds = new Set();
    bookedRooms.forEach(r =>
      r.roomIds.forEach(id => bookedRoomIds.add(id.toString()))
    );

    const availableRooms = allRooms.filter(
      r => !bookedRoomIds.has(r._id.toString())
    );

    res.status(200).json({
      success: true,
      count: availableRooms.length,
      data:  availableRooms,
    });
  } catch (error) {
    console.error('Error fetching available rooms:', error);
    res.status(500).json({ success: false, message: error.message || 'Error fetching available rooms' });
  }
};

// @desc      Get booking status for a specific room (most recent active/relevant reservation)
// @route     GET /api/reservations/room-status/:roomId
// @access    Private
exports.getRoomBookingStatus = async (req, res) => {
  try {
    const { roomId } = req.params;

    // Priority order: checked-in > confirmed > pending > checked-out > cancelled
    const reservation = await Reservation.findOne({
      roomIds: roomId,
      status:  { $in: ['checked-in', 'confirmed', 'pending', 'checked-out', 'cancelled'] },
    })
      .sort({ createdAt: -1 })
      .select('status guestName checkInDate checkOutDate confirmationNumber');

    if (!reservation) {
      return res.status(200).json({
        success: true,
        data: { bookingStatus: null },
      });
    }

    // Prefer any currently-active reservation over checked-out/cancelled
    const activeReservation = await Reservation.findOne({
      roomIds: roomId,
      status:  { $in: ['checked-in', 'confirmed', 'pending'] },
    })
      .sort({ createdAt: -1 })
      .select('status guestName checkInDate checkOutDate confirmationNumber');

    const result = activeReservation || reservation;

    res.status(200).json({
      success: true,
      data: {
        bookingStatus:      result.status,
        guestName:          result.guestName,
        checkInDate:        result.checkInDate,
        checkOutDate:       result.checkOutDate,
        confirmationNumber: result.confirmationNumber,
      },
    });
  } catch (error) {
    console.error('Error fetching room booking status:', error);
    res.status(500).json({ success: false, message: error.message || 'Error fetching room booking status' });
  }
};

// @desc      Get booking statuses for multiple rooms at once
// @route     POST /api/reservations/room-statuses
// @access    Private
exports.getRoomBookingStatuses = async (req, res) => {
  try {
    const { roomIds } = req.body;

    if (!roomIds || !Array.isArray(roomIds) || roomIds.length === 0) {
      return res.status(400).json({ success: false, message: 'roomIds array is required' });
    }

    const reservations = await Reservation.find({
      roomIds: { $in: roomIds },
      status:  { $in: ['checked-in', 'confirmed', 'pending', 'checked-out', 'cancelled'] },
    })
      .sort({ createdAt: -1 })
      .select('status roomIds guestName checkInDate checkOutDate confirmationNumber');

    // Priority: checked-in > confirmed > pending > checked-out > cancelled
    const PRIORITY = { 'checked-in': 0, confirmed: 1, pending: 2, 'checked-out': 3, cancelled: 4 };

    const statusMap = {};

    reservations.forEach(resv => {
      resv.roomIds.forEach(rid => {
        const key = rid.toString();
        if (!roomIds.map(String).includes(key)) return;

        const existing         = statusMap[key];
        const incomingPriority = PRIORITY[resv.status] ?? 99;
        const existingPriority = existing ? (PRIORITY[existing.bookingStatus] ?? 99) : 99;

        if (!existing || incomingPriority < existingPriority) {
          statusMap[key] = {
            bookingStatus:      resv.status,
            guestName:          resv.guestName,
            checkInDate:        resv.checkInDate,
            checkOutDate:       resv.checkOutDate,
            confirmationNumber: resv.confirmationNumber,
          };
        }
      });
    });

    // Fill in nulls for rooms with no reservations
    roomIds.forEach(id => {
      if (!statusMap[id.toString()]) {
        statusMap[id.toString()] = { bookingStatus: null };
      }
    });

    res.status(200).json({
      success: true,
      data:    statusMap,
    });
  } catch (error) {
    console.error('Error fetching room booking statuses:', error);
    res.status(500).json({ success: false, message: error.message || 'Error fetching room booking statuses' });
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

    if (!guestName || !email || !phone || !checkInDate || !checkOutDate) {
      return res.status(400).json({ success: false, message: 'Please provide all required fields' });
    }
    if (!roomIds || roomIds.length === 0) {
      return res.status(400).json({ success: false, message: 'Please select at least one room' });
    }
    if (roomIds.length !== numberOfRooms) {
      return res.status(400).json({ success: false, message: 'Number of selected rooms does not match' });
    }

    const checkIn  = new Date(checkInDate);
    const checkOut = new Date(checkOutDate);

    const conflicts = await Reservation.find({
      roomIds:      { $in: roomIds },
      checkInDate:  { $lt: checkOut },
      checkOutDate: { $gt: checkIn  },
      status: { $in: ['pending', 'confirmed', 'checked-in'] },
    });

    if (conflicts.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'One or more selected rooms are not available for the selected dates',
      });
    }

    const rooms = await Room.find({ _id: { $in: roomIds } });
    if (rooms.length !== roomIds.length) {
      return res.status(400).json({ success: false, message: 'One or more rooms not found' });
    }

    const reservation = await Reservation.create({
      guestName, email, phone,
      checkInDate, checkOutDate,
      roomIds, roomType,
      numberOfGuests, numberOfRooms,
      freeAmenities:      freeAmenities      || [],
      paidAmenities:      paidAmenities      || [],
      amenityHours:       amenityHours       || {},
      selectedRestaurant: selectedRestaurant || false,
      selectedBar:        selectedBar        || false,
      specialRequests,
      stayType:      stayType   || 'overnight',
      totalPrice:    totalPrice || 0,
      status:        'pending',
      paymentStatus: 'pending',
    });

    const populated = await Reservation.findById(reservation._id)
      .populate('roomIds', 'roomNumber roomType floor');

    const roomNumbers = populated.roomIds.map(r => `#${r.roomNumber}`).join(', ');

    // ── Email admins ───────────────────────────────────────────────────────
    const adminEmails = await getAdminEmailsForPref('newReservation');
    if (adminEmails.length > 0) {
      sendNewReservationEmail({
        adminEmails, guestName, email, phone, roomType, roomNumbers,
        checkInDate, checkOutDate,
        stayType:           stayType || 'overnight',
        totalPrice:         totalPrice || 0,
        amenitiesBreakdown: amenitiesBreakdown || {},
      }).catch(err => console.error('[createReservation] admin email failed:', err.message));
    }

    // ── Email guest — booking confirmation ─────────────────────────────────
    sendReservationConfirmationToGuest({
      guestName,
      guestEmail:         email,
      confirmationNumber: populated.confirmationNumber,
      roomType, roomNumbers, checkInDate, checkOutDate,
      numberOfGuests, numberOfRooms,
      stayType:           stayType || 'overnight',
      totalPrice:         totalPrice || 0,
      amenitiesBreakdown: amenitiesBreakdown || {},
      specialRequests:    specialRequests || '',
    }).catch(err => console.error('[createReservation] guest email failed:', err.message));

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
// @route     PUT /api/reservations/:id
// @access    Private
exports.updateReservation = async (req, res) => {
  try {
    const {
      status, paymentStatus,
      guestName, email, phone,
      checkInDate, checkOutDate,
      numberOfGuests, specialRequests,
      roomType, roomIds, numberOfRooms,
      totalPrice,
    } = req.body;

    let reservation = await Reservation.findById(req.params.id)
      .populate('roomIds', 'roomNumber roomType floor');

    if (!reservation) {
      return res.status(404).json({ success: false, message: 'Reservation not found' });
    }

    const oldStatus = reservation.status;

    // ── Snapshot the BEFORE state for change detection ─────────────────────
    const oldRoomNumbers = reservation.roomIds?.map(r => `#${r.roomNumber}`).join(', ') || '—';
    const snapshot = {
      roomType:       reservation.roomType,
      numberOfGuests: reservation.numberOfGuests,
      checkInDate:    new Date(reservation.checkInDate),
      checkOutDate:   new Date(reservation.checkOutDate),
      totalPrice:     reservation.totalPrice,
    };

    // ── Apply all field updates ────────────────────────────────────────────
    if (status          !== undefined) reservation.status          = status;
    if (paymentStatus   !== undefined) reservation.paymentStatus   = paymentStatus;
    if (guestName       !== undefined) reservation.guestName       = guestName.trim();
    if (email           !== undefined) reservation.email           = email.trim();
    if (phone           !== undefined) reservation.phone           = phone.trim();
    if (numberOfGuests  !== undefined) reservation.numberOfGuests  = Number(numberOfGuests);
    if (specialRequests !== undefined) reservation.specialRequests = specialRequests;
    if (totalPrice      !== undefined) reservation.totalPrice      = Number(totalPrice);
    if (roomType        !== undefined) reservation.roomType        = roomType;

    // ── Room reassignment ──────────────────────────────────────────────────
    if (roomIds !== undefined && Array.isArray(roomIds) && roomIds.length > 0) {
      const rooms = await Room.find({ _id: { $in: roomIds } });
      if (rooms.length !== roomIds.length) {
        return res.status(400).json({ success: false, message: 'One or more rooms not found' });
      }

      const effectiveRoomType = roomType || reservation.roomType;
      const wrongType = rooms.find(r => r.roomType !== effectiveRoomType);
      if (wrongType) {
        return res.status(400).json({
          success: false,
          message: `Room #${wrongType.roomNumber} is not of type "${effectiveRoomType}"`,
        });
      }

      const effectiveCheckIn  = checkInDate  ? new Date(checkInDate)  : reservation.checkInDate;
      const effectiveCheckOut = checkOutDate ? new Date(checkOutDate) : reservation.checkOutDate;

      const conflicts = await Reservation.find({
        _id:          { $ne: reservation._id },
        roomIds:      { $in: roomIds },
        checkInDate:  { $lt: effectiveCheckOut },
        checkOutDate: { $gt: effectiveCheckIn  },
        status:       { $in: ['pending', 'confirmed', 'checked-in'] },
      });

      if (conflicts.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'One or more selected rooms are already booked for these dates',
        });
      }

      reservation.roomIds       = roomIds;
      reservation.numberOfRooms = roomIds.length;
    }

    if (numberOfRooms !== undefined && roomIds === undefined) {
      reservation.numberOfRooms = Number(numberOfRooms);
    }

    if (checkInDate  !== undefined) reservation.checkInDate  = new Date(checkInDate);
    if (checkOutDate !== undefined) reservation.checkOutDate = new Date(checkOutDate);

    if (reservation.checkOutDate <= reservation.checkInDate) {
      return res.status(400).json({
        success: false,
        message: 'Check-out date must be after check-in date',
      });
    }

    reservation = await reservation.save();
    await reservation.populate('roomIds', 'roomNumber roomType floor');

    const newRoomNumbers = reservation.roomIds?.map(r => `#${r.roomNumber}`).join(', ') || '—';
    const actorName      = req.user?.fullName || req.user?.email || 'Staff';

    // ── Check-in: sync room status → 'occupied' ────────────────────────────
    if (status === 'checked-in' && oldStatus !== 'checked-in') {

      // ✅ Automatically set all rooms in this reservation to 'occupied'
      await Room.updateMany(
        { _id: { $in: reservation.roomIds.map(r => r._id) } },
        { $set: { status: 'occupied' } }
      );

      const adminEmails = await getAdminEmailsForPref('checkIn');
      if (adminEmails.length > 0) {
        sendCheckInEmail({
          adminEmails,
          guestName:    reservation.guestName,
          roomNumbers:  newRoomNumbers,
          checkInDate:  reservation.checkInDate,
          checkOutDate: reservation.checkOutDate,
          checkedInBy:  actorName,
        }).catch(err => console.error('[checkIn] admin email failed:', err.message));
      }

      sendCheckInConfirmationToGuest({
        guestName:          reservation.guestName,
        guestEmail:         reservation.email,
        confirmationNumber: reservation.confirmationNumber,
        roomNumbers:        newRoomNumbers,
        roomType:           reservation.roomType,
        checkInDate:        reservation.checkInDate,
        checkOutDate:       reservation.checkOutDate,
        numberOfGuests:     reservation.numberOfGuests,
      }).catch(err => console.error('[checkIn] guest email failed:', err.message));

      return res.status(200).json({
        success: true,
        message: 'Reservation updated successfully',
        data:    reservation,
      });
    }

    // ── Check-out: sync room status → 'available' ──────────────────────────
    if (status === 'checked-out' && oldStatus !== 'checked-out') {

      // ✅ Automatically set all rooms in this reservation back to 'available'
      await Room.updateMany(
        { _id: { $in: reservation.roomIds.map(r => r._id) } },
        { $set: { status: 'available' } }
      );

      const adminEmails = await getAdminEmailsForPref('checkOut');
      if (adminEmails.length > 0) {
        sendCheckOutEmail({
          adminEmails,
          guestName:    reservation.guestName,
          roomNumbers:  newRoomNumbers,
          checkOutDate: reservation.checkOutDate,
          checkedOutBy: actorName,
        }).catch(err => console.error('[checkOut] admin email failed:', err.message));
      }

      sendCheckOutFarewellToGuest({
        guestName:          reservation.guestName,
        guestEmail:         reservation.email,
        confirmationNumber: reservation.confirmationNumber,
        roomNumbers:        newRoomNumbers,
        checkInDate:        reservation.checkInDate,
        checkOutDate:       reservation.checkOutDate,
        totalPrice:         reservation.totalPrice,
      }).catch(err => console.error('[checkOut] guest email failed:', err.message));

      return res.status(200).json({
        success: true,
        message: 'Reservation updated successfully',
        data:    reservation,
      });
    }

    // ── Booking detail update emails (room, dates, guests, price) ──────────
    // Skip if the only change was a status transition (confirmed, etc.)
    // or if none of the tracked fields actually changed.
    const isStatusOnlyChange = status !== undefined &&
      !roomIds && !roomType && !numberOfGuests &&
      !checkInDate && !checkOutDate && !totalPrice;

    if (!isStatusOnlyChange) {
      const changes = detectBookingChanges({
        old:            snapshot,
        updated:        reservation,
        oldRoomNumbers,
        newRoomNumbers,
      });

      if (changes.length > 0) {
        // Admin
        const adminEmails = await getAdminEmailsForPref('newReservation');
        if (adminEmails.length > 0) {
          sendBookingUpdatedEmail({
            adminEmails,
            guestName:          reservation.guestName,
            confirmationNumber: reservation.confirmationNumber,
            roomNumbers:        newRoomNumbers,
            checkInDate:        reservation.checkInDate,
            checkOutDate:       reservation.checkOutDate,
            changes,
            updatedBy:          actorName,
          }).catch(err => console.error('[updateReservation] admin update email failed:', err.message));
        }

        // Guest
        sendBookingUpdateToGuest({
          guestName:          reservation.guestName,
          guestEmail:         reservation.email,
          confirmationNumber: reservation.confirmationNumber,
          roomNumbers:        newRoomNumbers,
          checkInDate:        reservation.checkInDate,
          checkOutDate:       reservation.checkOutDate,
          numberOfGuests:     reservation.numberOfGuests,
          totalPrice:         reservation.totalPrice,
          changes,
        }).catch(err => console.error('[updateReservation] guest update email failed:', err.message));
      }
    }

    res.status(200).json({
      success: true,
      message: 'Reservation updated successfully',
      data:    reservation,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message || 'Error updating reservation' });
  }
};

// @desc      Cancel / delete reservation
// @route     DELETE /api/reservations/:id
// @access    Private — admin + receptionist
exports.cancelReservation = async (req, res) => {
  try {
    const reservation = await Reservation.findById(req.params.id)
      .populate('roomIds', 'roomNumber roomType floor');

    if (!reservation) {
      return res.status(404).json({ success: false, message: 'Reservation not found' });
    }

    // ── Already cancelled → hard delete from DB, no emails ────────────────
    if (reservation.status === 'cancelled') {
      await Reservation.findByIdAndDelete(req.params.id);
      return res.status(200).json({
        success: true,
        message: 'Reservation permanently deleted',
        data:    reservation,
      });
    }

    // ── If reservation was checked-in, free up the rooms before cancelling ─
    if (reservation.status === 'checked-in') {
      await Room.updateMany(
        { _id: { $in: reservation.roomIds.map(r => r._id) } },
        { $set: { status: 'available' } }
      );
    }

    // ── Active booking → soft cancel + send notification emails ───────────
    reservation.status = 'cancelled';
    await reservation.save();

    const roomNumbers = reservation.roomIds?.map(r => `#${r.roomNumber}`).join(', ') || '—';
    const reason      = req.body?.reason || null;

    // Admin
    const adminEmails = await getAdminEmailsForPref('cancellation');
    if (adminEmails.length > 0) {
      sendCancellationEmail({
        adminEmails,
        guestName:    reservation.guestName,
        roomNumbers,
        checkInDate:  reservation.checkInDate,
        checkOutDate: reservation.checkOutDate,
        cancelledBy:  req.user?.fullName || req.user?.email || 'Guest/Staff',
        reason,
      }).catch(err => console.error('[cancel] admin email failed:', err.message));
    }

    // Guest
    sendCancellationNotificationToGuest({
      guestName:          reservation.guestName,
      guestEmail:         reservation.email,
      confirmationNumber: reservation.confirmationNumber,
      roomNumbers,
      checkInDate:        reservation.checkInDate,
      checkOutDate:       reservation.checkOutDate,
      reason,
    }).catch(err => console.error('[cancel] guest email failed:', err.message));

    res.status(200).json({
      success: true,
      message: 'Reservation cancelled successfully',
      data:    reservation,
    });
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

    res.status(200).json({
      success: true,
      count: reservations.length,
      data:  reservations,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message || 'Error fetching reservations' });
  }
};