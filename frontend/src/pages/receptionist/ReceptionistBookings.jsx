// frontend/src/pages/receptionist/ReceptionistBookings.jsx
//
// Amenities are fetched dynamically from GET /api/amenities?active=true
// Pricing is inferred from amenity.price and amenity.name.
// Optional amenities shown = ALL amenities MINUS those already on selected rooms
// checkInTime: receptionist can set a preferred arrival time (must be >= hotel checkInTime)

import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import {
  Plus, Search, ChevronLeft, ChevronRight as ChevronRightIcon,
  Users, BedDouble, LogIn, LogOut,
  RefreshCw, X, CheckCircle, Clock, ArrowRightLeft,
  CreditCard, User, Phone, Mail, Calendar,
  Pencil, Trash2, AlertTriangle, Save, ChevronDown,
  PlusCircle, Eye,
} from 'lucide-react';
import './ReceptionistBookings.css';

const API = process.env.REACT_APP_API_URL;

// ── Helpers ────────────────────────────────────────────────────────
const fmt = (date) => {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

const fmtShort = (date) => {
  if (!date) return '—';
  const d = new Date(date);
  return `${d.toLocaleString('en-GB', { month: 'short' })} ${d.getDate()}`;
};

const toInputDate = (dateStr) => {
  if (!dateStr) return '';
  return new Date(dateStr).toISOString().split('T')[0];
};

// ── Time helpers ────────────────────────────────────────────────────
const timeToMinutes = (hhmm) => {
  if (!hhmm) return 0;
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};

const buildTimeSlots = (hotelCheckInTime) => {
  const hotelMins = timeToMinutes(hotelCheckInTime || '14:00');
  const slots = [];
  for (let mins = hotelMins; mins <= 23 * 60; mins += 30) {
    const h = String(Math.floor(mins / 60)).padStart(2, '0');
    const m = String(mins % 60).padStart(2, '0');
    slots.push(`${h}:${m}`);
  }
  return slots;
};

const formatTimeDisplay = (hhmm) => {
  if (!hhmm) return '';
  const [h, m] = hhmm.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, '0')} ${period}`;
};

// ── Amenity helpers ─────────────────────────────────────────────────
const inferPricingModel = (amenity) => {
  if (amenity.pricingModel) return amenity.pricingModel;
  const n = amenity.name?.toLowerCase() || '';
  if (['pool', 'spa', 'gym'].includes(n)) return 'hourly';
  if (['restaurant', 'bar'].includes(n))  return 'daily';
  return 'flat';
};

const getRoomBuiltInAmenityIds = (selectedRooms = []) => {
  const ids = new Set();
  selectedRooms.forEach(room => {
    (room.amenities || []).forEach(a => {
      if (typeof a === 'object' && a !== null) {
        if (a._id) ids.add(String(a._id));
      } else if (a) {
        ids.add(String(a));
      }
    });
  });
  return ids;
};

const getAddOnAmenities = (allAmenities, selectedRooms) => {
  const builtIn = getRoomBuiltInAmenityIds(selectedRooms);
  return allAmenities.filter(a => !builtIn.has(String(a._id)));
};

const formatAmenityPrice = (amenity) => {
  if (amenity.price === 0) return 'FREE';
  const model = inferPricingModel(amenity);
  return `$${amenity.price}/${model === 'hourly' ? 'hr' : model === 'daily' ? 'day' : 'flat'}`;
};

// Normalize any amenity ID to a plain string for consistent comparison
const normalizeId = (id) => {
  if (!id) return '';
  if (typeof id === 'object' && id !== null) return String(id._id || id);
  return String(id);
};

const STATUS_META = {
  pending:       { label: 'Pending',     cls: 'rcb-pill--amber',  Icon: Clock       },
  confirmed:     { label: 'Confirmed',   cls: 'rcb-pill--blue',   Icon: CheckCircle },
  'checked-in':  { label: 'Checked In',  cls: 'rcb-pill--green',  Icon: LogIn       },
  'checked-out': { label: 'Checked Out', cls: 'rcb-pill--purple', Icon: LogOut      },
  cancelled:     { label: 'Cancelled',   cls: 'rcb-pill--red',    Icon: X           },
};

const ROOM_TYPE_META = {
  single: { label: 'Single', cls: 'rcb-type--single' },
  double: { label: 'Double', cls: 'rcb-type--double' },
  deluxe: { label: 'Deluxe', cls: 'rcb-type--deluxe' },
  suite:  { label: 'Suite',  cls: 'rcb-type--suite'  },
  family: { label: 'Family', cls: 'rcb-type--family' },
};

const PAYMENT_META = {
  pending: 'Pending', completed: 'Completed', failed: 'Failed', refunded: 'Refunded',
};

const buildDays = () => {
  const days = [];
  const today = new Date(); today.setHours(0,0,0,0);
  for (let i = -4; i <= 12; i++) {
    const d = new Date(today); d.setDate(today.getDate() + i); days.push(d);
  }
  return days;
};

const mkBooking = () => ({
  id:              Date.now() + Math.random(),
  roomType:        'deluxe',
  checkInDate:     '',
  checkOutDate:    '',
  checkInTime:     '',
  numberOfGuests:  1,
  specialRequests: '',
  availableRooms:  [],
  selectedRoomIds: [],
  selectedRooms:   [],
  searched:        false,
  searching:       false,
  error:           '',
  selectedAmenityIds: [],
  amenityHours:       {},
});

const calcNightsFor = (b) => {
  if (!b.checkInDate || !b.checkOutDate) return 0;
  return Math.max(0, Math.round((new Date(b.checkOutDate) - new Date(b.checkInDate)) / 86400000));
};

const bookingSubtotal = (b, allAmenities = []) => {
  const nights = calcNightsFor(b);
  let roomTotal = 0;
  if (nights && b.selectedRooms.length > 0) {
    roomTotal = b.selectedRooms.reduce((sum, room) => sum + (room.pricePerNight || 0) * nights, 0);
  }
  let amenityTotal = 0;
  (b.selectedAmenityIds || []).forEach(id => {
    const nid = normalizeId(id);
    const amenity = allAmenities.find(a => normalizeId(a._id) === nid);
    if (!amenity) return;
    const model = inferPricingModel(amenity);
    if (model === 'hourly') amenityTotal += amenity.price * (b.amenityHours?.[nid] || 0);
    else if (model === 'daily') amenityTotal += amenity.price * nights;
    else amenityTotal += amenity.price;
  });
  return roomTotal + amenityTotal;
};

const roomRateLabel = (b) => {
  if (b.selectedRooms.length === 0) return null;
  const rates = [...new Set(b.selectedRooms.map(r => r.pricePerNight))];
  if (rates.length === 1) return `$${rates[0]}/night`;
  return `$${Math.min(...rates)}–$${Math.max(...rates)}/night`;
};

// ── Shared CheckInTime selector component ─────────────────────────
const CheckInTimeField = ({ value, onChange, timeSlots, label = 'Check-in Time', hint = true, hotelCheckInTime }) => (
  <div className="rcb-field">
    <label><Clock size={13}/> {label} <span style={{ fontWeight: 400, fontStyle: 'italic', fontSize: '0.6rem', color: '#9a9088' }}>(optional)</span></label>
    <select value={value} onChange={e => onChange(e.target.value)}>
      <option value="">No preference</option>
      {timeSlots.map(slot => (
        <option key={slot} value={slot}>{formatTimeDisplay(slot)}</option>
      ))}
    </select>
    {hint && hotelCheckInTime && (
      <span style={{ fontSize: '0.65rem', color: '#9a9088', marginTop: 3, fontStyle: 'italic' }}>
        Check-in from {formatTimeDisplay(hotelCheckInTime)} onwards
      </span>
    )}
  </div>
);

// ═══════════════════════════════════════════════════════════════════
// NEW BOOKING MODAL
// ═══════════════════════════════════════════════════════════════════
const NewBookingModal = ({ onClose, onCreated, allAmenities, hotelCheckInTime }) => {
  const [guestInfo, setGuestInfo]     = useState({ guestName: '', email: '', phone: '' });
  const [confirmed, setConfirmed]     = useState([]);
  const [active, setActive]           = useState(mkBooking());
  const [step, setStep]               = useState('guest');
  const [submitting, setSubmitting]   = useState(false);
  const [globalError, setGlobalError] = useState('');

  const timeSlots = buildTimeSlots(hotelCheckInTime);

  const patchActive = (patch) => setActive(a => ({ ...a, ...patch }));

  const addOnAmenities = getAddOnAmenities(allAmenities, active.selectedRooms);

  const builtInAmenityIds = getRoomBuiltInAmenityIds(active.selectedRooms);
  const builtInAmenities  = allAmenities.filter(a => builtInAmenityIds.has(String(a._id)));

  const searchRooms = async () => {
    patchActive({ searching: true, error: '' });
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API}/reservations/available`, {
        params: { roomType: active.roomType, checkInDate: active.checkInDate, checkOutDate: active.checkOutDate },
        headers: { Authorization: `Bearer ${token}` },
      });
      patchActive({ availableRooms: res.data.data || [], searched: true, searching: false });
    } catch {
      patchActive({ error: 'Failed to fetch available rooms.', searching: false });
    }
  };

  const toggleRoom = (room) => {
    setActive(a => {
      const already = a.selectedRoomIds.includes(room._id);
      const newSelectedRooms = already
        ? a.selectedRooms.filter(r => r._id !== room._id)
        : [...a.selectedRooms, room];

      const newBuiltIn = getRoomBuiltInAmenityIds(newSelectedRooms);
      const filteredAmenityIds = a.selectedAmenityIds.filter(id => !newBuiltIn.has(String(id)));
      const filteredHours = Object.fromEntries(
        Object.entries(a.amenityHours).filter(([k]) => !newBuiltIn.has(String(k)))
      );

      return {
        ...a,
        selectedRoomIds:    already ? a.selectedRoomIds.filter(id => id !== room._id) : [...a.selectedRoomIds, room._id],
        selectedRooms:      newSelectedRooms,
        selectedAmenityIds: filteredAmenityIds,
        amenityHours:       filteredHours,
      };
    });
  };

  const toggleAmenity = (amenityId) => {
    setActive(a => {
      const nid = normalizeId(amenityId);
      const already = a.selectedAmenityIds.map(normalizeId).includes(nid);
      const amenity = allAmenities.find(am => normalizeId(am._id) === nid);
      const model   = amenity ? inferPricingModel(amenity) : 'flat';
      const newHours = (!already && model === 'hourly')
        ? { ...a.amenityHours, [nid]: 1 }
        : a.amenityHours;
      return {
        ...a,
        selectedAmenityIds: already
          ? a.selectedAmenityIds.filter(id => normalizeId(id) !== nid)
          : [...a.selectedAmenityIds, nid],
        amenityHours: already
          ? Object.fromEntries(Object.entries(a.amenityHours).filter(([k]) => k !== nid))
          : newHours,
      };
    });
  };

  const handleAddAnother = () => {
    if (active.selectedRoomIds.length === 0) {
      patchActive({ error: 'Select at least one room before adding another booking.' });
      return;
    }
    setConfirmed(prev => [...prev, active]);
    setActive(mkBooking());
  };

  const handleReviewAll = () => {
    if (active.selectedRoomIds.length === 0) {
      patchActive({ error: 'Select at least one room before continuing.' });
      return;
    }
    setConfirmed(prev => [...prev, active]);
    setStep('summary');
  };

  const removeConfirmed = (id) => setConfirmed(prev => prev.filter(b => b.id !== id));

  const grandTotal = confirmed.reduce((s, b) => s + bookingSubtotal(b, allAmenities), 0);

  const handleSubmit = async () => {
    if (confirmed.length === 0) return;
    setGlobalError('');
    setSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      await Promise.all(
        confirmed.map(b =>
          axios.post(`${API}/reservations`, {
            guestName:       guestInfo.guestName,
            email:           guestInfo.email,
            phone:           guestInfo.phone,
            checkInDate:     b.checkInDate,
            checkOutDate:    b.checkOutDate,
            checkInTime:     b.checkInTime || null,
            roomType:        b.roomType,
            roomIds:         b.selectedRoomIds,
            numberOfGuests:  b.numberOfGuests,
            numberOfRooms:   b.selectedRoomIds.length,
            specialRequests: b.specialRequests,
            paidAmenities:   b.selectedAmenityIds.map(normalizeId),
            amenityHours:    b.amenityHours,
            totalPrice:      bookingSubtotal(b, allAmenities),
            stayType:        'overnight',
          }, { headers: { Authorization: `Bearer ${token}` } })
        )
      );
      onCreated();
      onClose();
    } catch (e) {
      setGlobalError(e.response?.data?.message || 'Failed to create booking(s). Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const canProceedFromGuest = guestInfo.guestName && guestInfo.email && guestInfo.phone;

  const StepBar = ({ current }) => (
    <div className="rcb-step-indicator">
      <span className={`rcb-step ${current === 'guest' ? 'rcb-step--active' : 'rcb-step--done'}`}>① Guest Info</span>
      <span className="rcb-step-sep">›</span>
      <span className={`rcb-step ${current === 'rooms' ? 'rcb-step--active' : current === 'summary' ? 'rcb-step--done' : ''}`}>② Rooms</span>
      <span className="rcb-step-sep">›</span>
      <span className={`rcb-step ${current === 'summary' ? 'rcb-step--active' : ''}`}>③ Summary</span>
    </div>
  );

  // ══ STEP: guest ══
  if (step === 'guest') return (
    <div className="rcb-modal-overlay" onClick={onClose}>
      <div className="rcb-modal" onClick={e => e.stopPropagation()}>
        <div className="rcb-modal-header">
          <div>
            <h2 className="rcb-modal-title">New Booking</h2>
            <p className="rcb-modal-conf">Step 1 of 3 — Guest Information</p>
          </div>
          <button className="rcb-modal-close" onClick={onClose}><X size={18}/></button>
        </div>
        <div className="rcb-modal-body">
          <StepBar current="guest"/>
          <div className="rcb-form-grid" style={{ marginTop: 18 }}>
            <div className="rcb-field">
              <label><User size={13}/> Guest Name</label>
              <input value={guestInfo.guestName} onChange={e => setGuestInfo({ ...guestInfo, guestName: e.target.value })} placeholder="Full name"/>
            </div>
            <div className="rcb-field">
              <label><Mail size={13}/> Email</label>
              <input type="email" value={guestInfo.email} onChange={e => setGuestInfo({ ...guestInfo, email: e.target.value })} placeholder="email@example.com"/>
            </div>
            <div className="rcb-field rcb-field--full">
              <label><Phone size={13}/> Phone</label>
              <input value={guestInfo.phone} onChange={e => setGuestInfo({ ...guestInfo, phone: e.target.value })} placeholder="+1 234 567 890"/>
            </div>
          </div>
          <div className="rcb-modal-footer">
            <button className="rcb-modal-btn rcb-modal-btn--secondary" onClick={onClose}>Cancel</button>
            <button className="rcb-modal-btn rcb-modal-btn--primary" onClick={() => setStep('rooms')} disabled={!canProceedFromGuest}>
              Next: Add Rooms →
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  // ══ STEP: rooms ══
  if (step === 'rooms') return (
    <div className="rcb-modal-overlay" onClick={onClose}>
      <div className="rcb-modal rcb-modal--wide" onClick={e => e.stopPropagation()}>
        <div className="rcb-modal-header">
          <div>
            <h2 className="rcb-modal-title">New Booking</h2>
            <p className="rcb-modal-conf">
              {guestInfo.guestName}
              {confirmed.length > 0 && <> · <strong>{confirmed.length}</strong> booking{confirmed.length > 1 ? 's' : ''} saved</>}
            </p>
          </div>
          <button className="rcb-modal-close" onClick={onClose}><X size={18}/></button>
        </div>

        {active.error && <div className="rcb-modal-error">{active.error}</div>}
        {globalError  && <div className="rcb-modal-error">{globalError}</div>}

        <div className="rcb-modal-body">
          <StepBar current="rooms"/>

          {confirmed.length > 0 && (
            <div className="rcb-saved-list">
              {confirmed.map((b, i) => (
                <div key={b.id} className="rcb-saved-item">
                  <span className="rcb-saved-num">#{i + 1}</span>
                  <span className={`rcb-saved-type rcb-type-badge ${ROOM_TYPE_META[b.roomType]?.cls}`}>{ROOM_TYPE_META[b.roomType]?.label}</span>
                  <span className="rcb-saved-rooms">{b.selectedRooms.map(r => `#${r.roomNumber}`).join(', ')}</span>
                  <span className="rcb-saved-dates">{fmt(b.checkInDate)} → {fmt(b.checkOutDate)}</span>
                  {b.checkInTime && <span className="rcb-saved-time"><Clock size={11}/>{formatTimeDisplay(b.checkInTime)}</span>}
                  <span className="rcb-saved-price">${bookingSubtotal(b, allAmenities).toLocaleString()}</span>
                  <button className="rcb-saved-remove" onClick={() => setConfirmed(prev => prev.filter(x => x.id !== b.id))}><X size={12}/></button>
                </div>
              ))}
            </div>
          )}

          <div className="rcb-segment">
            <div className="rcb-segment-header">
              <span className="rcb-segment-label">
                Booking {confirmed.length + 1}
                {active.selectedRoomIds.length > 0 && calcNightsFor(active) > 0 && (
                  <span className="rcb-segment-price"> · ${bookingSubtotal(active, allAmenities).toLocaleString()}</span>
                )}
              </span>
            </div>

            <div className="rcb-form-grid">
              <div className="rcb-field">
                <label><BedDouble size={13}/> Room Type</label>
                <select value={active.roomType} onChange={e => patchActive({ roomType: e.target.value, searched: false, availableRooms: [], selectedRoomIds: [], selectedRooms: [], selectedAmenityIds: [], amenityHours: {} })}>
                  <option value="single">Single</option>
                  <option value="double">Double</option>
                  <option value="deluxe">Deluxe</option>
                  <option value="suite">Suite</option>
                  <option value="family">Family</option>
                </select>
              </div>
              <div className="rcb-field">
                <label><Users size={13}/> No. of Guests</label>
                <input type="number" min="1" max="20" value={active.numberOfGuests} onChange={e => patchActive({ numberOfGuests: +e.target.value })}/>
              </div>
              <div className="rcb-field">
                <label><Calendar size={13}/> Check-in</label>
                <input type="date" value={active.checkInDate} onChange={e => patchActive({ checkInDate: e.target.value, searched: false, availableRooms: [], selectedRoomIds: [], selectedRooms: [], selectedAmenityIds: [], amenityHours: {} })}/>
              </div>
              <div className="rcb-field">
                <label><Calendar size={13}/> Check-out</label>
                <input type="date" value={active.checkOutDate} onChange={e => patchActive({ checkOutDate: e.target.value, searched: false, availableRooms: [], selectedRoomIds: [], selectedRooms: [], selectedAmenityIds: [], amenityHours: {} })}/>
              </div>
              <CheckInTimeField
                value={active.checkInTime}
                onChange={(val) => patchActive({ checkInTime: val })}
                timeSlots={timeSlots}
                hotelCheckInTime={hotelCheckInTime}
              />
              <div className="rcb-field rcb-field--full">
                <label>Special Requests</label>
                <textarea rows={2} value={active.specialRequests} onChange={e => patchActive({ specialRequests: e.target.value })} placeholder="Any special requests…"/>
              </div>
            </div>

            {/* Room search */}
            {!active.searched ? (
              <div className="rcb-seg-search-row">
                <button className="rcb-room-search-btn" onClick={searchRooms} disabled={active.searching || !active.checkInDate || !active.checkOutDate}>
                  {active.searching ? <><span className="rcb-btn-spinner"/>Searching…</> : <><Search size={13}/> Search Available Rooms</>}
                </button>
                {(!active.checkInDate || !active.checkOutDate) && <span className="rcb-room-hint">Set check-in and check-out dates first.</span>}
              </div>
            ) : (
              <div className="rcb-seg-rooms">
                <p className="rcb-room-search-meta">
                  {active.availableRooms.length} room{active.availableRooms.length !== 1 ? 's' : ''} available
                  &nbsp;·&nbsp; {ROOM_TYPE_META[active.roomType]?.label}
                  &nbsp;·&nbsp; {fmt(active.checkInDate)} → {fmt(active.checkOutDate)}
                  <button className="rcb-seg-re-search" onClick={() => patchActive({ searched: false, availableRooms: [], selectedRoomIds: [], selectedRooms: [], selectedAmenityIds: [], amenityHours: {} })}>↺ Re-search</button>
                </p>
                {active.availableRooms.length === 0 ? (
                  <p className="rcb-modal-empty">No rooms available for selected dates.</p>
                ) : (
                  <div className="rcb-room-picker">
                    {active.availableRooms.map(r => {
                      const roomAmenities = (r.amenities || []).filter(a => typeof a === 'object');
                      return (
                        <button key={r._id} className={`rcb-room-chip ${active.selectedRoomIds.includes(r._id) ? 'selected' : ''}`} onClick={() => toggleRoom(r)}>
                          <span className="rcb-room-chip-num">#{r.roomNumber}</span>
                          <span className="rcb-room-chip-floor">Floor {r.floor}</span>
                          <span className="rcb-room-chip-price">${r.pricePerNight}/night</span>
                          {roomAmenities.length > 0 && (
                            <span className="rcb-room-chip-amenities">
                              {roomAmenities.slice(0, 3).map(a => (
                                <span key={a._id} title={a.label}>{a.icon || '✦'}</span>
                              ))}
                              {roomAmenities.length > 3 && <span>+{roomAmenities.length - 3}</span>}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
                {active.selectedRoomIds.length > 0 && calcNightsFor(active) > 0 && (
                  <div className="rcb-price-preview" style={{ marginTop: 10 }}>
                    <CreditCard size={14}/>
                    <span>
                      Room subtotal: <strong>${active.selectedRooms.reduce((s, r) => s + (r.pricePerNight || 0) * calcNightsFor(active), 0).toLocaleString()}</strong>
                      {' '}({calcNightsFor(active)} nights × {active.selectedRoomIds.length} room{active.selectedRoomIds.length > 1 ? 's' : ''}
                      {active.selectedRooms.length > 0 && ` · ${roomRateLabel(active)}`})
                    </span>
                  </div>
                )}

                {/* Built-in room amenities */}
                {active.selectedRoomIds.length > 0 && builtInAmenities.length > 0 && (
                  <div className="rcb-builtin-amenities" style={{ marginTop: 12 }}>
                    <div className="rcb-builtin-amenities-label">
                      <CheckCircle size={12} style={{ color: '#3a7a50' }}/> Included with selected room{active.selectedRoomIds.length > 1 ? 's' : ''}:
                    </div>
                    <div className="rcb-builtin-amenities-list">
                      {builtInAmenities.map(a => (
                        <span key={a._id} className="rcb-builtin-amenity-chip">
                          {a.icon || '✦'} {a.label}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Optional Add-on Amenities */}
            {active.selectedRoomIds.length > 0 && addOnAmenities.length > 0 && (
              <div style={{ marginTop: 16 }}>
                <div className="rcb-modal-section-title" style={{ marginBottom: 8 }}>
                  Optional Add-on Amenities
                  <span className="rcb-addon-subtitle"> — not included with your selected room{active.selectedRoomIds.length > 1 ? 's' : ''}</span>
                </div>
                <div className="rcb-amenity-picker">
                  {addOnAmenities.map(amenity => {
                    const nid      = normalizeId(amenity._id);
                    const isActive = active.selectedAmenityIds.map(normalizeId).includes(nid);
                    const model    = inferPricingModel(amenity);
                    const isFree   = amenity.price === 0;
                    return (
                      <div key={amenity._id} className={`rcb-amenity-chip-wrap ${isActive ? 'selected' : ''}`}>
                        <button
                          type="button"
                          className={`rcb-amenity-chip-btn ${isActive ? 'selected' : ''}`}
                          onClick={() => toggleAmenity(amenity._id)}
                        >
                          <span className="rcb-amenity-icon">{amenity.icon || '✦'}</span>
                          <span className="rcb-amenity-label">{amenity.label}</span>
                          <span className={`rcb-amenity-price ${isFree ? 'rcb-amenity-price--free' : ''}`}>
                            {formatAmenityPrice(amenity)}
                          </span>
                          {isActive && <CheckCircle size={13} style={{ marginLeft: 'auto', color: '#3a7a50' }}/>}
                        </button>
                        {isActive && !isFree && model === 'hourly' && (
                          <div className="rcb-amenity-hours-row">
                            <label>Hours:</label>
                            <input
                              type="number" min="1" max="24"
                              value={active.amenityHours?.[nid] || 1}
                              onChange={e => patchActive({ amenityHours: { ...active.amenityHours, [nid]: +e.target.value } })}
                            />
                            <span>= ${amenity.price * (active.amenityHours?.[nid] || 1)}</span>
                          </div>
                        )}
                        {isActive && !isFree && model === 'daily' && (
                          <div className="rcb-amenity-daily-note">
                            {calcNightsFor(active)} days × ${amenity.price} = <strong>${amenity.price * calcNightsFor(active)}</strong>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {active.searched && active.selectedRoomIds.length === 0 && allAmenities.length > 0 && (
              <div className="rcb-amenity-placeholder" style={{ marginTop: 16 }}>
                <span>Select a room above to see available add-on amenities.</span>
              </div>
            )}

            {active.selectedRoomIds.length > 0 && addOnAmenities.length === 0 && allAmenities.length > 0 && (
              <div className="rcb-amenity-placeholder" style={{ marginTop: 16 }}>
                <CheckCircle size={13} style={{ color: '#3a7a50', marginRight: 6 }}/>
                <span>All available amenities are already included with the selected room{active.selectedRoomIds.length > 1 ? 's' : ''}.</span>
              </div>
            )}
          </div>

          <div className="rcb-rooms-action-row">
            <button className="rcb-modal-btn rcb-modal-btn--secondary" onClick={() => { setStep('guest'); setConfirmed([]); setActive(mkBooking()); }}>
              ← Back
            </button>
            <div className="rcb-rooms-action-right">
              <button
                className="rcb-add-another-btn"
                onClick={handleAddAnother}
                disabled={active.selectedRoomIds.length === 0}
              >
                <PlusCircle size={15}/> Add Another Booking
              </button>
              <button
                className="rcb-modal-btn rcb-modal-btn--primary"
                onClick={handleReviewAll}
                disabled={active.selectedRoomIds.length === 0}
              >
                <Eye size={14}/> Review &amp; Confirm
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // ══ STEP: summary ══
  if (step === 'summary') return (
    <div className="rcb-modal-overlay" onClick={onClose}>
      <div className="rcb-modal rcb-modal--wide" onClick={e => e.stopPropagation()}>
        <div className="rcb-modal-header">
          <div>
            <h2 className="rcb-modal-title">Booking Summary</h2>
            <p className="rcb-modal-conf">
              {guestInfo.guestName} · {confirmed.length} booking{confirmed.length > 1 ? 's' : ''} · ${grandTotal.toLocaleString()} total
            </p>
          </div>
          <button className="rcb-modal-close" onClick={onClose}><X size={18}/></button>
        </div>

        {globalError && <div className="rcb-modal-error">{globalError}</div>}

        <div className="rcb-modal-body">
          <StepBar current="summary"/>

          <div className="rcb-summary-guest-card">
            <div className="rcb-summary-guest-avatar">{guestInfo.guestName.charAt(0).toUpperCase()}</div>
            <div className="rcb-summary-guest-info">
              <p className="rcb-summary-guest-name">{guestInfo.guestName}</p>
              <p className="rcb-summary-guest-sub">{guestInfo.email} · {guestInfo.phone}</p>
            </div>
            <span className="rcb-summary-count-pill">
              {confirmed.length} booking{confirmed.length > 1 ? 's' : ''}
            </span>
          </div>

          <div className="rcb-summary-bookings">
            {confirmed.map((b, i) => {
              const nights  = calcNightsFor(b);
              const total   = bookingSubtotal(b, allAmenities);
              const typMeta = ROOM_TYPE_META[b.roomType] || { label: b.roomType, cls: '' };
              const amenBreakdown = (b.selectedAmenityIds || []).map(aid => {
                const nid = normalizeId(aid);
                const am = allAmenities.find(a => normalizeId(a._id) === nid);
                if (!am) return null;
                const model  = inferPricingModel(am);
                const isFree = am.price === 0;
                const qty    = model === 'hourly' ? (b.amenityHours?.[nid] || 0) : model === 'daily' ? nights : 1;
                return {
                  label:    am.label,
                  qty,
                  unit:     model === 'hourly' ? 'hrs' : model === 'daily' ? 'days' : 'flat',
                  subtotal: am.price * qty,
                  isFree,
                };
              }).filter(Boolean);

              const bBookingBuiltIn   = getRoomBuiltInAmenityIds(b.selectedRooms);
              const bBuiltInAmenities = allAmenities.filter(a => bBookingBuiltIn.has(String(a._id)));

              return (
                <div key={b.id} className="rcb-summary-booking-card">
                  <div className="rcb-summary-booking-header">
                    <div className="rcb-summary-booking-title">
                      <span className="rcb-summary-booking-num">Booking {i + 1}</span>
                      <span className={`rcb-type-badge ${typMeta.cls}`}>{typMeta.label}</span>
                    </div>
                    {confirmed.length > 1 && (
                      <button className="rcb-summary-remove" onClick={() => removeConfirmed(b.id)}>
                        <Trash2 size={13}/> Remove
                      </button>
                    )}
                  </div>

                  <div className="rcb-summary-booking-grid">
                    <div className="rcb-summary-field rcb-summary-field--full">
                      <span className="rcb-summary-label">Rooms</span>
                      <span className="rcb-summary-value">
                        <div className="rcb-summary-rooms">
                          {b.selectedRooms.map(r => (
                            <span key={r._id} className="rcb-summary-room-chip">
                              #{r.roomNumber} <em>F{r.floor}</em>
                              <em> · ${r.pricePerNight}/night</em>
                            </span>
                          ))}
                        </div>
                      </span>
                    </div>
                    <div className="rcb-summary-field">
                      <span className="rcb-summary-label">Check-in</span>
                      <span className="rcb-summary-value">{fmt(b.checkInDate)}</span>
                    </div>
                    <div className="rcb-summary-field">
                      <span className="rcb-summary-label">Check-out</span>
                      <span className="rcb-summary-value">{fmt(b.checkOutDate)}</span>
                    </div>
                    <div className="rcb-summary-field">
                      <span className="rcb-summary-label">Arrival Time</span>
                      <span className="rcb-summary-value">
                        {b.checkInTime ? formatTimeDisplay(b.checkInTime) : <em style={{ color: '#9a9088', fontWeight: 400 }}>No preference</em>}
                      </span>
                    </div>
                    <div className="rcb-summary-field">
                      <span className="rcb-summary-label">Duration</span>
                      <span className="rcb-summary-value">{nights} night{nights !== 1 ? 's' : ''}</span>
                    </div>
                    <div className="rcb-summary-field">
                      <span className="rcb-summary-label">Guests</span>
                      <span className="rcb-summary-value">{b.numberOfGuests}</span>
                    </div>
                    <div className="rcb-summary-field">
                      <span className="rcb-summary-label">Rate</span>
                      <span className="rcb-summary-value">{roomRateLabel(b)}</span>
                    </div>
                    {bBuiltInAmenities.length > 0 && (
                      <div className="rcb-summary-field rcb-summary-field--full">
                        <span className="rcb-summary-label">Included</span>
                        <span className="rcb-summary-value">
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                            {bBuiltInAmenities.map(a => (
                              <span key={a._id} className="rcb-summary-room-chip rcb-summary-room-chip--included">
                                {a.icon || '✦'} {a.label} <em style={{ color: '#3a7a50' }}>included</em>
                              </span>
                            ))}
                          </div>
                        </span>
                      </div>
                    )}
                    {amenBreakdown.length > 0 && (
                      <div className="rcb-summary-field rcb-summary-field--full">
                        <span className="rcb-summary-label">Add-ons</span>
                        <span className="rcb-summary-value">
                          {amenBreakdown.map((item, idx) => (
                            <span key={idx} className="rcb-summary-room-chip">
                              {item.isFree
                                ? <>{item.label} · <em style={{ color: '#3a7a50' }}>FREE</em></>
                                : <>{item.label} · {item.qty} {item.unit} · ${item.subtotal}</>
                              }
                            </span>
                          ))}
                        </span>
                      </div>
                    )}
                    {b.specialRequests && (
                      <div className="rcb-summary-field rcb-summary-field--full">
                        <span className="rcb-summary-label">Special Requests</span>
                        <span className="rcb-summary-value">{b.specialRequests}</span>
                      </div>
                    )}
                  </div>

                  <div className="rcb-summary-booking-total">
                    <span>
                      {b.selectedRooms.map(r => `#${r.roomNumber} $${r.pricePerNight}`).join(' + ')}
                      {' '}× {nights} night{nights !== 1 ? 's' : ''}
                    </span>
                    <strong>${total.toLocaleString()}</strong>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="rcb-grand-total">
            <div>
              <p className="rcb-grand-total-label">Grand Total</p>
              <p className="rcb-grand-total-sub">
                {confirmed.length} booking{confirmed.length > 1 ? 's' : ''} · {confirmed.reduce((s, b) => s + b.selectedRoomIds.length, 0)} room{confirmed.reduce((s, b) => s + b.selectedRoomIds.length, 0) > 1 ? 's' : ''}
              </p>
            </div>
            <strong className="rcb-grand-total-amount">${grandTotal.toLocaleString()}</strong>
          </div>

          <div className="rcb-modal-footer">
            <button
              className="rcb-modal-btn rcb-modal-btn--secondary"
              onClick={() => {
                const last = confirmed[confirmed.length - 1];
                setConfirmed(prev => prev.slice(0, -1));
                setActive(last || mkBooking());
                setStep('rooms');
              }}
            >
              ← Edit Bookings
            </button>
            <button
              className="rcb-modal-btn rcb-modal-btn--primary"
              onClick={handleSubmit}
              disabled={submitting || confirmed.length === 0}
            >
              {submitting ? 'Creating…' : confirmed.length > 1 ? `Confirm ${confirmed.length} Bookings` : 'Confirm Booking'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return null;
};

// ═══════════════════════════════════════════════════════════════════
// BOOKING DETAIL MODAL
// ═══════════════════════════════════════════════════════════════════
const BookingDetailModal = ({ booking, onClose, onUpdated, allAmenities, hotelCheckInTime }) => {
  const [mode, setMode]       = useState('view');
  const [loading, setLoading] = useState('');
  const [error, setError]     = useState('');
  const [success, setSuccess] = useState('');

  const timeSlots = buildTimeSlots(hotelCheckInTime);

  // Normalize paidAmenities IDs to plain strings on init so comparisons work correctly.
  const initialAmenityIds = (booking.paidAmenities || []).map(normalizeId);

  // Normalize amenityHours keys to plain strings
  const normalizeAmenityHours = (raw) => {
    const normalized = {};
    Object.entries(raw || {}).forEach(([k, v]) => {
      normalized[normalizeId(k)] = v;
    });
    return normalized;
  };

  const initialAmenityHours = normalizeAmenityHours(booking.amenityHours);

  const [editForm, setEditForm] = useState({
    guestName:       booking.guestName       || '',
    email:           booking.email           || '',
    phone:           booking.phone           || '',
    checkInDate:     toInputDate(booking.checkInDate),
    checkOutDate:    toInputDate(booking.checkOutDate),
    checkInTime:     booking.checkInTime      || '',
    numberOfGuests:  booking.numberOfGuests  || 1,
    specialRequests: booking.specialRequests || '',
    status:          booking.status          || 'pending',
    paymentStatus:   booking.paymentStatus   || 'pending',
    roomType:        booking.roomType        || 'deluxe',
  });

  const [availableRooms, setAvailableRooms]   = useState([]);

  // ── FIX: Store selected rooms WITH full price data.
  // booking.roomIds from GET /api/reservations is populated with {roomNumber, roomType, floor}
  // but NOT pricePerNight. We need to fetch room details to get pricePerNight for price calc.
  // We keep the original populated rooms for display, and fetch full room details on search.
  const [selectedRooms, setSelectedRooms]     = useState(
    booking.roomIds?.map(r => (typeof r === 'object' ? r : { _id: r })) || []
  );
  // ── FIX: Track the original room price per night separately so we can compute
  // the correct base price even before the user searches for new rooms.
  // We derive it: totalPrice - sum(paidAmenities costs) = room base cost
  // But since we don't have individual room prices from the populated data, we
  // fetch room details when the modal opens so computeTotalPrice works correctly.
  const [roomPriceMap, setRoomPriceMap]       = useState({}); // { roomId: pricePerNight }
  const [roomPricesLoaded, setRoomPricesLoaded] = useState(false);

  const [roomSearching, setRoomSearching]     = useState(false);
  const [roomSearched, setRoomSearched]       = useState(false);

  const [selectedAmenityIds, setSelectedAmenityIds] = useState(initialAmenityIds);
  const [amenityHours, setAmenityHours]             = useState(initialAmenityHours);

  // ── FIX: Fetch full room details (including pricePerNight) when modal opens ──
  // This ensures computeTotalPrice can correctly calculate room costs
  // without falling back to booking.totalPrice (which would cause double-counting).
  useEffect(() => {
    const fetchRoomPrices = async () => {
      if (!booking.roomIds || booking.roomIds.length === 0) {
        setRoomPricesLoaded(true);
        return;
      }
      try {
        const token = localStorage.getItem('token');
        const roomIds = booking.roomIds.map(r => (typeof r === 'object' ? r._id : r));
        const responses = await Promise.all(
          roomIds.map(id =>
            axios.get(`${API}/rooms/${id}`, { headers: { Authorization: `Bearer ${token}` } })
          )
        );
        const priceMap = {};
        responses.forEach(res => {
          const room = res.data?.data;
          if (room) priceMap[String(room._id)] = room.pricePerNight;
        });
        setRoomPriceMap(priceMap);
        // Also update selectedRooms to include pricePerNight
        setSelectedRooms(prev => prev.map(r => {
          const rid = String(r._id || r);
          return priceMap[rid] ? { ...r, pricePerNight: priceMap[rid] } : r;
        }));
      } catch (e) {
        console.error('Failed to fetch room prices:', e);
      } finally {
        setRoomPricesLoaded(true);
      }
    };
    fetchRoomPrices();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const editAddOnAmenities   = getAddOnAmenities(allAmenities, selectedRooms);
  const editBuiltInIds       = getRoomBuiltInAmenityIds(selectedRooms);
  const editBuiltInAmenities = allAmenities.filter(a => editBuiltInIds.has(String(a._id)));

  const selectedRoomIds = selectedRooms.map(r => r._id || r);

  const searchAvailableRooms = async () => {
    if (!editForm.checkInDate || !editForm.checkOutDate || !editForm.roomType) return;
    setRoomSearching(true); setError('');
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API}/reservations/available`, {
        params: { roomType: editForm.roomType, checkInDate: editForm.checkInDate, checkOutDate: editForm.checkOutDate },
        headers: { Authorization: `Bearer ${token}` },
      });
      setAvailableRooms(res.data.data || []);
      setRoomSearched(true);
    } catch { setError('Failed to fetch available rooms'); }
    finally { setRoomSearching(false); }
  };

  const toggleRoom = (room) => {
    setSelectedRooms(prev => {
      const already = prev.some(r => (r._id || r) === (room._id || room));
      const newRooms = already ? prev.filter(r => (r._id || r) !== (room._id || room)) : [...prev, room];
      const newBuiltIn = getRoomBuiltInAmenityIds(newRooms);
      setSelectedAmenityIds(ids => ids.filter(id => !newBuiltIn.has(normalizeId(id))));
      setAmenityHours(h => Object.fromEntries(Object.entries(h).filter(([k]) => !newBuiltIn.has(k))));
      // Update roomPriceMap with new room's price
      if (!already && room.pricePerNight) {
        setRoomPriceMap(prev => ({ ...prev, [String(room._id)]: room.pricePerNight }));
      }
      return newRooms;
    });
  };

  const revertRooms = () => {
    setRoomSearched(false);
    const originalRooms = booking.roomIds?.map(r => (typeof r === 'object' ? r : { _id: r })) || [];
    // Re-apply pricePerNight from our fetched price map
    setSelectedRooms(originalRooms.map(r => {
      const rid = String(r._id || r);
      return roomPriceMap[rid] ? { ...r, pricePerNight: roomPriceMap[rid] } : r;
    }));
    setAvailableRooms([]);
    setSelectedAmenityIds(initialAmenityIds);
    setAmenityHours(initialAmenityHours);
  };

  const toggleAmenityEdit = (amenityId) => {
    const nid     = normalizeId(amenityId);
    const amenity = allAmenities.find(a => normalizeId(a._id) === nid);
    const model   = amenity ? inferPricingModel(amenity) : 'flat';
    setSelectedAmenityIds(prev => {
      const already = prev.map(normalizeId).includes(nid);
      if (!already && model === 'hourly') setAmenityHours(h => ({ ...h, [nid]: 1 }));
      if (already) setAmenityHours(h => { const nh = { ...h }; delete nh[nid]; return nh; });
      return already ? prev.filter(id => normalizeId(id) !== nid) : [...prev, nid];
    });
  };

  const calcNightsEdit = () => {
    if (!editForm.checkInDate || !editForm.checkOutDate) return 0;
    return Math.max(0, Math.round((new Date(editForm.checkOutDate) - new Date(editForm.checkInDate)) / 86400000));
  };

  // ── FIX: computeTotalPrice — always calculates from room prices + amenity costs.
  // Never falls back to booking.totalPrice to avoid double-counting.
  // Uses roomPriceMap (fetched on mount) when selectedRooms don't have pricePerNight.
  const computeTotalPrice = () => {
    const nights = calcNightsEdit();

    // Calculate room total: prefer pricePerNight on the room object,
    // fall back to roomPriceMap fetched on modal open.
    let roomTotal = 0;
    if (nights && selectedRooms.length > 0) {
      roomTotal = selectedRooms.reduce((sum, r) => {
        const rid = String(r._id || r);
        const price = r.pricePerNight ?? roomPriceMap[rid] ?? 0;
        return sum + price * nights;
      }, 0);
    }

    // Calculate amenity total from scratch based on current selections
    let amenityTotal = 0;
    selectedAmenityIds.forEach(aid => {
      const nid = normalizeId(aid);
      const am = allAmenities.find(a => normalizeId(a._id) === nid);
      if (!am) return;
      const model = inferPricingModel(am);
      if (model === 'hourly')      amenityTotal += am.price * (amenityHours[nid] || 0);
      else if (model === 'daily')  amenityTotal += am.price * nights;
      else                         amenityTotal += am.price;
    });

    return roomTotal + amenityTotal;
  };

  const updateStatus = async (status) => {
    setLoading(status); setError('');
    try {
      const token = localStorage.getItem('token');
      await axios.put(`${API}/reservations/${booking._id}`, { status }, { headers: { Authorization: `Bearer ${token}` } });
      onUpdated(); onClose();
    } catch (e) { setError(e.response?.data?.message || 'Update failed'); }
    finally { setLoading(''); }
  };

  const saveEdit = async () => {
    if (!editForm.guestName || !editForm.email || !editForm.phone) { setError('Guest name, email and phone are required.'); return; }
    if (selectedRoomIds.length === 0) { setError('At least one room must be selected.'); return; }

    if (editForm.checkInTime && hotelCheckInTime) {
      if (timeToMinutes(editForm.checkInTime) < timeToMinutes(hotelCheckInTime)) {
        setError(`Check-in time cannot be earlier than the hotel's check-in time (${formatTimeDisplay(hotelCheckInTime)})`);
        return;
      }
    }

    setLoading('save'); setError(''); setSuccess('');
    try {
      const token = localStorage.getItem('token');
      await axios.put(`${API}/reservations/${booking._id}`, {
        guestName: editForm.guestName, email: editForm.email, phone: editForm.phone,
        checkInDate: editForm.checkInDate, checkOutDate: editForm.checkOutDate,
        checkInTime: editForm.checkInTime || null,
        numberOfGuests: Number(editForm.numberOfGuests), specialRequests: editForm.specialRequests,
        status: editForm.status, paymentStatus: editForm.paymentStatus,
        roomType: editForm.roomType, roomIds: selectedRoomIds,
        numberOfRooms: selectedRoomIds.length,
        // Send normalized plain string IDs so DB stores them correctly
        paidAmenities: selectedAmenityIds.map(normalizeId),
        amenityHours,
        totalPrice: computeTotalPrice(),
      }, { headers: { Authorization: `Bearer ${token}` } });
      setSuccess('Booking updated successfully.');
      setTimeout(() => { onUpdated(); onClose(); }, 900);
    } catch (e) { setError(e.response?.data?.message || 'Failed to save changes.'); }
    finally { setLoading(''); }
  };

  const confirmDelete = async () => {
    setLoading('delete'); setError('');
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API}/reservations/${booking._id}`, { headers: { Authorization: `Bearer ${token}` } });
      onUpdated(); onClose();
    } catch (e) { setError(e.response?.data?.message || 'Delete failed'); }
    finally { setLoading(''); }
  };

  const meta    = STATUS_META[booking.status]      || STATUS_META.pending;
  const typMeta = ROOM_TYPE_META[booking.roomType] || { label: booking.roomType, cls: '' };

  return (
    <div className="rcb-modal-overlay" onClick={onClose}>
      <div className="rcb-modal rcb-modal--detail" onClick={e => e.stopPropagation()}>
        <div className="rcb-modal-header">
          <div>
            <h2 className="rcb-modal-title">{booking.guestName}</h2>
            <p className="rcb-modal-conf">#{booking.confirmationNumber}</p>
          </div>
          <div className="rcb-detail-header-actions">
            <button className={`rcb-icon-btn ${mode === 'edit' ? 'rcb-icon-btn--active-edit' : ''}`} onClick={() => { setMode(m => m === 'edit' ? 'view' : 'edit'); setError(''); setSuccess(''); revertRooms(); }} title="Edit"><Pencil size={15}/></button>
            <button className={`rcb-icon-btn rcb-icon-btn--danger ${mode === 'delete' ? 'rcb-icon-btn--active-delete' : ''}`} onClick={() => { setMode(m => m === 'delete' ? 'view' : 'delete'); setError(''); }} title="Delete"><Trash2 size={15}/></button>
            <button className="rcb-modal-close" onClick={onClose}><X size={18}/></button>
          </div>
        </div>

        {error   && <div className="rcb-modal-error">{error}</div>}
        {success && <div className="rcb-modal-success">{success}</div>}

        {/* ── VIEW MODE ── */}
        {mode === 'view' && (
          <div className="rcb-modal-body">
            <div className="rcb-detail-badges">
              <span className={`rcb-type-badge ${typMeta.cls}`}>{typMeta.label}</span>
              <span className={`rcb-status-pill ${meta.cls}`}><meta.Icon size={12}/>{meta.label}</span>
            </div>
            <div className="rcb-detail-grid">
              <div className="rcb-detail-item"><span className="rcb-dl">Email</span><span className="rcb-dv">{booking.email}</span></div>
              <div className="rcb-detail-item"><span className="rcb-dl">Phone</span><span className="rcb-dv">{booking.phone}</span></div>
              <div className="rcb-detail-item"><span className="rcb-dl">Check-in</span><span className="rcb-dv">{fmt(booking.checkInDate)}</span></div>
              <div className="rcb-detail-item"><span className="rcb-dl">Check-out</span><span className="rcb-dv">{fmt(booking.checkOutDate)}</span></div>
              <div className="rcb-detail-item">
                <span className="rcb-dl">Arrival Time</span>
                <span className="rcb-dv">
                  {booking.checkInTime
                    ? <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><Clock size={13} style={{ color: '#c9a96e' }}/>{formatTimeDisplay(booking.checkInTime)}</span>
                    : <span style={{ color: '#9a9088', fontStyle: 'italic', fontWeight: 400 }}>No preference</span>
                  }
                </span>
              </div>
              <div className="rcb-detail-item"><span className="rcb-dl">Rooms</span><span className="rcb-dv">{booking.roomIds?.map(r => `#${r.roomNumber}`).join(', ') || '—'}</span></div>
              <div className="rcb-detail-item"><span className="rcb-dl">Guests</span><span className="rcb-dv">{booking.numberOfGuests}</span></div>
              <div className="rcb-detail-item"><span className="rcb-dl">Total Price</span><span className="rcb-dv rcb-dv--price">${booking.totalPrice?.toLocaleString()}</span></div>
              <div className="rcb-detail-item"><span className="rcb-dl">Payment</span><span className="rcb-dv">{PAYMENT_META[booking.paymentStatus] || booking.paymentStatus}</span></div>
              {(booking.paidAmenities || []).length > 0 && (
                <div className="rcb-detail-item rcb-detail-item--full">
                  <span className="rcb-dl">Add-on Amenities</span>
                  <span className="rcb-dv">
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                      {(booking.paidAmenities || []).map(aid => {
                        const nid = normalizeId(aid);
                        const am = allAmenities.find(a => normalizeId(a._id) === nid);
                        return am ? (
                          <span key={nid} className="rcb-summary-room-chip">
                            {am.icon || '✦'} {am.label}
                            {am.price === 0 && <em style={{ color: '#3a7a50', marginLeft: 4 }}>FREE</em>}
                          </span>
                        ) : null;
                      })}
                    </div>
                  </span>
                </div>
              )}
              {booking.specialRequests && <div className="rcb-detail-item rcb-detail-item--full"><span className="rcb-dl">Special Requests</span><span className="rcb-dv">{booking.specialRequests}</span></div>}
            </div>
            <div className="rcb-detail-actions">
              {booking.status === 'pending'    && <button className="rcb-act rcb-act--confirm"  onClick={() => updateStatus('confirmed')}   disabled={loading === 'confirmed'  }><CheckCircle size={15}/>{loading === 'confirmed'   ? 'Confirming…' : 'Confirm'  }</button>}
              {booking.status === 'confirmed'  && <button className="rcb-act rcb-act--checkin"  onClick={() => updateStatus('checked-in')}  disabled={loading === 'checked-in' }><LogIn  size={15}/>{loading === 'checked-in'  ? 'Processing…' : 'Check In' }</button>}
              {booking.status === 'checked-in' && <button className="rcb-act rcb-act--checkout" onClick={() => updateStatus('checked-out')} disabled={loading === 'checked-out'}><LogOut size={15}/>{loading === 'checked-out' ? 'Processing…' : 'Check Out'}</button>}
            </div>
          </div>
        )}

        {/* ── EDIT MODE ── */}
        {mode === 'edit' && (
          <div className="rcb-modal-body">
            <div className="rcb-modal-section-title"><Pencil size={12}/> Edit Booking Details</div>
            <div className="rcb-form-grid">
              <div className="rcb-field"><label><User size={13}/> Guest Name</label><input value={editForm.guestName} onChange={e => setEditForm({...editForm, guestName: e.target.value})} placeholder="Full name"/></div>
              <div className="rcb-field"><label><Mail size={13}/> Email</label><input type="email" value={editForm.email} onChange={e => setEditForm({...editForm, email: e.target.value})} placeholder="email@example.com"/></div>
              <div className="rcb-field"><label><Phone size={13}/> Phone</label><input value={editForm.phone} onChange={e => setEditForm({...editForm, phone: e.target.value})} placeholder="+1 234 567 890"/></div>
              <div className="rcb-field"><label><Users size={13}/> No. of Guests</label><input type="number" min="1" max="20" value={editForm.numberOfGuests} onChange={e => setEditForm({...editForm, numberOfGuests: e.target.value})}/></div>
              <div className="rcb-field"><label><Calendar size={13}/> Check-in Date</label><input type="date" value={editForm.checkInDate} onChange={e => { setEditForm({...editForm, checkInDate: e.target.value}); setRoomSearched(false); setSelectedRooms(booking.roomIds?.map(r => (typeof r === 'object' ? r : { _id: r })) || []); }}/></div>
              <div className="rcb-field"><label><Calendar size={13}/> Check-out Date</label><input type="date" value={editForm.checkOutDate} onChange={e => { setEditForm({...editForm, checkOutDate: e.target.value}); setRoomSearched(false); setSelectedRooms(booking.roomIds?.map(r => (typeof r === 'object' ? r : { _id: r })) || []); }}/></div>
              <CheckInTimeField
                value={editForm.checkInTime}
                onChange={(val) => setEditForm({ ...editForm, checkInTime: val })}
                timeSlots={timeSlots}
                hotelCheckInTime={hotelCheckInTime}
                label="Check-in Time"
              />
              <div className="rcb-field"><label><BedDouble size={13}/> Room Type</label><div className="rcb-select-wrap"><select value={editForm.roomType} onChange={e => { setEditForm({...editForm, roomType: e.target.value}); setRoomSearched(false); setSelectedRooms([]); setAvailableRooms([]); setSelectedAmenityIds([]); setAmenityHours({}); }}><option value="single">Single</option><option value="double">Double</option><option value="deluxe">Deluxe</option><option value="suite">Suite</option><option value="family">Family</option></select><ChevronDown size={14} className="rcb-select-chevron"/></div></div>
              <div className="rcb-field"><label>Booking Status</label><div className="rcb-select-wrap"><select value={editForm.status} onChange={e => setEditForm({...editForm, status: e.target.value})}><option value="pending">Pending</option><option value="confirmed">Confirmed</option><option value="checked-in">Checked In</option><option value="checked-out">Checked Out</option><option value="cancelled">Cancelled</option></select><ChevronDown size={14} className="rcb-select-chevron"/></div></div>
              <div className="rcb-field"><label><CreditCard size={13}/> Payment Status</label><div className="rcb-select-wrap"><select value={editForm.paymentStatus} onChange={e => setEditForm({...editForm, paymentStatus: e.target.value})}><option value="pending">Pending</option><option value="completed">Completed</option><option value="failed">Failed</option><option value="refunded">Refunded</option></select><ChevronDown size={14} className="rcb-select-chevron"/></div></div>
              <div className="rcb-field rcb-field--full"><label>Special Requests</label><textarea rows={3} value={editForm.specialRequests} onChange={e => setEditForm({...editForm, specialRequests: e.target.value})} placeholder="Any special requests…"/></div>
            </div>

            {/* Room picker */}
            <div className="rcb-room-edit-panel">
              <div className="rcb-modal-section-title" style={{ marginBottom: 10 }}><BedDouble size={12}/> Assigned Rooms</div>
              {!roomSearched ? (
                <div className="rcb-room-current">
                  <div className="rcb-room-current-label">Current rooms: <strong>{booking.roomIds?.map(r => `#${r.roomNumber}`).join(', ') || '—'}</strong> <span className="rcb-room-current-type">({ROOM_TYPE_META[booking.roomType]?.label || booking.roomType})</span></div>
                  <button type="button" className="rcb-room-search-btn" onClick={searchAvailableRooms} disabled={roomSearching || !editForm.checkInDate || !editForm.checkOutDate}>{roomSearching ? <><span className="rcb-btn-spinner"/>Searching…</> : <><Search size={13}/> Search Available Rooms</>}</button>
                  {(!editForm.checkInDate || !editForm.checkOutDate) && <p className="rcb-room-hint">Set check-in and check-out dates first.</p>}
                </div>
              ) : (
                <div>
                  <div className="rcb-room-search-meta">{availableRooms.length} room{availableRooms.length !== 1 ? 's' : ''} available &nbsp;·&nbsp; {ROOM_TYPE_META[editForm.roomType]?.label || editForm.roomType} &nbsp;·&nbsp; {fmt(editForm.checkInDate)} → {fmt(editForm.checkOutDate)}</div>
                  {availableRooms.length === 0 ? (
                    <p className="rcb-modal-empty">No rooms available for the selected dates &amp; type.</p>
                  ) : (
                    <div className="rcb-room-picker">
                      {availableRooms.map(r => (
                        <button key={r._id} type="button" className={`rcb-room-chip ${selectedRoomIds.includes(r._id) ? 'selected' : ''}`} onClick={() => toggleRoom(r)}>
                          <span className="rcb-room-chip-num">#{r.roomNumber}</span>
                          <span className="rcb-room-chip-floor">Floor {r.floor}</span>
                          <span className="rcb-room-chip-price">${r.pricePerNight}/night</span>
                          {(r.amenities || []).filter(a => typeof a === 'object').length > 0 && (
                            <span className="rcb-room-chip-amenities">
                              {(r.amenities || []).filter(a => typeof a === 'object').slice(0, 3).map(a => (
                                <span key={a._id} title={a.label}>{a.icon || '✦'}</span>
                              ))}
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                  {selectedRoomIds.length > 0 && calcNightsEdit() > 0 && (
                    <div className="rcb-price-preview" style={{ marginTop: 10 }}>
                      <CreditCard size={14}/>
                      <span>Room total: <strong>${selectedRooms.reduce((s, r) => {
                        const rid = String(r._id || r);
                        const price = r.pricePerNight ?? roomPriceMap[rid] ?? 0;
                        return s + price * calcNightsEdit();
                      }, 0).toLocaleString()}</strong></span>
                    </div>
                  )}
                  {selectedRooms.length > 0 && editBuiltInAmenities.length > 0 && (
                    <div className="rcb-builtin-amenities" style={{ marginTop: 10 }}>
                      <div className="rcb-builtin-amenities-label">
                        <CheckCircle size={12} style={{ color: '#3a7a50' }}/> Included with selected room{selectedRooms.length > 1 ? 's' : ''}:
                      </div>
                      <div className="rcb-builtin-amenities-list">
                        {editBuiltInAmenities.map(a => (
                          <span key={a._id} className="rcb-builtin-amenity-chip">
                            {a.icon || '✦'} {a.label}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  <button type="button" className="rcb-modal-btn rcb-modal-btn--secondary" style={{ fontSize: 12, padding: '7px 14px', marginTop: 10 }} onClick={revertRooms}>↩ Keep Original Rooms</button>
                </div>
              )}
            </div>

            {/* Add-on amenities in edit mode */}
            {editAddOnAmenities.length > 0 && (
              <div className="rcb-room-edit-panel">
                <div className="rcb-modal-section-title" style={{ marginBottom: 10 }}>
                  Optional Add-on Amenities
                  {editBuiltInAmenities.length > 0 && (
                    <span className="rcb-addon-subtitle"> — not included with selected rooms</span>
                  )}
                </div>
                <div className="rcb-amenity-picker">
                  {editAddOnAmenities.map(amenity => {
                    const nid      = normalizeId(amenity._id);
                    // Compare normalized IDs so previously selected amenities show as active
                    const isSelected = selectedAmenityIds.map(normalizeId).includes(nid);
                    const model    = inferPricingModel(amenity);
                    const isFree   = amenity.price === 0;
                    return (
                      <div key={amenity._id} className={`rcb-amenity-chip-wrap ${isSelected ? 'selected' : ''}`}>
                        <button
                          type="button"
                          className={`rcb-amenity-chip-btn ${isSelected ? 'selected' : ''}`}
                          onClick={() => toggleAmenityEdit(amenity._id)}
                        >
                          <span className="rcb-amenity-icon">{amenity.icon || '✦'}</span>
                          <span className="rcb-amenity-label">{amenity.label}</span>
                          <span className={`rcb-amenity-price ${isFree ? 'rcb-amenity-price--free' : ''}`}>
                            {formatAmenityPrice(amenity)}
                          </span>
                          {isSelected && <CheckCircle size={13} style={{ marginLeft: 'auto', color: '#3a7a50' }}/>}
                        </button>
                        {isSelected && !isFree && model === 'hourly' && (
                          <div className="rcb-amenity-hours-row">
                            <label>Hours:</label>
                            <input
                              type="number" min="1" max="24"
                              value={amenityHours[nid] || 1}
                              onChange={e => setAmenityHours(h => ({ ...h, [nid]: +e.target.value }))}
                            />
                            <span>= ${amenity.price * (amenityHours[nid] || 1)}</span>
                          </div>
                        )}
                        {isSelected && !isFree && model === 'daily' && (
                          <div className="rcb-amenity-daily-note">
                            {calcNightsEdit()} days × ${amenity.price} = <strong>${amenity.price * calcNightsEdit()}</strong>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                {/* ── FIX: Only show estimated total after room prices are loaded to avoid flicker ── */}
                {roomPricesLoaded && (
                  <div className="rcb-price-preview" style={{ marginTop: 10 }}>
                    <CreditCard size={14}/>
                    <span>New estimated total: <strong>${computeTotalPrice().toLocaleString()}</strong></span>
                  </div>
                )}
              </div>
            )}

            {editAddOnAmenities.length === 0 && allAmenities.length > 0 && selectedRooms.length > 0 && (
              <div className="rcb-room-edit-panel">
                <div className="rcb-amenity-placeholder">
                  <CheckCircle size={13} style={{ color: '#3a7a50', marginRight: 6 }}/>
                  <span>All available amenities are already included with the selected rooms.</span>
                </div>
              </div>
            )}

            <div className="rcb-modal-footer">
              <button className="rcb-modal-btn rcb-modal-btn--secondary" onClick={() => { setMode('view'); setError(''); revertRooms(); }}>Cancel</button>
              <button className="rcb-modal-btn rcb-modal-btn--save" onClick={saveEdit} disabled={loading === 'save'}><Save size={14}/>{loading === 'save' ? 'Saving…' : 'Save Changes'}</button>
            </div>
          </div>
        )}

        {/* ── DELETE MODE ── */}
        {mode === 'delete' && (
          <div className="rcb-modal-body">
            <div className="rcb-delete-confirm">
              <div className="rcb-delete-icon-wrap"><AlertTriangle size={28} className="rcb-delete-icon"/></div>
              {booking.status === 'cancelled' ? (
                <>
                  <h3 className="rcb-delete-heading">Permanently delete this record?</h3>
                  <p className="rcb-delete-desc">This cancelled booking for <strong>{booking.guestName}</strong> (#{booking.confirmationNumber}) will be <strong>permanently removed</strong> from the database. This action cannot be undone.</p>
                </>
              ) : (
                <>
                  <h3 className="rcb-delete-heading">Cancel this booking?</h3>
                  <p className="rcb-delete-desc">You're about to cancel the booking for <strong>{booking.guestName}</strong> (#{booking.confirmationNumber}). The guest and admins will be notified by email. This action cannot be undone.</p>
                </>
              )}
              <div className="rcb-delete-meta">
                <span>{fmt(booking.checkInDate)} → {fmt(booking.checkOutDate)}</span>
                <span>{booking.roomIds?.map(r => `#${r.roomNumber}`).join(', ') || '—'}</span>
              </div>
              <div className="rcb-delete-actions">
                <button className="rcb-modal-btn rcb-modal-btn--secondary" onClick={() => { setMode('view'); setError(''); }}>Keep Booking</button>
                <button className="rcb-modal-btn rcb-modal-btn--delete" onClick={confirmDelete} disabled={loading === 'delete'}>
                  <Trash2 size={14}/>
                  {loading === 'delete' ? 'Deleting…' : booking.status === 'cancelled' ? 'Yes, Delete Permanently' : 'Yes, Cancel Booking'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════
const ReceptionistBookings = () => {
  const [reservations, setReservations]   = useState([]);
  const [loading, setLoading]             = useState(true);
  const [selectedDate, setSelectedDate]   = useState(new Date());
  const [filterStatus, setFilterStatus]   = useState('all');
  const [search, setSearch]               = useState('');
  const [days]                            = useState(buildDays);
  const [dateScrollIdx, setDateScrollIdx] = useState(0);
  const [showNewModal, setShowNewModal]   = useState(false);
  const [detailBooking, setDetailBooking] = useState(null);

  const [allAmenities, setAllAmenities]         = useState([]);
  const [amenitiesLoading, setAmenitiesLoading] = useState(true);
  const [hotelCheckInTime, setHotelCheckInTime] = useState('14:00');
  const [hotelCheckOutTime, setHotelCheckOutTime] = useState('12:00');

  useEffect(() => {
    (async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get(`${API}/hotel`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const hotel = res.data?.data;
        if (hotel?.checkInTime)  setHotelCheckInTime(hotel.checkInTime);
        if (hotel?.checkOutTime) setHotelCheckOutTime(hotel.checkOutTime);
      } catch {
        // fallback to defaults
      }
    })();
  }, []);

  useEffect(() => {
    const fetchAmenities = async () => {
      setAmenitiesLoading(true);
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get(`${API}/amenities?active=true`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setAllAmenities(res.data?.data ?? []);
      } catch {
        setAllAmenities([]);
      } finally {
        setAmenitiesLoading(false);
      }
    };
    fetchAmenities();
  }, []);

  const fetchReservations = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API}/reservations`, { headers: { Authorization: `Bearer ${token}` } });
      setReservations(res.data.data || []);
    } catch (e) { console.error('Failed to fetch reservations', e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchReservations(); }, [fetchReservations]);

  const selDate = new Date(selectedDate); selDate.setHours(0,0,0,0);
  const nextDay = new Date(selDate); nextDay.setDate(selDate.getDate() + 1);

  const stats = {
    inHouse:   reservations.filter(r => r.status === 'checked-in').length,
    freeRooms: 20 - reservations.filter(r => ['confirmed','checked-in'].includes(r.status)).length,
    checkIns:  reservations.filter(r => { const d = new Date(r.checkInDate); return d >= selDate && d < nextDay; }).length,
    checkOuts: reservations.filter(r => { const d = new Date(r.checkOutDate); return d >= selDate && d < nextDay; }).length,
    staying:   reservations.filter(r => r.status === 'checked-in').length,
  };

  const todayMidnight = new Date(); todayMidnight.setHours(0,0,0,0);
  const isTodaySelected = selDate.getTime() === todayMidnight.getTime();

  const isRelevantToDate = (r) => {
    const ci = new Date(r.checkInDate); ci.setHours(0,0,0,0);
    const co = new Date(r.checkOutDate); co.setHours(0,0,0,0);
    return ci.getTime() === selDate.getTime() || co.getTime() === selDate.getTime() || (ci <= selDate && selDate < co);
  };

  const filtered = reservations.filter(r => {
    const matchDate   = isTodaySelected ? true : isRelevantToDate(r);
    const matchStatus = filterStatus === 'all' || r.status === filterStatus;
    const q = search.toLowerCase();
    const matchSearch = !q || r.guestName?.toLowerCase().includes(q) || r.email?.toLowerCase().includes(q) || r.confirmationNumber?.toLowerCase().includes(q) || r.roomIds?.some(rm => String(rm.roomNumber).includes(q));
    return matchDate && matchStatus && matchSearch;
  });

  const buildDateGroups = () => {
    if (isTodaySelected) {
      return {
        groups: {
          'checked-in':  filtered.filter(r => r.status === 'checked-in'),
          'confirmed':   filtered.filter(r => r.status === 'confirmed'),
          'pending':     filtered.filter(r => r.status === 'pending'),
          'checked-out': filtered.filter(r => r.status === 'checked-out'),
          'cancelled':   filtered.filter(r => r.status === 'cancelled'),
        },
        labels: { 'checked-in': 'Staying', 'confirmed': 'Arriving Soon', 'pending': 'Pending Confirmation', 'checked-out': 'Checked Out', 'cancelled': 'Cancelled' },
      };
    }
    const ci_fn = r => { const ci = new Date(r.checkInDate); ci.setHours(0,0,0,0); return ci; };
    const co_fn = r => { const co = new Date(r.checkOutDate); co.setHours(0,0,0,0); return co; };
    return {
      groups: {
        'checking-in':  filtered.filter(r => ci_fn(r).getTime() === selDate.getTime()),
        'checking-out': filtered.filter(r => co_fn(r).getTime() === selDate.getTime()),
        'staying':      filtered.filter(r => ci_fn(r).getTime() !== selDate.getTime() && co_fn(r).getTime() !== selDate.getTime()),
      },
      labels: {
        'checking-in':  `Checking In on ${selDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`,
        'checking-out': `Checking Out on ${selDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`,
        'staying':      'Staying',
      },
    };
  };

  const { groups, labels: GROUP_LABELS } = buildDateGroups();
  const visibleDays = days.slice(dateScrollIdx, dateScrollIdx + 11);

  return (
    <div className="rcb-page">
      <div className="rcb-date-strip">
        <button className="rcb-date-nav" onClick={() => setDateScrollIdx(i => Math.max(0, i - 1))} disabled={dateScrollIdx === 0}><ChevronLeft size={16}/></button>
        <div className="rcb-date-list">
          {visibleDays.map((d, i) => {
            const isToday  = d.toDateString() === new Date().toDateString();
            const isSel    = d.toDateString() === selectedDate.toDateString();
            const dayResvs = reservations.filter(r => { const ci = new Date(r.checkInDate); ci.setHours(0,0,0,0); const co = new Date(r.checkOutDate); co.setHours(0,0,0,0); return d >= ci && d < co; });
            return (
              <button key={i} className={`rcb-date-item ${isToday ? 'today' : ''} ${isSel ? 'selected' : ''}`} onClick={() => setSelectedDate(d)}>
                <span className="rcb-day-name">{d.toLocaleString('en-US', {weekday:'short'})}</span>
                <span className="rcb-day-num">{d.getDate()}</span>
                {dayResvs.length > 0 && <span className="rcb-day-dot">{dayResvs.length}</span>}
              </button>
            );
          })}
        </div>
        <button className="rcb-date-nav" onClick={() => setDateScrollIdx(i => Math.min(days.length - 11, i + 1))} disabled={dateScrollIdx >= days.length - 11}><ChevronRightIcon size={16}/></button>
      </div>

      <div className="rcb-stats-bar">
        <div className="rcb-stat rcb-stat--large"><span className="rcb-stat-num">{stats.inHouse}</span><span className="rcb-stat-lbl">Guests in-house</span></div>
        <div className="rcb-stat rcb-stat--large"><span className="rcb-stat-num">{Math.max(0, stats.freeRooms)}</span><span className="rcb-stat-lbl">Rooms free</span></div>
        <div className="rcb-stat-divider"/>
        <div className="rcb-stat"><span className="rcb-stat-num">{stats.checkIns}</span><span className="rcb-stat-lbl">Check-ins</span></div>
        <div className="rcb-stat"><span className="rcb-stat-num">{stats.checkOuts}</span><span className="rcb-stat-lbl">Check-outs</span></div>
        <div className="rcb-stat"><span className="rcb-stat-num">{stats.staying}</span><span className="rcb-stat-lbl">Staying</span></div>
      </div>

      <div className="rcb-toolbar">
        <div className="rcb-search-wrap">
          <Search size={15} className="rcb-search-icon"/>
          <input className="rcb-search" placeholder="Search guest, room, confirmation…" value={search} onChange={e => setSearch(e.target.value)}/>
        </div>
        <div className="rcb-filter-row">
          {['all','pending','confirmed','checked-in','checked-out','cancelled'].map(s => (
            <button key={s} className={`rcb-filter-btn ${filterStatus === s ? 'active' : ''}`} onClick={() => setFilterStatus(s)}>
              {s === 'all' ? 'All' : STATUS_META[s]?.label || s}
            </button>
          ))}
        </div>
        <div className="rcb-toolbar-right">
          <button className="rcb-refresh-btn" onClick={fetchReservations} title="Refresh"><RefreshCw size={15}/></button>
          <button className="rcb-new-btn" onClick={() => setShowNewModal(true)} disabled={amenitiesLoading}><Plus size={16}/> New Booking</button>
        </div>
      </div>

      <div className="rcb-content-area">
        {!isTodaySelected && (
          <div className="rcb-date-banner">
            <Calendar size={14}/>
            <span>Showing bookings for <strong>{selDate.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</strong></span>
            <button className="rcb-date-banner-reset" onClick={() => setSelectedDate(new Date())}>← Back to Today</button>
          </div>
        )}
        {loading ? (
          <div className="rcb-loading"><div className="rcb-spinner"/><span>Loading reservations…</span></div>
        ) : filtered.length === 0 ? (
          <div className="rcb-empty">{isTodaySelected ? 'No reservations found.' : `No bookings for ${selDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}.`}</div>
        ) : (
          Object.entries(groups).map(([status, items]) => {
            if (items.length === 0) return null;
            return (
              <section key={status} className="rcb-group">
                <h2 className="rcb-section-title">{GROUP_LABELS[status]} <span className="rcb-section-count">{items.length}</span></h2>
                <div className="rcb-grid">
                  {items.map(booking => {
                    const bMeta   = STATUS_META[booking.status]      || STATUS_META.pending;
                    const typMeta = ROOM_TYPE_META[booking.roomType] || { label: booking.roomType, cls: '' };
                    const rooms   = booking.roomIds?.map(r => r.roomNumber).join(', ') || '—';
                    return (
                      <div key={booking._id} className="rcb-booking-card" onClick={() => setDetailBooking(booking)}>
                        <div className="rcb-card-top">
                          <div className="rcb-card-left">
                            <span className={`rcb-type-badge ${typMeta.cls}`}>{typMeta.label.toUpperCase()}</span>
                            <span className="rcb-room-nums">{rooms}</span>
                          </div>
                          <span className={`rcb-status-pill ${bMeta.cls}`}><bMeta.Icon size={11}/>{bMeta.label}</span>
                        </div>
                        <div className="rcb-guest-name">{booking.guestName}</div>
                        <div className="rcb-guest-sub">{booking.email}</div>
                        <div className="rcb-dates">
                          <span className="rcb-date-range">
                            {fmtShort(booking.checkInDate)}
                            <span className="rcb-date-time">{formatTimeDisplay(hotelCheckInTime)}</span>
                          </span>
                          <ArrowRightLeft size={12} className="rcb-date-arrow"/>
                          <span className="rcb-date-range">
                            {fmtShort(booking.checkOutDate)}
                            <span className="rcb-date-time">{formatTimeDisplay(hotelCheckOutTime)}</span>
                          </span>
                        </div>
                        {booking.checkInTime && (
                          <div className="rcb-card-time">
                            <Clock size={11}/>
                            Arrival: {formatTimeDisplay(booking.checkInTime)}
                          </div>
                        )}
                        <div className="rcb-card-footer">
                          <span className="rcb-price"><CreditCard size={12}/>${booking.totalPrice?.toLocaleString() || 0}</span>
                          <span className="rcb-guests-count"><Users size={12}/>{booking.numberOfGuests}</span>
                          <span className="rcb-rooms-count"><BedDouble size={12}/>{booking.numberOfRooms}</span>
                          {(booking.paidAmenities || []).length > 0 && (
                            <span className="rcb-amenity-count-badge">
                              ✦ {booking.paidAmenities.length}
                            </span>
                          )}
                          {booking.paymentStatus === 'completed' && <span className="rcb-invoiced-badge"><CheckCircle size={11}/>Invoiced</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })
        )}
      </div>

      {showNewModal && (
        <NewBookingModal
          onClose={() => setShowNewModal(false)}
          onCreated={fetchReservations}
          allAmenities={allAmenities}
          hotelCheckInTime={hotelCheckInTime}
        />
      )}
      {detailBooking && (
        <BookingDetailModal
          booking={detailBooking}
          onClose={() => setDetailBooking(null)}
          onUpdated={fetchReservations}
          allAmenities={allAmenities}
          hotelCheckInTime={hotelCheckInTime}
        />
      )}
    </div>
  );
};

export default ReceptionistBookings;