// frontend/src/pages/receptionist/ReceptionistRooms.jsx

import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import {
  Search, RefreshCw, CalendarCheck, CheckCircle,
  XCircle, Eye, X, User, Phone, Mail, Hash,
  BedDouble, Layers, DollarSign, Users, Star,
  CalendarDays, CreditCard, ClipboardList, Wrench,
  Loader2,
} from 'lucide-react';
import './ReceptionistRooms.css';

const API = process.env.REACT_APP_API_URL;

const STATUS_META = {
  available:   { label: 'Available',   cls: 'rcr-pill--green'  },
  occupied:    { label: 'Occupied',    cls: 'rcr-pill--blue'   },
  maintenance: { label: 'Maintenance', cls: 'rcr-pill--amber'  },
  cleaning:    { label: 'Cleaning',    cls: 'rcr-pill--purple' },
};

const BOOKING_STATUS_META = {
  pending:       { label: 'Pending',     cls: 'rcr-bpill--yellow' },
  confirmed:     { label: 'Confirmed',   cls: 'rcr-bpill--green'  },
  'checked-in':  { label: 'Checked In',  cls: 'rcr-bpill--blue'   },
  'checked-out': { label: 'Checked Out', cls: 'rcr-bpill--gray'   },
  cancelled:     { label: 'Cancelled',   cls: 'rcr-bpill--red'    },
};

const PAYMENT_STATUS_META = {
  pending:   { label: 'Pending',   cls: 'rcr-bpill--yellow' },
  completed: { label: 'Completed', cls: 'rcr-bpill--green'  },
  failed:    { label: 'Failed',    cls: 'rcr-bpill--red'    },
  refunded:  { label: 'Refunded',  cls: 'rcr-bpill--gray'   },
};

const TYPE_META = {
  single: { label: 'Single', cls: 'rcr-type--single', price: 80  },
  double: { label: 'Double', cls: 'rcr-type--double', price: 120 },
  deluxe: { label: 'Deluxe', cls: 'rcr-type--deluxe', price: 180 },
  suite:  { label: 'Suite',  cls: 'rcr-type--suite',  price: 300 },
  family: { label: 'Family', cls: 'rcr-type--family', price: 220 },
};

const AMENITY_LABELS = {
  wifi: 'WiFi', pool: 'Pool', spa: 'Spa',
  restaurant: 'Restaurant', bar: 'Bar', gym: 'Gym',
  tv: 'TV', ac: 'AC',
};

const NON_AVAILABLE_STATUSES = ['occupied', 'maintenance', 'cleaning'];

const fmt = (dateStr) => {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
};

const fmtDateTime = (dateStr) => {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
};

