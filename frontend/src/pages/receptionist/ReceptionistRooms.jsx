// frontend/src/pages/receptionist/ReceptionistRooms.jsx

import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import {
  Search, RefreshCw, CalendarCheck, CheckCircle,
  XCircle, Eye, X, User, BedDouble, Layers,
  CalendarDays, Wrench, Loader2, ChevronDown, ChevronUp,
  MapPin, Clock, CreditCard, Users, Hash,
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
  pending:       { label: 'Pending',     cls: 'rcr-bpill--yellow', dot: '#d97706' },
  confirmed:     { label: 'Confirmed',   cls: 'rcr-bpill--green',  dot: '#16a34a' },
  'checked-in':  { label: 'Checked In',  cls: 'rcr-bpill--blue',   dot: '#2563eb' },
  'checked-out': { label: 'Checked Out', cls: 'rcr-bpill--gray',   dot: '#6b7280' },
  cancelled:     { label: 'Cancelled',   cls: 'rcr-bpill--red',    dot: '#dc2626' },
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

const NON_AVAILABLE_STATUSES = ['occupied', 'maintenance', 'cleaning'];

// Safe string helper — never pass raw object to JSX
const str = (v) => (v == null ? '' : String(v));

// ── Normalise an amenity entry that may be a populated object OR a plain string ──
// Populated: { _id, name, label, icon, price, ... }
// Legacy:    'wifi' | 'pool' | etc. (plain string)
const getAmenityDisplay = (a) => {
  if (a !== null && typeof a === 'object') {
    return {
      id:    str(a._id),
      label: str(a.label || a.name),
      icon:  str(a.icon),
    };
  }
  // fallback for legacy plain-string amenities (e.g. 'wifi')
  return { id: str(a), label: str(a), icon: '' };
};

const fmt = (dateStr) => {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
};

const fmtShort = (dateStr) => {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short',
  });
};

const nightsBetween = (a, b) => {
  if (!a || !b) return null;
  const diff = new Date(b) - new Date(a);
  return Math.round(diff / (1000 * 60 * 60 * 24));
};

