// backend/controllers/reservationController.js

const Reservation = require('../models/Reservation');
const Room        = require('../models/Room');
const User        = require('../models/User');
const Hotel       = require('../models/Hotel');
const Amenity     = require('../models/Amenity');
const {
  sendNewReservationEmail,
  sendBookingUpdatedEmail,
  sendCheckInEmail,
  sendCheckOutEmail,
  sendCancellationEmail,
  sendReservationConfirmationToGuest,
  sendBookingConfirmedToGuest,
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

  if ((o.checkInTime || null) !== (u.checkInTime || null)) {
    changes.push({
      label:  'Check-in Time',
      oldVal: o.checkInTime || 'Not specified',
      newVal: u.checkInTime || 'Not specified',
    });
  }

  if (Number(o.totalPrice) !== Number(u.totalPrice)) {
    changes.push({ label: 'Total Price', oldVal: `$${o.totalPrice}`, newVal: `$${u.totalPrice}` });
  }

  return changes;
};

// ── Helper: parse "HH:MM" to total minutes since midnight ─────────────────
const timeToMinutes = (hhmm) => {
  if (!hhmm) return 0;
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};

// ── Helper: validate checkInTime against hotel's policy ───────────────────
const validateCheckInTime = async (checkInTime) => {
  if (!checkInTime) return null;

  const timeRx = /^([01]\d|2[0-3]):[0-5]\d$/;
  if (!timeRx.test(checkInTime)) {
    return 'checkInTime must be in HH:MM format (24-hour clock)';
  }

  const hotel = await Hotel.findOne().sort({ createdAt: 1 }).select('checkInTime');
  if (hotel && hotel.checkInTime) {
    const hotelMins  = timeToMinutes(hotel.checkInTime);
    const guestMins  = timeToMinutes(checkInTime);
    if (guestMins < hotelMins) {
      return `Check-in time cannot be earlier than the hotel's check-in time (${hotel.checkInTime})`;
    }
  }

  return null;
};

// ── Helper: fetch ALL amenities on the booked rooms (free + paid) ─────────
// Returns:
//   freeRoomAmenities  → [{ name, label, price:0, icon }]   (complimentary)
//   paidRoomAmenities  → [{ name, label, price, icon }]      (included but paid)
//   allRoomAmenityNames→ display names of ALL room amenities  (for bill label suffix)
const getRoomAmenitiesInfo = async (roomIds) => {
  try {
    const rooms = await Room.find({ _id: { $in: roomIds } })
      .populate('amenities', 'name label price pricingModel isActive icon');

    const seen             = new Set();
    const freeRoomAmenities = [];
    const paidRoomAmenities = [];

    rooms.forEach(room => {
      (room.amenities || []).forEach(am => {
        if (!am.isActive || seen.has(am._id.toString())) return;
        seen.add(am._id.toString());

        const entry = {
          id:           am._id.toString(),
          name:         am.name,
          label:        am.label || am.name,
          price:        Number(am.price) || 0,
          pricingModel: am.pricingModel || 'flat',
          icon:         am.icon || '',
        };

        if (entry.price === 0) {
          freeRoomAmenities.push(entry);
        } else {
          paidRoomAmenities.push(entry);
        }
      });
    });

    const allRoomAmenityNames = [
      ...freeRoomAmenities.map(a => a.label),
      ...paidRoomAmenities.map(a => a.label),
    ];

    return { freeRoomAmenities, paidRoomAmenities, allRoomAmenityNames };
  } catch (err) {
    console.error('[getRoomAmenitiesInfo] Failed:', err.message);
    return { freeRoomAmenities: [], paidRoomAmenities: [], allRoomAmenityNames: [] };
  }
};