// ─── Detail Modal ─────────────────────────────────────────────────────────────
const DetailModal = ({ item, mode, onClose }) => {
  const [roomDetail, setRoomDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(true);
  const [fetchError, setFetchError]       = useState(null);

  // Fetch the individual room on mount to get fresh + complete data
  // (including maintenanceReason which the list endpoint also returns for receptionists)
  useEffect(() => {
    if (!item) return;

    const roomId = item._roomId || item._id?.split('__')[1] || item._id;
    if (!roomId) {
      // Fallback — use what we already have
      setRoomDetail(item);
      setLoadingDetail(false);
      return;
    }

    const token = localStorage.getItem('token');
    axios
      .get(`${API}/rooms/${roomId}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(res => {
        const fresh = res.data.data || res.data;
        // Merge reservation-level fields (guestName, checkIn/Out, etc.) onto the fresh room doc
        setRoomDetail({ ...item, ...fresh, _modalMode: item._modalMode });
      })
      .catch(err => {
        console.error('[DetailModal] fetch room failed:', err);
        setFetchError('Could not load full room details.');
        setRoomDetail(item); // fall back to what the list gave us
      })
      .finally(() => setLoadingDetail(false));
  }, [item]);

  if (!item) return null;

  const isBooked    = mode === 'booked';
  const isAvailable = mode === 'available';
  const isUnavail   = mode === 'unavailable';

  const data        = roomDetail || item;
  const roomStatus  = data.roomStatus || data.status;
  const statusMeta  = STATUS_META[roomStatus] || STATUS_META.available;
  const typeMeta    = TYPE_META[data.roomType] || { label: data.roomType, cls: '' };
  const price       = data.pricePerNight || TYPE_META[data.roomType]?.price || 0;

  // Show maintenance reason whenever the room is in maintenance status,
  // regardless of which view tab (booked / available / unavailable) opened the modal.
  const showMaintenanceReason = roomStatus === 'maintenance' && data.maintenanceReason;

  return (
    <div className="rcr-modal-overlay" onClick={onClose}>
      <div className="rcr-modal" onClick={e => e.stopPropagation()}>

        {/* ── Modal header ── */}
        <div className="rcr-modal-header">
          <div className="rcr-modal-title-group">
            <span className="rcr-modal-room-num">Room #{data.roomNumber}</span>
            <span className={`rcr-type-badge ${typeMeta.cls}`}>{typeMeta.label}</span>
            <span className={`rcr-status-pill ${statusMeta.cls}`}>{statusMeta.label}</span>
            {isBooked && (() => {
              const bm = BOOKING_STATUS_META[data.bookingStatus] || { label: data.bookingStatus, cls: 'rcr-bpill--gray' };
              return <span className={`rcr-booking-pill ${bm.cls}`}>{bm.label}</span>;
            })()}
          </div>
          <button className="rcr-modal-close" onClick={onClose}><X size={18}/></button>
        </div>

        {/* ── Loading / error state ── */}
        {loadingDetail ? (
          <div className="rcr-modal-loading">
            <Loader2 size={20} className="rcr-modal-spinner"/>
            <span>Loading room details…</span>
          </div>
        ) : (
          <div className="rcr-modal-body">

            {fetchError && (
              <div className="rcr-modal-fetch-error">{fetchError}</div>
            )}

            {/* ══ SECTION: Room Details (all modes) ══ */}
            <div className="rcr-modal-section">
              <h3 className="rcr-modal-section-title">
                <BedDouble size={14}/> Room Details
              </h3>
              <div className="rcr-modal-grid">
                <div className="rcr-modal-field">
                  <span className="rcr-modal-label">Room Number</span>
                  <span className="rcr-modal-value">#{data.roomNumber}</span>
                </div>
                <div className="rcr-modal-field">
                  <span className="rcr-modal-label">Room Type</span>
                  <span className="rcr-modal-value">
                    <span className={`rcr-type-badge ${typeMeta.cls}`}>{typeMeta.label}</span>
                  </span>
                </div>
                <div className="rcr-modal-field">
                  <span className="rcr-modal-label">Floor</span>
                  <span className="rcr-modal-value">Floor {data.floor}</span>
                </div>
                <div className="rcr-modal-field">
                  <span className="rcr-modal-label">Capacity</span>
                  <span className="rcr-modal-value">{data.capacity || 2} guests</span>
                </div>
                <div className="rcr-modal-field">
                  <span className="rcr-modal-label">Price / Night</span>
                  <span className="rcr-modal-value rcr-modal-price">
                    ${price}<span className="rcr-per-night">/night</span>
                  </span>
                </div>
                <div className="rcr-modal-field">
                  <span className="rcr-modal-label">Room Status</span>
                  <span className="rcr-modal-value">
                    <span className={`rcr-status-pill ${statusMeta.cls}`}>{statusMeta.label}</span>
                  </span>
                </div>
                {data.description && (
                  <div className="rcr-modal-field rcr-modal-field--full">
                    <span className="rcr-modal-label">Description</span>
                    <span className="rcr-modal-value">{data.description}</span>
                  </div>
                )}

                {/* ── Maintenance Reason — shown for ANY mode when room is in maintenance ── */}
                {showMaintenanceReason && (
                  <div className="rcr-modal-field rcr-modal-field--full">
                    <span className="rcr-modal-label">
                      <Wrench size={11} style={{ verticalAlign: 'middle', marginRight: 4 }}/>
                      Maintenance Reason
                    </span>
                    <span className="rcr-modal-value">
                      <span className="rcr-modal-warn-block">{data.maintenanceReason}</span>
                    </span>
                  </div>
                )}

                <div className="rcr-modal-field rcr-modal-field--full">
                  <span className="rcr-modal-label">Amenities</span>
                  <span className="rcr-modal-value">
                    {data.amenities?.length > 0 ? (
                      <div className="rcr-amenity-list">
                        {data.amenities.map(a => (
                          <span key={a} className="rcr-amenity-chip">{AMENITY_LABELS[a] || a}</span>
                        ))}
                      </div>
                    ) : <span className="rcr-td-none">None listed</span>}
                  </span>
                </div>
              </div>
            </div>

            {/* ══ SECTION: Reservation Details (booked mode only) ══ */}
            {isBooked && (
              <div className="rcr-modal-section">
                <h3 className="rcr-modal-section-title">
                  <CalendarDays size={14}/> Reservation Details
                </h3>
                <div className="rcr-modal-grid">
                  {data.confirmationNumber && (
                    <div className="rcr-modal-field">
                      <span className="rcr-modal-label">Confirmation #</span>
                      <span className="rcr-modal-value rcr-modal-conf">{data.confirmationNumber}</span>
                    </div>
                  )}
                  <div className="rcr-modal-field">
                    <span className="rcr-modal-label">Booking Status</span>
                    <span className="rcr-modal-value">
                      {(() => {
                        const bm = BOOKING_STATUS_META[data.bookingStatus] || { label: data.bookingStatus, cls: 'rcr-bpill--gray' };
                        return <span className={`rcr-booking-pill ${bm.cls}`}>{bm.label}</span>;
                      })()}
                    </span>
                  </div>
                  <div className="rcr-modal-field">
                    <span className="rcr-modal-label">Check-In</span>
                    <span className="rcr-modal-value">{fmt(data.checkInDate)}</span>
                  </div>
                  <div className="rcr-modal-field">
                    <span className="rcr-modal-label">Check-Out</span>
                    <span className="rcr-modal-value">{fmt(data.checkOutDate)}</span>
                  </div>
                  {data.numberOfGuests != null && (
                    <div className="rcr-modal-field">
                      <span className="rcr-modal-label">No. of Guests</span>
                      <span className="rcr-modal-value">{data.numberOfGuests}</span>
                    </div>
                  )}
                  {data.numberOfRooms != null && (
                    <div className="rcr-modal-field">
                      <span className="rcr-modal-label">No. of Rooms</span>
                      <span className="rcr-modal-value">{data.numberOfRooms}</span>
                    </div>
                  )}
                  {data.totalPrice != null && (
                    <div className="rcr-modal-field">
                      <span className="rcr-modal-label">Total Price</span>
                      <span className="rcr-modal-value rcr-modal-price">${data.totalPrice}</span>
                    </div>
                  )}
                  {data.paymentStatus && (
                    <div className="rcr-modal-field">
                      <span className="rcr-modal-label">Payment Status</span>
                      <span className="rcr-modal-value">
                        {(() => {
                          const pm = PAYMENT_STATUS_META[data.paymentStatus] || { label: data.paymentStatus, cls: 'rcr-bpill--gray' };
                          return <span className={`rcr-booking-pill ${pm.cls}`}>{pm.label}</span>;
                        })()}
                      </span>
                    </div>
                  )}
                  {data.stayType && (
                    <div className="rcr-modal-field">
                      <span className="rcr-modal-label">Stay Type</span>
                      <span className="rcr-modal-value" style={{ textTransform: 'capitalize' }}>{data.stayType}</span>
                    </div>
                  )}
                  {data.specialRequests && (
                    <div className="rcr-modal-field rcr-modal-field--full">
                      <span className="rcr-modal-label">Special Requests</span>
                      <span className="rcr-modal-value">{data.specialRequests}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ══ SECTION: Guest Details (booked mode only) ══ */}
            {isBooked && (
              <div className="rcr-modal-section">
                <h3 className="rcr-modal-section-title">
                  <User size={14}/> Guest Details
                </h3>
                <div className="rcr-modal-grid">
                  <div className="rcr-modal-field">
                    <span className="rcr-modal-label">Guest Name</span>
                    <span className="rcr-modal-value">{data.guestName || '—'}</span>
                  </div>
                  {data.email && (
                    <div className="rcr-modal-field">
                      <span className="rcr-modal-label">Email</span>
                      <span className="rcr-modal-value">{data.email}</span>
                    </div>
                  )}
                  {data.phone && (
                    <div className="rcr-modal-field">
                      <span className="rcr-modal-label">Phone</span>
                      <span className="rcr-modal-value">{data.phone}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

          </div>
        )}
      </div>
    </div>
  );
};

// ─── Main Component ──────────────────────────────────────────────────────────
const ReceptionistRooms = () => {
  const [rooms, setRooms]               = useState([]);
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading]           = useState(true);
  const [view, setView]                 = useState('booked');
  const [search, setSearch]             = useState('');
  const [filterType, setFilterType]     = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [sortBy, setSortBy]             = useState('roomNumber');
  const [sortDir, setSortDir]           = useState('asc');
  const [selectedItem, setSelectedItem] = useState(null);

  // ── fetch ─────────────────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      const [roomsRes, resRes] = await Promise.all([
        axios.get(`${API}/rooms`, { headers }),
        axios.get(`${API}/reservations`, { headers }),
      ]);

      setRooms(roomsRes.data.data || roomsRes.data || []);
      setReservations(resRes.data.data || resRes.data || []);
    } catch (e) {
      console.error('Failed to fetch data:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Close modal on Escape key
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') setSelectedItem(null); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // ── sorting ───────────────────────────────────────────────────────────────
  const handleSort = (col) => {
    if (sortBy === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortBy(col); setSortDir('asc'); }
  };

  const SortIcon = ({ col }) => {
    if (sortBy !== col) return <span className="rcr-sort-idle">↕</span>;
    return <span className="rcr-sort-active">{sortDir === 'asc' ? '↑' : '↓'}</span>;
  };

  // ── build booked rows ─────────────────────────────────────────────────────
  const bookedRows = (() => {
    const activeStatuses = ['confirmed', 'checked-in', 'pending'];
    const rows = [];

    reservations
      .filter(r => activeStatuses.includes(r.status))
      .forEach(reservation => {
        const roomList = Array.isArray(reservation.roomIds) ? reservation.roomIds : [];

        roomList.forEach(roomRef => {
          const roomId =
            typeof roomRef === 'object' ? roomRef._id?.toString() : roomRef?.toString();
          if (!roomId) return;

          const roomDoc = rooms.find(rm => rm._id?.toString() === roomId);
          if (!roomDoc) return;

          rows.push({
            _id:                `${reservation._id}__${roomId}`,
            _roomId:            roomId,    // ← clean room ID for the /rooms/:id fetch
            // Room schema fields
            roomNumber:         roomDoc.roomNumber,
            roomType:           roomDoc.roomType,
            floor:              roomDoc.floor,
            capacity:           roomDoc.capacity,
            pricePerNight:      roomDoc.pricePerNight,
            amenities:          roomDoc.amenities || [],
            roomStatus:         roomDoc.status,
            description:        roomDoc.description,
            maintenanceReason:  roomDoc.maintenanceReason,
            isActive:           roomDoc.isActive,
            // Reservation schema fields
            bookingStatus:      reservation.status,
            checkInDate:        reservation.checkInDate,
            checkOutDate:       reservation.checkOutDate,
            guestName:          reservation.guestName,
            email:              reservation.email,
            phone:              reservation.phone,
            confirmationNumber: reservation.confirmationNumber,
            numberOfGuests:     reservation.numberOfGuests,
            numberOfRooms:      reservation.numberOfRooms,
            totalPrice:         reservation.totalPrice,
            paymentStatus:      reservation.paymentStatus,
            stayType:           reservation.stayType,
            specialRequests:    reservation.specialRequests,
          });
        });
      });

    return rows;
  })();

  // ── build available rows ──────────────────────────────────────────────────
  const activelyBookedRoomIds = new Set(bookedRows.map(r => r._roomId));

  const availableRows = rooms.filter(r =>
    r.status === 'available' &&
    r.isActive !== false &&
    !activelyBookedRoomIds.has(r._id?.toString())
  );

  // ── build non-available rows ──────────────────────────────────────────────
  const unavailableRows = rooms.filter(r =>
    NON_AVAILABLE_STATUSES.includes(r.status) && r.isActive !== false
  );

  // ── filter + sort ─────────────────────────────────────────────────────────
  const applyFilters = (data) =>
    data
      .filter(r => {
        const matchType   = filterType   === 'all' || r.roomType === filterType;
        const statusVal   = r.roomStatus || r.status;
        const matchStatus = filterStatus === 'all' || statusVal === filterStatus;
        const q = search.toLowerCase();
        const matchSearch = !q ||
          String(r.roomNumber).includes(q) ||
          r.roomType?.toLowerCase().includes(q) ||
          String(r.floor).includes(q) ||
          r.guestName?.toLowerCase().includes(q) ||
          r.confirmationNumber?.toLowerCase().includes(q);
        return matchType && matchStatus && matchSearch;
      })
      .sort((a, b) => {
        let av, bv;
        if      (sortBy === 'roomNumber') { av = a.roomNumber; bv = b.roomNumber; }
        else if (sortBy === 'floor')      { av = a.floor;      bv = b.floor;      }
        else if (sortBy === 'roomType')   { av = a.roomType;   bv = b.roomType;   }
        else if (sortBy === 'status')     { av = a.roomStatus || a.status; bv = b.roomStatus || b.status; }
        else if (sortBy === 'price') {
          av = a.pricePerNight || TYPE_META[a.roomType]?.price || 0;
          bv = b.pricePerNight || TYPE_META[b.roomType]?.price || 0;
        }
        if (av == null) av = ''; if (bv == null) bv = '';
        if (av < bv) return sortDir === 'asc' ? -1 :  1;
        if (av > bv) return sortDir === 'asc' ?  1 : -1;
        return 0;
      });

  const filteredBooked      = applyFilters(bookedRows);
  const filteredAvailable   = applyFilters(availableRows);
  const filteredUnavailable = applyFilters(unavailableRows);

  // ── counts ────────────────────────────────────────────────────────────────
  const counts = {
    total:       rooms.length,
    available:   availableRows.length,
    occupied:    rooms.filter(r => r.status === 'occupied').length,
    booked:      bookedRows.length,
    unavailable: unavailableRows.length,
  };

  // ── column definitions ────────────────────────────────────────────────────
  const BOOKED_COLS = [
    { key: 'roomNumber', label: 'Room'           },
    { key: 'roomType',   label: 'Type'           },
    { key: 'floor',      label: 'Floor'          },
    { key: null,         label: 'Capacity'       },
    { key: 'price',      label: 'Price / Night'  },
    { key: null,         label: 'Amenities'      },
    { key: null,         label: 'Check‑In'       },
    { key: null,         label: 'Check‑Out'      },
    { key: null,         label: 'Guest'          },
    { key: null,         label: 'Booking Status' },
    { key: 'status',     label: 'Room Status'    },
    { key: null,         label: ''               },
  ];

  const AVAILABLE_COLS = [
    { key: 'roomNumber', label: 'Room'          },
    { key: 'roomType',   label: 'Type'          },
    { key: 'floor',      label: 'Floor'         },
    { key: null,         label: 'Capacity'      },
    { key: 'price',      label: 'Price / Night' },
    { key: null,         label: 'Amenities'     },
    { key: 'status',     label: 'Status'        },
    { key: null,         label: ''              },
  ];

  const UNAVAILABLE_COLS = [
    { key: 'roomNumber', label: 'Room'         },
    { key: 'roomType',   label: 'Type'         },
    { key: 'floor',      label: 'Floor'        },
    { key: null,         label: 'Capacity'     },
    { key: 'price',      label: 'Price / Night'},
    { key: null,         label: 'Amenities'    },
    { key: 'status',     label: 'Room Status'  },
    { key: null,         label: ''             },
  ];

  // ── cell renderers ────────────────────────────────────────────────────────
  const renderTypeBadge = (roomType) => {
    const m = TYPE_META[roomType] || { label: roomType, cls: '' };
    return <span className={`rcr-type-badge ${m.cls}`}>{m.label}</span>;
  };

  const renderAmenities = (amenities) =>
    amenities?.length > 0 ? (
      <div className="rcr-amenity-list">
        {amenities.map(a => (
          <span key={a} className="rcr-amenity-chip">{AMENITY_LABELS[a] || a}</span>
        ))}
      </div>
    ) : <span className="rcr-td-none">—</span>;

  const renderPrice = (row) => {
    const price = row.pricePerNight || TYPE_META[row.roomType]?.price || 0;
    return <>${price}<span className="rcr-per-night">/night</span></>;
  };

  const renderStatus = (status) => {
    const m = STATUS_META[status] || STATUS_META.available;
    return <span className={`rcr-status-pill ${m.cls}`}>{m.label}</span>;
  };

  const renderBookingStatus = (status) => {
    const m = BOOKING_STATUS_META[status] || { label: status, cls: 'rcr-bpill--gray' };
    return <span className={`rcr-booking-pill ${m.cls}`}>{m.label}</span>;
  };

  // Maintenance indicator in the table row — small wrench badge if room is in maintenance
  const renderStatusWithMaintenance = (row) => {
    const status = row.roomStatus || row.status;
    const m = STATUS_META[status] || STATUS_META.available;
    return (
      <div className="rcr-status-cell">
        <span className={`rcr-status-pill ${m.cls}`}>{m.label}</span>
        {status === 'maintenance' && (row.maintenanceReason || row.roomStatus === 'maintenance') && (
          <span className="rcr-maint-indicator" title="Has maintenance reason — click View for details">
            <Wrench size={11}/>
          </span>
        )}
      </div>
    );
  };

  const renderViewBtn = (item) => (
    <button className="rcr-view-btn" onClick={() => setSelectedItem(item)} title="View details">
      <Eye size={13}/> View
    </button>
  );

  // ── active dataset ────────────────────────────────────────────────────────
  const activeRows = view === 'booked' ? filteredBooked
    : view === 'available'             ? filteredAvailable
    :                                    filteredUnavailable;

  const totalRows = view === 'booked' ? bookedRows.length
    : view === 'available'            ? availableRows.length
    :                                   unavailableRows.length;

  const activeCols = view === 'booked' ? BOOKED_COLS
    : view === 'available'             ? AVAILABLE_COLS
    :                                    UNAVAILABLE_COLS;

  const emptyMsg = view === 'booked'
    ? 'No booked rooms match your filters.'
    : view === 'available'
      ? 'No available rooms match your filters.'
      : 'No non-available rooms match your filters.';

  const UNAVAIL_STATUS_OPTIONS = ['occupied', 'maintenance', 'cleaning'];

  return (
    <div className="rcr-page">
      {/* ── Header ── */}
      <div className="rcr-page-header">
        <div>
          <h1 className="rcr-title">Room Details</h1>
          <p className="rcr-subtitle">Overview of all hotel rooms and their current status</p>
        </div>
        <button className="rcr-refresh-btn" onClick={fetchData} title="Refresh">
          <RefreshCw size={15}/>
        </button>
      </div>

      {/* ── Summary ── */}
      <div className="rcr-summary-row">
        {[
          { label: 'Total Rooms',     val: counts.total,     cls: 'rcr-sum--total' },
          { label: 'Available',       val: counts.available, cls: 'rcr-sum--avail' },
          { label: 'Occupied',        val: counts.occupied,  cls: 'rcr-sum--occ'   },
          { label: 'Active Bookings', val: counts.booked,    cls: 'rcr-sum--book'  },
        ].map(({ label, val, cls }) => (
          <div key={label} className={`rcr-sum-card ${cls}`}>
            <span className="rcr-sum-val">{val}</span>
            <span className="rcr-sum-lbl">{label}</span>
          </div>
        ))}
      </div>

      {/* ── View Toggle ── */}
      <div className="rcr-view-toggle">
        <button
          className={`rcr-toggle-btn ${view === 'booked' ? 'rcr-toggle-btn--active' : ''}`}
          onClick={() => { setView('booked'); setFilterStatus('all'); setSortBy('roomNumber'); setSearch(''); }}
        >
          <CalendarCheck size={15}/> Booked Rooms
          <span className="rcr-toggle-count">{bookedRows.length}</span>
        </button>
        <button
          className={`rcr-toggle-btn ${view === 'available' ? 'rcr-toggle-btn--active' : ''}`}
          onClick={() => { setView('available'); setFilterStatus('all'); setSortBy('roomNumber'); setSearch(''); }}
        >
          <CheckCircle size={15}/> Available Rooms
          <span className="rcr-toggle-count">{availableRows.length}</span>
        </button>
        <button
          className={`rcr-toggle-btn rcr-toggle-btn--unavail ${view === 'unavailable' ? 'rcr-toggle-btn--active-unavail' : ''}`}
          onClick={() => { setView('unavailable'); setFilterStatus('all'); setSortBy('roomNumber'); setSearch(''); }}
        >
          <XCircle size={15}/> Non-Available
          <span className="rcr-toggle-count">{unavailableRows.length}</span>
        </button>
      </div>

      {/* ── Toolbar ── */}
      <div className="rcr-toolbar">
        <div className="rcr-search-wrap">
          <Search size={14} className="rcr-search-icon"/>
          <input
            className="rcr-search"
            placeholder={view === 'booked' ? 'Search room, guest, confirmation…' : 'Search room, floor, type…'}
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select className="rcr-filter" value={filterType} onChange={e => setFilterType(e.target.value)}>
          <option value="all">All Types</option>
          {Object.entries(TYPE_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        {view === 'booked' && (
          <select className="rcr-filter" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="all">All Statuses</option>
            {Object.entries(STATUS_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        )}
        {view === 'unavailable' && (
          <select className="rcr-filter" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="all">All Statuses</option>
            {UNAVAIL_STATUS_OPTIONS.map(k => <option key={k} value={k}>{STATUS_META[k].label}</option>)}
          </select>
        )}
      </div>

      {/* ── Table ── */}
      {loading ? (
        <div className="rcr-loading"><div className="rcr-spinner"/><span>Loading rooms…</span></div>
      ) : (
        <div className="rcr-table-wrap">
          <table className="rcr-table">
            <thead>
              <tr>
                {activeCols.map(({ key, label }) => (
                  <th
                    key={label || 'view-col'}
                    className={key ? 'rcr-th rcr-th--sort' : 'rcr-th'}
                    onClick={key ? () => handleSort(key) : undefined}
                  >
                    <span>{label}</span>
                    {key && <SortIcon col={key}/>}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {activeRows.length === 0 ? (
                <tr><td colSpan={activeCols.length} className="rcr-td-empty">{emptyMsg}</td></tr>
              ) : (
                <>
                  {/* ── BOOKED rows ── */}
                  {view === 'booked' && activeRows.map(row => (
                    <tr key={row._id} className="rcr-tr">
                      <td className="rcr-td rcr-td-room">#{row.roomNumber}</td>
                      <td className="rcr-td">{renderTypeBadge(row.roomType)}</td>
                      <td className="rcr-td rcr-td-secondary">Floor {row.floor}</td>
                      <td className="rcr-td rcr-td-secondary">{row.capacity || 2} guests</td>
                      <td className="rcr-td rcr-td-price">{renderPrice(row)}</td>
                      <td className="rcr-td">{renderAmenities(row.amenities)}</td>
                      <td className="rcr-td rcr-td-secondary rcr-td-date">{fmt(row.checkInDate)}</td>
                      <td className="rcr-td rcr-td-secondary rcr-td-date">{fmt(row.checkOutDate)}</td>
                      <td className="rcr-td rcr-td-secondary">{row.guestName || '—'}</td>
                      <td className="rcr-td">{renderBookingStatus(row.bookingStatus)}</td>
                      <td className="rcr-td">{renderStatusWithMaintenance(row)}</td>
                      <td className="rcr-td rcr-td-action">{renderViewBtn({ ...row, _modalMode: 'booked' })}</td>
                    </tr>
                  ))}

                  {/* ── AVAILABLE rows ── */}
                  {view === 'available' && activeRows.map(room => (
                    <tr key={room._id} className="rcr-tr">
                      <td className="rcr-td rcr-td-room">#{room.roomNumber}</td>
                      <td className="rcr-td">{renderTypeBadge(room.roomType)}</td>
                      <td className="rcr-td rcr-td-secondary">Floor {room.floor}</td>
                      <td className="rcr-td rcr-td-secondary">{room.capacity || 2} guests</td>
                      <td className="rcr-td rcr-td-price">{renderPrice(room)}</td>
                      <td className="rcr-td">{renderAmenities(room.amenities)}</td>
                      <td className="rcr-td">{renderStatus(room.status)}</td>
                      <td className="rcr-td rcr-td-action">{renderViewBtn({ ...room, _modalMode: 'available' })}</td>
                    </tr>
                  ))}

                  {/* ── NON-AVAILABLE rows ── */}
                  {view === 'unavailable' && activeRows.map(room => (
                    <tr key={room._id} className="rcr-tr">
                      <td className="rcr-td rcr-td-room">#{room.roomNumber}</td>
                      <td className="rcr-td">{renderTypeBadge(room.roomType)}</td>
                      <td className="rcr-td rcr-td-secondary">Floor {room.floor}</td>
                      <td className="rcr-td rcr-td-secondary">{room.capacity || 2} guests</td>
                      <td className="rcr-td rcr-td-price">{renderPrice(room)}</td>
                      <td className="rcr-td">{renderAmenities(room.amenities)}</td>
                      <td className="rcr-td">{renderStatusWithMaintenance(room)}</td>
                      <td className="rcr-td rcr-td-action">{renderViewBtn({ ...room, _modalMode: 'unavailable' })}</td>
                    </tr>
                  ))}
                </>
              )}
            </tbody>
          </table>

          <div className="rcr-table-footer">
            Showing <strong>{activeRows.length}</strong> of <strong>{totalRows}</strong>{' '}
            room{totalRows !== 1 ? 's' : ''}
          </div>
        </div>
      )}

      {/* ── Detail Modal ── */}
      {selectedItem && (
        <DetailModal
          item={selectedItem}
          mode={selectedItem._modalMode || view}
          onClose={() => setSelectedItem(null)}
        />
      )}
    </div>
  );
};

export default ReceptionistRooms;