// ─── Detail Modal ─────────────────────────────────────────────────────────────
const DetailModal = ({ item, mode, onClose }) => {
  const [roomDetails, setRoomDetails]   = useState([]);
  const [loadingDetail, setLoadingDetail] = useState(true);
  const [fetchError, setFetchError]     = useState(null);

  useEffect(() => {
    if (!item) return;
    const token   = localStorage.getItem('token');
    const headers = { Authorization: `Bearer ${token}` };
    const ids     = item._roomIds || (item._id ? [item._id] : []);

    if (ids.length === 0) {
      setRoomDetails([item]);
      setLoadingDetail(false);
      return;
    }

    Promise.all(
      ids.map(roomId =>
        axios.get(`${API}/rooms/${roomId}`, { headers })
          .then(res => res.data.data || res.data)
          .catch(() => null)
      )
    )
      .then(results => {
        const valid = results.filter(Boolean);
        setRoomDetails(valid.length > 0 ? valid : [item]);
      })
      .catch(() => {
        setFetchError('Could not load full room details.');
        setRoomDetails([item]);
      })
      .finally(() => setLoadingDetail(false));
  }, [item]);

  if (!item) return null;

  const isBooked   = mode === 'booked';
  const firstRoom  = roomDetails[0] || item;
  const roomStatus = firstRoom.status || item.roomStatus;
  const statusMeta = STATUS_META[roomStatus] || STATUS_META.available;

  return (
    <div className="rcr-modal-overlay" onClick={onClose}>
      <div className="rcr-modal" onClick={e => e.stopPropagation()}>
        <div className="rcr-modal-header">
          <div className="rcr-modal-title-group">
            <span className="rcr-modal-room-num">
              {isBooked && item._roomNumbers?.length > 1
                ? `Rooms #${item._roomNumbers.join(', #')}`
                : `Room #${str(firstRoom.roomNumber || item.roomNumber)}`}
            </span>
            <span className={`rcr-status-pill ${statusMeta.cls}`}>{statusMeta.label}</span>
            {isBooked && (() => {
              const bm = BOOKING_STATUS_META[item.bookingStatus] || { label: str(item.bookingStatus), cls: 'rcr-bpill--gray' };
              return <span className={`rcr-booking-pill ${bm.cls}`}>{bm.label}</span>;
            })()}
          </div>
          <button className="rcr-modal-close" onClick={onClose}><X size={18}/></button>
        </div>

        {loadingDetail ? (
          <div className="rcr-modal-loading">
            <Loader2 size={20} className="rcr-modal-spinner"/>
            <span>Loading room details…</span>
          </div>
        ) : (
          <div className="rcr-modal-body">
            {fetchError && <div className="rcr-modal-fetch-error">{fetchError}</div>}

            {roomDetails.map((data, idx) => {
              const typeMeta   = TYPE_META[data.roomType] || { label: str(data.roomType), cls: '' };
              const price      = data.pricePerNight || TYPE_META[data.roomType]?.price || 0;
              const rStatus    = data.status || data.roomStatus;
              const rStatusMeta = STATUS_META[rStatus] || STATUS_META.available;

              // Normalise amenities — populated objects or legacy strings
              const amenityItems = (data.amenities || []).map(getAmenityDisplay);

              return (
                <div className="rcr-modal-section" key={data._id || idx}>
                  <h3 className="rcr-modal-section-title">
                    <BedDouble size={14}/>
                    {roomDetails.length > 1 ? `Room #${str(data.roomNumber)} Details` : 'Room Details'}
                  </h3>
                  <div className="rcr-modal-grid">
                    <div className="rcr-modal-field">
                      <span className="rcr-modal-label">Room Number</span>
                      <span className="rcr-modal-value">#{str(data.roomNumber)}</span>
                    </div>
                    <div className="rcr-modal-field">
                      <span className="rcr-modal-label">Room Type</span>
                      <span className="rcr-modal-value">
                        <span className={`rcr-type-badge ${typeMeta.cls}`}>{typeMeta.label}</span>
                      </span>
                    </div>
                    <div className="rcr-modal-field">
                      <span className="rcr-modal-label">Floor</span>
                      <span className="rcr-modal-value">Floor {str(data.floor)}</span>
                    </div>
                    <div className="rcr-modal-field">
                      <span className="rcr-modal-label">Capacity</span>
                      <span className="rcr-modal-value">{str(data.capacity || 2)} guests</span>
                    </div>
                    <div className="rcr-modal-field">
                      <span className="rcr-modal-label">Price / Night</span>
                      <span className="rcr-modal-value rcr-modal-price">
                        ${str(price)}<span className="rcr-per-night">/night</span>
                      </span>
                    </div>
                    <div className="rcr-modal-field">
                      <span className="rcr-modal-label">Room Status</span>
                      <span className="rcr-modal-value">
                        <span className={`rcr-status-pill ${rStatusMeta.cls}`}>{rStatusMeta.label}</span>
                      </span>
                    </div>
                    {data.description && (
                      <div className="rcr-modal-field rcr-modal-field--full">
                        <span className="rcr-modal-label">Description</span>
                        <span className="rcr-modal-value">{str(data.description)}</span>
                      </div>
                    )}
                    {rStatus === 'maintenance' && data.maintenanceReason && (
                      <div className="rcr-modal-field rcr-modal-field--full">
                        <span className="rcr-modal-label">
                          <Wrench size={11} style={{ verticalAlign: 'middle', marginRight: 4 }}/>
                          Maintenance Reason
                        </span>
                        <span className="rcr-modal-value">
                          <span className="rcr-modal-warn-block">{str(data.maintenanceReason)}</span>
                        </span>
                      </div>
                    )}

                    {/* ── Amenities — normalised ── */}
                    <div className="rcr-modal-field rcr-modal-field--full">
                      <span className="rcr-modal-label">Amenities</span>
                      <span className="rcr-modal-value">
                        {amenityItems.length > 0 ? (
                          <div className="rcr-amenity-list">
                            {amenityItems.map(a => (
                              <span key={a.id} className="rcr-amenity-chip">
                                {a.icon && <span style={{ marginRight: 3 }}>{a.icon}</span>}
                                {a.label}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="rcr-td-none">None listed</span>
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}

            {isBooked && (
              <div className="rcr-modal-section">
                <h3 className="rcr-modal-section-title">
                  <CalendarDays size={14}/> Reservation Details
                </h3>
                <div className="rcr-modal-grid">
                  {item.confirmationNumber && (
                    <div className="rcr-modal-field">
                      <span className="rcr-modal-label">Confirmation #</span>
                      <span className="rcr-modal-value rcr-modal-conf">{str(item.confirmationNumber)}</span>
                    </div>
                  )}
                  <div className="rcr-modal-field">
                    <span className="rcr-modal-label">Booking Status</span>
                    <span className="rcr-modal-value">
                      {(() => {
                        const bm = BOOKING_STATUS_META[item.bookingStatus] || { label: str(item.bookingStatus), cls: 'rcr-bpill--gray' };
                        return <span className={`rcr-booking-pill ${bm.cls}`}>{bm.label}</span>;
                      })()}
                    </span>
                  </div>
                  <div className="rcr-modal-field">
                    <span className="rcr-modal-label">Check-In</span>
                    <span className="rcr-modal-value">{fmt(item.checkInDate)}</span>
                  </div>
                  <div className="rcr-modal-field">
                    <span className="rcr-modal-label">Check-Out</span>
                    <span className="rcr-modal-value">{fmt(item.checkOutDate)}</span>
                  </div>
                  {item.numberOfGuests != null && (
                    <div className="rcr-modal-field">
                      <span className="rcr-modal-label">No. of Guests</span>
                      <span className="rcr-modal-value">{str(item.numberOfGuests)}</span>
                    </div>
                  )}
                  {item.numberOfRooms != null && (
                    <div className="rcr-modal-field">
                      <span className="rcr-modal-label">No. of Rooms</span>
                      <span className="rcr-modal-value">{str(item.numberOfRooms)}</span>
                    </div>
                  )}
                  {item.totalPrice != null && (
                    <div className="rcr-modal-field">
                      <span className="rcr-modal-label">Total Price</span>
                      <span className="rcr-modal-value rcr-modal-price">${str(item.totalPrice)}</span>
                    </div>
                  )}
                  {item.paymentStatus && (
                    <div className="rcr-modal-field">
                      <span className="rcr-modal-label">Payment Status</span>
                      <span className="rcr-modal-value">
                        {(() => {
                          const pm = PAYMENT_STATUS_META[item.paymentStatus] || { label: str(item.paymentStatus), cls: 'rcr-bpill--gray' };
                          return <span className={`rcr-booking-pill ${pm.cls}`}>{pm.label}</span>;
                        })()}
                      </span>
                    </div>
                  )}
                  {item.stayType && (
                    <div className="rcr-modal-field">
                      <span className="rcr-modal-label">Stay Type</span>
                      <span className="rcr-modal-value" style={{ textTransform: 'capitalize' }}>{str(item.stayType)}</span>
                    </div>
                  )}
                  {item.specialRequests && (
                    <div className="rcr-modal-field rcr-modal-field--full">
                      <span className="rcr-modal-label">Special Requests</span>
                      <span className="rcr-modal-value">{str(item.specialRequests)}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {isBooked && (
              <div className="rcr-modal-section">
                <h3 className="rcr-modal-section-title">
                  <User size={14}/> Guest Details
                </h3>
                <div className="rcr-modal-grid">
                  <div className="rcr-modal-field">
                    <span className="rcr-modal-label">Guest Name</span>
                    <span className="rcr-modal-value">{str(item.guestName) || '—'}</span>
                  </div>
                  {item.email && (
                    <div className="rcr-modal-field">
                      <span className="rcr-modal-label">Email</span>
                      <span className="rcr-modal-value">{str(item.email)}</span>
                    </div>
                  )}
                  {item.phone && (
                    <div className="rcr-modal-field">
                      <span className="rcr-modal-label">Phone</span>
                      <span className="rcr-modal-value">{str(item.phone)}</span>
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

// ─── Booking Card ─────────────────────────────────────────────────────────────
const BookingCard = ({ row, onView }) => {
  const nights  = nightsBetween(row.checkInDate, row.checkOutDate);
  const bm      = BOOKING_STATUS_META[row.bookingStatus] || { label: str(row.bookingStatus), cls: 'rcr-bpill--gray', dot: '#6b7280' };
  const rm      = STATUS_META[row.roomStatus] || STATUS_META.available;
  const isMulti = row._roomNumbers?.length > 1;
  const price   = row.pricePerNight || TYPE_META[row.roomType]?.price || 0;

  // Normalise amenities for this card row
  const amenityItems = (row.amenities || []).map(getAmenityDisplay);

  return (
    <div className="rcr-booking-card">
      {/* ── Card Header ── */}
      <div className="rcr-card-header">
        <div className="rcr-card-rooms">
          {isMulti ? (
            <div className="rcr-card-room-badges">
              {row._roomNumbers.map(n => (
                <span key={n} className="rcr-card-room-num">#{str(n)}</span>
              ))}
            </div>
          ) : (
            <span className="rcr-card-room-single">#{str(row.roomNumber)}</span>
          )}
          {row.roomType !== 'mixed' ? (
            <span className={`rcr-type-badge ${TYPE_META[row.roomType]?.cls || ''}`}>
              {TYPE_META[row.roomType]?.label || str(row.roomType)}
            </span>
          ) : (
            <span className="rcr-type-badge rcr-type--mixed">Mixed</span>
          )}
        </div>
        <div className="rcr-card-statuses">
          <span className={`rcr-booking-pill ${bm.cls}`}>
            <span className="rcr-status-dot" style={{ background: bm.dot }}/>
            {bm.label}
          </span>
          <span className={`rcr-status-pill ${rm.cls}`}>{rm.label}</span>
          {row.roomStatus === 'maintenance' && (
            <span className="rcr-maint-indicator" title="Under maintenance">
              <Wrench size={10}/>
            </span>
          )}
        </div>
      </div>

      {/* ── Card Body ── */}
      <div className="rcr-card-body">
        {/* Guest */}
        <div className="rcr-card-guest">
          <div className="rcr-card-guest-avatar">
            {row.guestName ? row.guestName.charAt(0).toUpperCase() : '?'}
          </div>
          <div className="rcr-card-guest-info">
            <span className="rcr-card-guest-name">{str(row.guestName) || '—'}</span>
            {row.email && <span className="rcr-card-guest-email">{str(row.email)}</span>}
          </div>
        </div>

        {/* Stay dates */}
        <div className="rcr-card-dates">
          <div className="rcr-card-date-block">
            <span className="rcr-card-date-label">Check-In</span>
            <span className="rcr-card-date-val">{fmtShort(row.checkInDate)}</span>
          </div>
          <div className="rcr-card-date-divider">
            {nights != null && (
              <span className="rcr-card-nights">{nights}N</span>
            )}
            <div className="rcr-card-date-line"/>
          </div>
          <div className="rcr-card-date-block rcr-card-date-block--right">
            <span className="rcr-card-date-label">Check-Out</span>
            <span className="rcr-card-date-val">{fmtShort(row.checkOutDate)}</span>
          </div>
        </div>

        {/* Meta row */}
        <div className="rcr-card-meta">
          <div className="rcr-card-meta-item">
            <MapPin size={11}/>
            {row.floor != null ? `Floor ${str(row.floor)}` : '—'}
          </div>
          <div className="rcr-card-meta-item">
            <Users size={11}/>
            {row.capacity != null ? `${str(row.capacity)} guests` : '—'}
          </div>
          <div className="rcr-card-meta-item rcr-card-meta-price">
            <CreditCard size={11}/>
            ${str(price)}<span className="rcr-per-night">/night{isMulti ? ' (combined)' : ''}</span>
          </div>
          {row.totalPrice != null && (
            <div className="rcr-card-meta-item rcr-card-meta-total">
              Total: <strong>${str(row.totalPrice)}</strong>
            </div>
          )}
        </div>

        {/* ── Amenities — normalised ── */}
        {amenityItems.length > 0 && (
          <div className="rcr-card-amenities">
            {amenityItems.map(a => (
              <span key={a.id} className="rcr-amenity-chip">
                {a.icon && <span style={{ marginRight: 3 }}>{a.icon}</span>}
                {a.label}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* ── Card Footer ── */}
      <div className="rcr-card-footer">
        {row.confirmationNumber && (
          <span className="rcr-card-conf">
            <Hash size={10}/>{str(row.confirmationNumber)}
          </span>
        )}
        <button
          className="rcr-view-btn rcr-view-btn--card"
          onClick={() => onView({ ...row, _modalMode: 'booked' })}
        >
          <Eye size={13}/> View Details
        </button>
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

  // Detect dark mode from parent layout
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const el = document.getElementById('hk-content-area');
    if (!el) return;
    const check = () => setIsDark(el.classList.contains('hk-content--dark'));
    check();
    const obs = new MutationObserver(check);
    obs.observe(el, { attributes: true, attributeFilter: ['class'] });
    return () => obs.disconnect();
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const token   = localStorage.getItem('token');
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

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') setSelectedItem(null); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const handleSort = (col) => {
    if (sortBy === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortBy(col); setSortDir('asc'); }
  };

  const SortIcon = ({ col }) => {
    if (sortBy !== col) return <span className="rcr-sort-idle">↕</span>;
    return <span className="rcr-sort-active">{sortDir === 'asc' ? '↑' : '↓'}</span>;
  };

  // ── Build booked rows ─────────────────────────────────────────────────────
  const bookedRows = (() => {
    const activeStatuses = ['confirmed', 'checked-in', 'pending'];
    return reservations
      .filter(r => activeStatuses.includes(r.status))
      .map(reservation => {
        const roomList = Array.isArray(reservation.roomIds) ? reservation.roomIds : [];
        const resolvedRooms = roomList
          .map(roomRef => {
            const roomId = typeof roomRef === 'object' ? roomRef._id?.toString() : roomRef?.toString();
            return roomId ? rooms.find(rm => rm._id?.toString() === roomId) : null;
          })
          .filter(Boolean);

        const roomNumbers  = resolvedRooms.map(r => r.roomNumber);
        const roomIds      = resolvedRooms.map(r => r._id?.toString());
        const uniqueTypes  = [...new Set(resolvedRooms.map(r => r.roomType))];
        const displayType  = uniqueTypes.length === 1 ? uniqueTypes[0] : 'mixed';

        // Merge amenities from all rooms — keep raw entries (objects or strings), dedupe by id/value
        const seenAmenityKeys = new Set();
        const allAmenities    = resolvedRooms.flatMap(r => r.amenities || []).filter(a => {
          const key = (a !== null && typeof a === 'object') ? str(a._id) : str(a);
          if (seenAmenityKeys.has(key)) return false;
          seenAmenityKeys.add(key);
          return true;
        });

        const firstRoom       = resolvedRooms[0] || {};
        const statusPriority  = ['maintenance', 'cleaning', 'occupied', 'available'];
        const dominantStatus  = statusPriority.find(s => resolvedRooms.some(r => r.status === s)) || firstRoom.status;

        return {
          _id:               reservation._id,
          _roomIds:          roomIds,
          _roomNumbers:      roomNumbers,
          roomNumber:        roomNumbers.length === 1 ? roomNumbers[0] : roomNumbers.join(', '),
          roomType:          displayType,
          floor:             resolvedRooms.length === 1 ? firstRoom.floor : null,
          capacity:          resolvedRooms.length === 1 ? firstRoom.capacity : null,
          pricePerNight:     resolvedRooms.length === 1
            ? firstRoom.pricePerNight
            : resolvedRooms.reduce((s, r) => s + (r.pricePerNight || TYPE_META[r.roomType]?.price || 0), 0),
          amenities:         allAmenities,   // raw — normalised at render time
          roomStatus:        dominantStatus,
          maintenanceReason: firstRoom.maintenanceReason,
          bookingStatus:     reservation.status,
          checkInDate:       reservation.checkInDate,
          checkOutDate:      reservation.checkOutDate,
          guestName:         reservation.guestName,
          email:             reservation.email,
          phone:             reservation.phone,
          confirmationNumber: reservation.confirmationNumber,
          numberOfGuests:    reservation.numberOfGuests,
          numberOfRooms:     reservation.numberOfRooms,
          totalPrice:        reservation.totalPrice,
          paymentStatus:     reservation.paymentStatus,
          stayType:          reservation.stayType,
          specialRequests:   reservation.specialRequests,
        };
      });
  })();

  const activelyBookedRoomIds = new Set(bookedRows.flatMap(r => r._roomIds));

  const availableRows = rooms.filter(r =>
    r.status === 'available' && r.isActive !== false &&
    !activelyBookedRoomIds.has(r._id?.toString())
  );

  const unavailableRows = rooms.filter(r =>
    NON_AVAILABLE_STATUSES.includes(r.status) && r.isActive !== false
  );

  const applyFilters = (data) =>
    data
      .filter(r => {
        const matchType   = filterType === 'all' || r.roomType === filterType;
        const statusVal   = r.roomStatus || r.status;
        const matchStatus = filterStatus === 'all' || statusVal === filterStatus;
        const q           = search.toLowerCase();
        const matchSearch = !q ||
          str(r.roomNumber).includes(q) ||
          str(r.roomType).toLowerCase().includes(q) ||
          str(r.floor ?? '').includes(q) ||
          str(r.guestName ?? '').toLowerCase().includes(q) ||
          str(r.confirmationNumber ?? '').toLowerCase().includes(q);
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
        if (av < bv) return sortDir === 'asc' ? -1 : 1;
        if (av > bv) return sortDir === 'asc' ? 1 : -1;
        return 0;
      });

  const filteredBooked      = applyFilters(bookedRows);
  const filteredAvailable   = applyFilters(availableRows);
  const filteredUnavailable = applyFilters(unavailableRows);

  const counts = {
    total:       rooms.length,
    available:   availableRows.length,
    occupied:    rooms.filter(r => r.status === 'occupied').length,
    booked:      bookedRows.length,
    unavailable: unavailableRows.length,
  };

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
    { key: 'roomNumber', label: 'Room'          },
    { key: 'roomType',   label: 'Type'          },
    { key: 'floor',      label: 'Floor'         },
    { key: null,         label: 'Capacity'      },
    { key: 'price',      label: 'Price / Night' },
    { key: null,         label: 'Amenities'     },
    { key: 'status',     label: 'Room Status'   },
    { key: null,         label: ''              },
  ];

  const renderTypeBadge = (roomType) => {
    if (roomType === 'mixed') return <span className="rcr-type-badge rcr-type--mixed">Mixed</span>;
    const m = TYPE_META[roomType] || { label: str(roomType), cls: '' };
    return <span className={`rcr-type-badge ${m.cls}`}>{m.label}</span>;
  };

  // ── renderAmenities — normalised, works with both objects and plain strings ──
  const renderAmenities = (amenities) => {
    const items = (amenities || []).map(getAmenityDisplay);
    return items.length > 0 ? (
      <div className="rcr-amenity-list">
        {items.map(a => (
          <span key={a.id} className="rcr-amenity-chip">
            {a.icon && <span style={{ marginRight: 3 }}>{a.icon}</span>}
            {a.label}
          </span>
        ))}
      </div>
    ) : <span className="rcr-td-none">—</span>;
  };

  const renderPrice = (row) => {
    const isMulti = row._roomIds?.length > 1;
    const price   = row.pricePerNight || TYPE_META[row.roomType]?.price || 0;
    return <>${str(price)}<span className="rcr-per-night">/night{isMulti ? ' (combined)' : ''}</span></>;
  };

  const renderStatus = (status) => {
    const m = STATUS_META[status] || STATUS_META.available;
    return <span className={`rcr-status-pill ${m.cls}`}>{m.label}</span>;
  };

  const renderStatusWithMaintenance = (row) => {
    const status = row.roomStatus || row.status;
    const m      = STATUS_META[status] || STATUS_META.available;
    return (
      <div className="rcr-status-cell">
        <span className={`rcr-status-pill ${m.cls}`}>{m.label}</span>
        {status === 'maintenance' && (
          <span className="rcr-maint-indicator" title="Has maintenance reason">
            <Wrench size={11}/>
          </span>
        )}
      </div>
    );
  };

  const activeTableRows = view === 'available' ? filteredAvailable : filteredUnavailable;
  const activeCols      = view === 'available' ? AVAILABLE_COLS : UNAVAILABLE_COLS;
  const totalRows       = view === 'booked' ? bookedRows.length
    : view === 'available' ? availableRows.length : unavailableRows.length;

  const UNAVAIL_STATUS_OPTIONS = ['occupied', 'maintenance', 'cleaning'];

  return (
    <div className={`rcr-page${isDark ? ' rcr-dark' : ''}`}>
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
        {view === 'booked' && (
          <select className="rcr-filter" value={sortBy} onChange={e => { setSortBy(e.target.value); setSortDir('asc'); }}>
            <option value="roomNumber">Sort: Room #</option>
            <option value="roomType">Sort: Type</option>
            <option value="price">Sort: Price</option>
          </select>
        )}
      </div>

      {/* ── Content ── */}
      {loading ? (
        <div className="rcr-loading"><div className="rcr-spinner"/><span>Loading rooms…</span></div>
      ) : (
        <>
          {/* ═══ BOOKED — Card Grid ═══ */}
          {view === 'booked' && (
            <>
              {filteredBooked.length === 0 ? (
                <div className="rcr-empty-state">
                  <CalendarCheck size={32}/>
                  <p>No booked rooms match your filters.</p>
                </div>
              ) : (
                <div className="rcr-cards-grid">
                  {filteredBooked.map(row => (
                    <BookingCard key={row._id} row={row} onView={setSelectedItem}/>
                  ))}
                </div>
              )}
              <div className="rcr-cards-footer">
                Showing <strong>{filteredBooked.length}</strong> of <strong>{bookedRows.length}</strong> reservations
              </div>
            </>
          )}

          {/* ═══ AVAILABLE / NON-AVAILABLE — Table ═══ */}
          {view !== 'booked' && (
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
                  {activeTableRows.length === 0 ? (
                    <tr><td colSpan={activeCols.length} className="rcr-td-empty">
                      {view === 'available'
                        ? 'No available rooms match your filters.'
                        : 'No non-available rooms match your filters.'}
                    </td></tr>
                  ) : activeTableRows.map(room => (
                    <tr key={room._id} className="rcr-tr">
                      <td className="rcr-td rcr-td-room">#{str(room.roomNumber)}</td>
                      <td className="rcr-td">{renderTypeBadge(room.roomType)}</td>
                      <td className="rcr-td rcr-td-secondary">Floor {str(room.floor)}</td>
                      <td className="rcr-td rcr-td-secondary">{str(room.capacity || 2)} guests</td>
                      <td className="rcr-td rcr-td-price">{renderPrice(room)}</td>
                      <td className="rcr-td">{renderAmenities(room.amenities)}</td>
                      <td className="rcr-td">
                        {view === 'available'
                          ? renderStatus(room.status)
                          : renderStatusWithMaintenance(room)}
                      </td>
                      <td className="rcr-td rcr-td-action">
                        <button
                          className="rcr-view-btn"
                          onClick={() => setSelectedItem({ ...room, _modalMode: view })}
                          title="View details"
                        >
                          <Eye size={13}/> View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="rcr-table-footer">
                Showing <strong>{activeTableRows.length}</strong> of <strong>{totalRows}</strong> rooms
              </div>
            </div>
          )}
        </>
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