// ── Helper: build all amenity data needed for guest emails ────────────────
// Produces:
//   freeRoomAmenities    → complimentary amenities already in the room (price=0)
//   paidRoomAmenities    → paid amenities already in the room (price>0, included in room rate)
//   optionalBreakdown    → guest-selected optional add-ons { [id]: { name, price, quantity, unit, subtotal } }
//   roomsTotal           → room cost subtotal (totalPrice minus optional add-on costs)
//   allRoomAmenityNames  → all room amenity display names (for bill row label)
const buildEmailAmenityData = async (reservation) => {
  try {
    // ── 1. Fetch room-included amenities from DB ──────────────────────────
    const roomIds = (reservation.roomIds || []).map(r =>
      typeof r === 'object' && r._id ? r._id : r
    );

    const { freeRoomAmenities, paidRoomAmenities, allRoomAmenityNames } =
      roomIds.length > 0
        ? await getRoomAmenitiesInfo(roomIds)
        : { freeRoomAmenities: [], paidRoomAmenities: [], allRoomAmenityNames: [] };

    // ── 2. Build optional add-on breakdown ───────────────────────────────
    const paidAmenityIds = (reservation.paidAmenities || []).map(id => id.toString());
    let optionalBreakdown = {};

    if (paidAmenityIds.length > 0) {
      // Use stored breakdown if available
      const stored = reservation.amenitiesBreakdown;
      if (stored && typeof stored === 'object' && Object.keys(stored).length > 0) {
        optionalBreakdown = stored instanceof Map
          ? Object.fromEntries(stored)
          : stored.toObject
            ? stored.toObject()
            : { ...stored };
      } else {
        // Fallback: rebuild from DB prices + stored amenityHours
        const amenities = await Amenity.find({ _id: { $in: paidAmenityIds } })
          .select('name label price pricingModel');

        const nights = Math.max(0, Math.round(
          (new Date(reservation.checkOutDate) - new Date(reservation.checkInDate)) / 86400000
        ));

        const amenityHoursRaw = reservation.amenityHours || {};
        const amenityHours = amenityHoursRaw instanceof Map
          ? Object.fromEntries(amenityHoursRaw)
          : { ...amenityHoursRaw };

        amenities.forEach(am => {
          const id    = am._id.toString();
          const model = am.pricingModel || 'flat';
          const qty   = model === 'hourly'
            ? (Number(amenityHours[id]) || 0)
            : model === 'daily'
              ? nights
              : 1;
          optionalBreakdown[id] = {
            name:     am.label || am.name,
            price:    am.price,
            quantity: qty,
            unit:     model === 'hourly' ? 'hours' : model === 'daily' ? 'days' : 'flat',
            subtotal: am.price * qty,
          };
        });
      }
    }

    // ── 3. Calculate roomsTotal = totalPrice − optional add-on costs ─────
    const optionalTotal = Object.values(optionalBreakdown)
      .reduce((s, i) => s + (i.subtotal || 0), 0);
    const roomsTotal = Math.max(0, (reservation.totalPrice || 0) - optionalTotal);

    return {
      freeRoomAmenities,
      paidRoomAmenities,
      allRoomAmenityNames,
      optionalBreakdown,
      roomsTotal,
    };
  } catch (err) {
    console.error('[buildEmailAmenityData] Failed:', err.message);
    return {
      freeRoomAmenities:   [],
      paidRoomAmenities:   [],
      allRoomAmenityNames: [],
      optionalBreakdown:   {},
      roomsTotal:          reservation.totalPrice || 0,
    };
  }
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

// @desc      Get available rooms — returns rooms WITH fully populated amenities
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

    const checkIn  = new Date(checkInDate);
    const checkOut = new Date(checkOutDate);

    const allRooms = await Room.find({ roomType, isActive: true })
      .populate('amenities', 'name label icon price description isActive pricingModel');

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

// @desc      Get booking status for a specific room
// @route     GET /api/reservations/room-status/:roomId
// @access    Private
exports.getRoomBookingStatus = async (req, res) => {
  try {
    const { roomId } = req.params;

    const reservation = await Reservation.findOne({
      roomIds: roomId,
      status:  { $in: ['checked-in', 'confirmed', 'pending', 'checked-out', 'cancelled'] },
    })
      .sort({ createdAt: -1 })
      .select('status guestName checkInDate checkOutDate checkInTime confirmationNumber');

    if (!reservation) {
      return res.status(200).json({ success: true, data: { bookingStatus: null } });
    }

    const activeReservation = await Reservation.findOne({
      roomIds: roomId,
      status:  { $in: ['checked-in', 'confirmed', 'pending'] },
    })
      .sort({ createdAt: -1 })
      .select('status guestName checkInDate checkOutDate checkInTime confirmationNumber');

    const result = activeReservation || reservation;

    res.status(200).json({
      success: true,
      data: {
        bookingStatus:      result.status,
        guestName:          result.guestName,
        checkInDate:        result.checkInDate,
        checkOutDate:       result.checkOutDate,
        checkInTime:        result.checkInTime || null,
        confirmationNumber: result.confirmationNumber,
      },
    });
  } catch (error) {
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
      .select('status roomIds guestName checkInDate checkOutDate checkInTime confirmationNumber');

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
            checkInTime:        resv.checkInTime || null,
            confirmationNumber: resv.confirmationNumber,
          };
        }
      });
    });

    roomIds.forEach(id => {
      if (!statusMap[id.toString()]) {
        statusMap[id.toString()] = { bookingStatus: null };
      }
    });

    res.status(200).json({ success: true, data: statusMap });
  } catch (error) {
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
      checkInTime,
      roomIds, roomType,
      numberOfGuests, numberOfRooms,
      freeAmenities, paidAmenities, amenityHours,
      amenitiesBreakdown,
      specialRequests, stayType,
      totalPrice,
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

    const timeErr = await validateCheckInTime(checkInTime);
    if (timeErr) {
      return res.status(400).json({ success: false, message: timeErr });
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
      checkInTime:        checkInTime  || null,
      roomIds, roomType,
      numberOfGuests, numberOfRooms,
      freeAmenities:      freeAmenities  || [],
      paidAmenities:      paidAmenities  || [],
      amenityHours:       amenityHours   || {},
      amenitiesBreakdown: amenitiesBreakdown || {},
      specialRequests,
      stayType:      stayType   || 'overnight',
      totalPrice:    totalPrice || 0,
      status:        'pending',
      paymentStatus: 'pending',
    });

    const populated = await Reservation.findById(reservation._id)
      .populate('roomIds', 'roomNumber roomType floor');

    const roomNumbers = populated.roomIds.map(r => `#${r.roomNumber}`).join(', ');

    // ── Fetch room amenity data (free + paid room amenities + optional add-ons) ─
    const {
      freeRoomAmenities,
      paidRoomAmenities,
      allRoomAmenityNames,
      optionalBreakdown,
      roomsTotal,
    } = await buildEmailAmenityData(reservation);

    // ── Email admins ──────────────────────────────────────────────────────────
    const adminEmails = await getAdminEmailsForPref('newReservation');
    if (adminEmails.length > 0) {
      sendNewReservationEmail({
        adminEmails, guestName, email, phone, roomType, roomNumbers,
        checkInDate, checkOutDate,
        checkInTime:        checkInTime || null,
        stayType:           stayType || 'overnight',
        totalPrice:         totalPrice || 0,
        amenitiesBreakdown: amenitiesBreakdown || {},
      }).catch(err => console.error('[createReservation] admin email failed:', err.message));
    }

    // ── Email guest with full amenity details ────────────────────────────────
    sendReservationConfirmationToGuest({
      guestName,
      guestEmail:          email,
      confirmationNumber:  populated.confirmationNumber,
      roomType, roomNumbers, checkInDate, checkOutDate,
      checkInTime:         checkInTime || null,
      numberOfGuests, numberOfRooms,
      stayType:            stayType || 'overnight',
      totalPrice:          totalPrice || 0,
      roomsTotal,
      specialRequests:     specialRequests || '',
      // Room-included amenities (split into free + paid)
      freeRoomAmenities,
      paidRoomAmenities,
      allRoomAmenityNames,
      // Guest-selected optional add-ons
      optionalBreakdown,
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
      checkInTime,
      numberOfGuests, specialRequests,
      roomType, roomIds, numberOfRooms,
      totalPrice,
      paidAmenities,
      amenityHours,
    } = req.body;

    let reservation = await Reservation.findById(req.params.id)
      .populate('roomIds', 'roomNumber roomType floor');

    if (!reservation) {
      return res.status(404).json({ success: false, message: 'Reservation not found' });
    }

    const oldStatus = reservation.status;

    const oldRoomNumbers = reservation.roomIds?.map(r => `#${r.roomNumber}`).join(', ') || '—';
    const snapshot = {
      roomType:       reservation.roomType,
      numberOfGuests: reservation.numberOfGuests,
      checkInDate:    new Date(reservation.checkInDate),
      checkOutDate:   new Date(reservation.checkOutDate),
      checkInTime:    reservation.checkInTime || null,
      totalPrice:     reservation.totalPrice,
    };

    if (checkInTime !== undefined) {
      const timeErr = await validateCheckInTime(checkInTime);
      if (timeErr) {
        return res.status(400).json({ success: false, message: timeErr });
      }
    }

    if (status          !== undefined) reservation.status          = status;
    if (paymentStatus   !== undefined) reservation.paymentStatus   = paymentStatus;
    if (guestName       !== undefined) reservation.guestName       = guestName.trim();
    if (email           !== undefined) reservation.email           = email.trim();
    if (phone           !== undefined) reservation.phone           = phone.trim();
    if (numberOfGuests  !== undefined) reservation.numberOfGuests  = Number(numberOfGuests);
    if (specialRequests !== undefined) reservation.specialRequests = specialRequests;
    if (totalPrice      !== undefined) reservation.totalPrice      = Number(totalPrice);
    if (roomType        !== undefined) reservation.roomType        = roomType;
    if (checkInTime !== undefined) reservation.checkInTime = checkInTime || null;

    if (paidAmenities !== undefined && Array.isArray(paidAmenities)) {
      reservation.paidAmenities = paidAmenities;
    }
    if (amenityHours !== undefined && typeof amenityHours === 'object') {
      reservation.amenityHours = new Map(Object.entries(amenityHours));
    }

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

    // ── Build full amenity data for all guest emails ─────────────────────────
    const emailData = await buildEmailAmenityData(reservation);

    // ── STATUS: confirmed ────────────────────────────────────────────────────
    if (status === 'confirmed' && oldStatus !== 'confirmed') {
      sendBookingConfirmedToGuest({
        guestName:           reservation.guestName,
        guestEmail:          reservation.email,
        confirmationNumber:  reservation.confirmationNumber,
        roomType:            reservation.roomType,
        roomNumbers:         newRoomNumbers,
        checkInDate:         reservation.checkInDate,
        checkOutDate:        reservation.checkOutDate,
        checkInTime:         reservation.checkInTime || null,
        numberOfGuests:      reservation.numberOfGuests,
        numberOfRooms:       reservation.numberOfRooms,
        stayType:            reservation.stayType || 'overnight',
        totalPrice:          reservation.totalPrice,
        roomsTotal:          emailData.roomsTotal,
        freeRoomAmenities:   emailData.freeRoomAmenities,
        paidRoomAmenities:   emailData.paidRoomAmenities,
        allRoomAmenityNames: emailData.allRoomAmenityNames,
        optionalBreakdown:   emailData.optionalBreakdown,
      }).catch(err => console.error('[confirm] guest confirmed email failed:', err.message));

      return res.status(200).json({
        success: true,
        message: 'Reservation confirmed successfully',
        data:    reservation,
      });
    }

    // ── STATUS: checked-in ───────────────────────────────────────────────────
    if (status === 'checked-in' && oldStatus !== 'checked-in') {
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
          checkInTime:  reservation.checkInTime || null,
          checkOutDate: reservation.checkOutDate,
          checkedInBy:  actorName,
        }).catch(err => console.error('[checkIn] admin email failed:', err.message));
      }

      sendCheckInConfirmationToGuest({
        guestName:           reservation.guestName,
        guestEmail:          reservation.email,
        confirmationNumber:  reservation.confirmationNumber,
        roomNumbers:         newRoomNumbers,
        roomType:            reservation.roomType,
        checkInDate:         reservation.checkInDate,
        checkInTime:         reservation.checkInTime || null,
        checkOutDate:        reservation.checkOutDate,
        numberOfGuests:      reservation.numberOfGuests,
        totalPrice:          reservation.totalPrice,
        roomsTotal:          emailData.roomsTotal,
        freeRoomAmenities:   emailData.freeRoomAmenities,
        paidRoomAmenities:   emailData.paidRoomAmenities,
        allRoomAmenityNames: emailData.allRoomAmenityNames,
        optionalBreakdown:   emailData.optionalBreakdown,
      }).catch(err => console.error('[checkIn] guest email failed:', err.message));

      return res.status(200).json({
        success: true,
        message: 'Reservation updated successfully',
        data:    reservation,
      });
    }

    // ── STATUS: checked-out ──────────────────────────────────────────────────
    if (status === 'checked-out' && oldStatus !== 'checked-out') {
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
        guestName:           reservation.guestName,
        guestEmail:          reservation.email,
        confirmationNumber:  reservation.confirmationNumber,
        roomNumbers:         newRoomNumbers,
        roomType:            reservation.roomType,
        checkInDate:         reservation.checkInDate,
        checkOutDate:        reservation.checkOutDate,
        totalPrice:          reservation.totalPrice,
        roomsTotal:          emailData.roomsTotal,
        freeRoomAmenities:   emailData.freeRoomAmenities,
        paidRoomAmenities:   emailData.paidRoomAmenities,
        allRoomAmenityNames: emailData.allRoomAmenityNames,
        optionalBreakdown:   emailData.optionalBreakdown,
      }).catch(err => console.error('[checkOut] guest email failed:', err.message));

      return res.status(200).json({
        success: true,
        message: 'Reservation updated successfully',
        data:    reservation,
      });
    }

    // ── General field-change emails ──────────────────────────────────────────
    const isStatusOnlyChange = status !== undefined &&
      !roomIds && !roomType && !numberOfGuests &&
      !checkInDate && !checkOutDate && !totalPrice && checkInTime === undefined &&
      paidAmenities === undefined && amenityHours === undefined;

    if (!isStatusOnlyChange) {
      const changes = detectBookingChanges({
        old:            snapshot,
        updated:        reservation,
        oldRoomNumbers,
        newRoomNumbers,
      });

      if (changes.length > 0) {
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

        sendBookingUpdateToGuest({
          guestName:           reservation.guestName,
          guestEmail:          reservation.email,
          confirmationNumber:  reservation.confirmationNumber,
          roomNumbers:         newRoomNumbers,
          checkInDate:         reservation.checkInDate,
          checkOutDate:        reservation.checkOutDate,
          numberOfGuests:      reservation.numberOfGuests,
          totalPrice:          reservation.totalPrice,
          changes,
          roomsTotal:          emailData.roomsTotal,
          freeRoomAmenities:   emailData.freeRoomAmenities,
          paidRoomAmenities:   emailData.paidRoomAmenities,
          allRoomAmenityNames: emailData.allRoomAmenityNames,
          optionalBreakdown:   emailData.optionalBreakdown,
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

    if (reservation.status === 'cancelled') {
      await Reservation.findByIdAndDelete(req.params.id);
      return res.status(200).json({
        success: true,
        message: 'Reservation permanently deleted',
        data:    reservation,
      });
    }

    if (reservation.status === 'checked-in') {
      await Room.updateMany(
        { _id: { $in: reservation.roomIds.map(r => r._id) } },
        { $set: { status: 'available' } }
      );
    }

    // Capture amenity data BEFORE marking cancelled
    const emailData = await buildEmailAmenityData(reservation);

    reservation.status = 'cancelled';
    await reservation.save();

    const roomNumbers = reservation.roomIds?.map(r => `#${r.roomNumber}`).join(', ') || '—';
    const reason      = req.body?.reason || null;

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

    sendCancellationNotificationToGuest({
      guestName:           reservation.guestName,
      guestEmail:          reservation.email,
      confirmationNumber:  reservation.confirmationNumber,
      roomNumbers,
      checkInDate:         reservation.checkInDate,
      checkOutDate:        reservation.checkOutDate,
      reason,
      totalPrice:          reservation.totalPrice,
      roomsTotal:          emailData.roomsTotal,
      freeRoomAmenities:   emailData.freeRoomAmenities,
      paidRoomAmenities:   emailData.paidRoomAmenities,
      allRoomAmenityNames: emailData.allRoomAmenityNames,
      optionalBreakdown:   emailData.optionalBreakdown,
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