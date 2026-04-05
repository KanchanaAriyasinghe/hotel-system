// frontend/src/pages/receptionist/ReceptionistBookings.jsx

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
  return `${d.toLocaleString('en-GB', { month: 'short' })} ${d.getDate()} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
};
const toInputDate = (dateStr) => {
  if (!dateStr) return '';
  return new Date(dateStr).toISOString().split('T')[0];
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

const ROOM_PRICES = { single: 80, double: 120, deluxe: 180, suite: 300, family: 220 };

const buildDays = () => {
  const days = [];
  const today = new Date(); today.setHours(0,0,0,0);
  for (let i = -4; i <= 12; i++) {
    const d = new Date(today); d.setDate(today.getDate() + i); days.push(d);
  }
  return days;
};

// ── Empty booking template ─────────────────────────────────────────
const mkBooking = () => ({
  id:              Date.now() + Math.random(),
  roomType:        'deluxe',
  checkInDate:     '',
  checkOutDate:    '',
  numberOfGuests:  1,
  specialRequests: '',
  availableRooms:  [],
  selectedRoomIds: [],
  selectedRooms:   [],   // full objects — for summary display
  searched:        false,
  searching:       false,
  error:           '',
});

const calcNightsFor = (b) => {
  if (!b.checkInDate || !b.checkOutDate) return 0;
  return Math.max(0, Math.round((new Date(b.checkOutDate) - new Date(b.checkInDate)) / 86400000));
};
const bookingSubtotal = (b) =>
  ROOM_PRICES[b.roomType] * calcNightsFor(b) * (b.selectedRoomIds.length || 1);

// ═══════════════════════════════════════════════════════════════════
// NEW BOOKING MODAL  —  3 steps: 'guest' → 'rooms' → 'summary'
// ═══════════════════════════════════════════════════════════════════
const NewBookingModal = ({ onClose, onCreated }) => {
  const [guestInfo, setGuestInfo]     = useState({ guestName: '', email: '', phone: '' });
  const [confirmed, setConfirmed]     = useState([]);  // finalized bookings list
  const [active, setActive]           = useState(mkBooking()); // booking being built
  const [step, setStep]               = useState('guest');
  const [submitting, setSubmitting]   = useState(false);
  const [globalError, setGlobalError] = useState('');

  const patchActive = (patch) => setActive(a => ({ ...a, ...patch }));

  // Search available rooms for active booking
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
      return {
        ...a,
        selectedRoomIds: already ? a.selectedRoomIds.filter(id => id !== room._id) : [...a.selectedRoomIds, room._id],
        selectedRooms:   already ? a.selectedRooms.filter(r => r._id !== room._id)  : [...a.selectedRooms, room],
      };
    });
  };

  // Save active and start a fresh booking
  const handleAddAnother = () => {
    if (active.selectedRoomIds.length === 0) {
      patchActive({ error: 'Select at least one room before adding another booking.' });
      return;
    }
    setConfirmed(prev => [...prev, active]);
    setActive(mkBooking());
    // stay on 'rooms' step
  };

  // Save active and go to summary
  const handleReviewAll = () => {
    if (active.selectedRoomIds.length === 0) {
      patchActive({ error: 'Select at least one room before continuing.' });
      return;
    }
    setConfirmed(prev => [...prev, active]);
    setStep('summary');
  };

  // Remove a booking from the confirmed list (on summary page)
  const removeConfirmed = (id) => setConfirmed(prev => prev.filter(b => b.id !== id));

  const grandTotal = confirmed.reduce((s, b) => s + bookingSubtotal(b), 0);

  // Submit all bookings
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
            roomType:        b.roomType,
            roomIds:         b.selectedRoomIds,
            numberOfGuests:  b.numberOfGuests,
            numberOfRooms:   b.selectedRoomIds.length,
            specialRequests: b.specialRequests,
            totalPrice:      bookingSubtotal(b),
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

  // ── Step indicator (reusable) ──
  const StepBar = ({ current }) => (
    <div className="rcb-step-indicator">
      <span className={`rcb-step ${current === 'guest' ? 'rcb-step--active' : 'rcb-step--done'}`}>① Guest Info</span>
      <span className="rcb-step-sep">›</span>
      <span className={`rcb-step ${current === 'rooms' ? 'rcb-step--active' : current === 'summary' ? 'rcb-step--done' : ''}`}>② Rooms</span>
      <span className="rcb-step-sep">›</span>
      <span className={`rcb-step ${current === 'summary' ? 'rcb-step--active' : ''}`}>③ Summary</span>
    </div>
  );

  // ══════════ STEP: guest ══════════
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

  // ══════════ STEP: rooms ══════════
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

        {active.error  && <div className="rcb-modal-error">{active.error}</div>}
        {globalError   && <div className="rcb-modal-error">{globalError}</div>}

        <div className="rcb-modal-body">
          <StepBar current="rooms"/>

          {/* Mini list of already-saved bookings */}
          {confirmed.length > 0 && (
            <div className="rcb-saved-list">
              {confirmed.map((b, i) => (
                <div key={b.id} className="rcb-saved-item">
                  <span className="rcb-saved-num">#{i + 1}</span>
                  <span className={`rcb-saved-type rcb-type-badge ${ROOM_TYPE_META[b.roomType]?.cls}`}>{ROOM_TYPE_META[b.roomType]?.label}</span>
                  <span className="rcb-saved-rooms">{b.selectedRooms.map(r => `#${r.roomNumber}`).join(', ')}</span>
                  <span className="rcb-saved-dates">{fmt(b.checkInDate)} → {fmt(b.checkOutDate)}</span>
                  <span className="rcb-saved-price">${bookingSubtotal(b).toLocaleString()}</span>
                  <button className="rcb-saved-remove" onClick={() => setConfirmed(prev => prev.filter(x => x.id !== b.id))} title="Remove"><X size={12}/></button>
                </div>
              ))}
            </div>
          )}

          {/* Active booking card */}
          <div className="rcb-segment">
            <div className="rcb-segment-header">
              <span className="rcb-segment-label">
                Booking {confirmed.length + 1}
                {active.selectedRoomIds.length > 0 && calcNightsFor(active) > 0 && (
                  <span className="rcb-segment-price"> · ${bookingSubtotal(active).toLocaleString()}</span>
                )}
              </span>
            </div>

            <div className="rcb-form-grid">
              <div className="rcb-field">
                <label><BedDouble size={13}/> Room Type</label>
                <select value={active.roomType} onChange={e => patchActive({ roomType: e.target.value, searched: false, availableRooms: [], selectedRoomIds: [], selectedRooms: [] })}>
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
                <input type="date" value={active.checkInDate} onChange={e => patchActive({ checkInDate: e.target.value, searched: false, availableRooms: [], selectedRoomIds: [], selectedRooms: [] })}/>
              </div>
              <div className="rcb-field">
                <label><Calendar size={13}/> Check-out</label>
                <input type="date" value={active.checkOutDate} onChange={e => patchActive({ checkOutDate: e.target.value, searched: false, availableRooms: [], selectedRoomIds: [], selectedRooms: [] })}/>
              </div>
              <div className="rcb-field rcb-field--full">
                <label>Special Requests</label>
                <textarea rows={2} value={active.specialRequests} onChange={e => patchActive({ specialRequests: e.target.value })} placeholder="Any special requests…"/>
              </div>
            </div>

            {/* Room search / picker */}
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
                  <button className="rcb-seg-re-search" onClick={() => patchActive({ searched: false, availableRooms: [], selectedRoomIds: [], selectedRooms: [] })}>↺ Re-search</button>
                </p>
                {active.availableRooms.length === 0 ? (
                  <p className="rcb-modal-empty">No rooms available for selected dates.</p>
                ) : (
                  <div className="rcb-room-picker">
                    {active.availableRooms.map(r => (
                      <button key={r._id} className={`rcb-room-chip ${active.selectedRoomIds.includes(r._id) ? 'selected' : ''}`} onClick={() => toggleRoom(r)}>
                        <span className="rcb-room-chip-num">#{r.roomNumber}</span>
                        <span className="rcb-room-chip-floor">Floor {r.floor}</span>
                      </button>
                    ))}
                  </div>
                )}
                {active.selectedRoomIds.length > 0 && calcNightsFor(active) > 0 && (
                  <div className="rcb-price-preview" style={{ marginTop: 10 }}>
                    <CreditCard size={14}/>
                    <span>
                      Subtotal: <strong>${bookingSubtotal(active).toLocaleString()}</strong>
                      {' '}({calcNightsFor(active)} nights × {active.selectedRoomIds.length} room{active.selectedRoomIds.length > 1 ? 's' : ''})
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── 3-button action row ── */}
          <div className="rcb-rooms-action-row">
            <button className="rcb-modal-btn rcb-modal-btn--secondary" onClick={() => { setStep('guest'); setConfirmed([]); setActive(mkBooking()); }}>
              ← Back
            </button>
            <div className="rcb-rooms-action-right">
              <button
                className="rcb-add-another-btn"
                onClick={handleAddAnother}
                disabled={active.selectedRoomIds.length === 0}
                title="Save this booking and add another one"
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

  // ══════════ STEP: summary ══════════
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

          {/* Guest info row */}
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

          {/* Per-booking cards */}
          <div className="rcb-summary-bookings">
            {confirmed.map((b, i) => {
              const nights  = calcNightsFor(b);
              const total   = bookingSubtotal(b);
              const typMeta = ROOM_TYPE_META[b.roomType] || { label: b.roomType, cls: '' };
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
                            <span key={r._id} className="rcb-summary-room-chip">#{r.roomNumber} <em>F{r.floor}</em></span>
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
                      <span className="rcb-summary-label">Duration</span>
                      <span className="rcb-summary-value">{nights} night{nights !== 1 ? 's' : ''}</span>
                    </div>
                    <div className="rcb-summary-field">
                      <span className="rcb-summary-label">Guests</span>
                      <span className="rcb-summary-value">{b.numberOfGuests}</span>
                    </div>
                    <div className="rcb-summary-field">
                      <span className="rcb-summary-label">Rate</span>
                      <span className="rcb-summary-value">${ROOM_PRICES[b.roomType]}/night</span>
                    </div>
                    {b.specialRequests && (
                      <div className="rcb-summary-field rcb-summary-field--full">
                        <span className="rcb-summary-label">Special Requests</span>
                        <span className="rcb-summary-value">{b.specialRequests}</span>
                      </div>
                    )}
                  </div>

                  <div className="rcb-summary-booking-total">
                    <span>{b.selectedRoomIds.length} room{b.selectedRoomIds.length > 1 ? 's' : ''} × {nights} night{nights !== 1 ? 's' : ''} × ${ROOM_PRICES[b.roomType]}</span>
                    <strong>${total.toLocaleString()}</strong>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Grand total */}
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
                // Put last booking back as active for editing
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
              {submitting
                ? 'Creating…'
                : confirmed.length > 1
                  ? `Confirm ${confirmed.length} Bookings`
                  : 'Confirm Booking'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return null;
};

// ═══════════════════════════════════════════════════════════════════
// BOOKING DETAIL MODAL  (existing — no logic changes)
// ═══════════════════════════════════════════════════════════════════
const BookingDetailModal = ({ booking, onClose, onUpdated }) => {
  const [mode, setMode]       = useState('view');
  const [loading, setLoading] = useState('');
  const [error, setError]     = useState('');
  const [success, setSuccess] = useState('');

  const [editForm, setEditForm] = useState({
    guestName:       booking.guestName       || '',
    email:           booking.email           || '',
    phone:           booking.phone           || '',
    checkInDate:     toInputDate(booking.checkInDate),
    checkOutDate:    toInputDate(booking.checkOutDate),
    numberOfGuests:  booking.numberOfGuests  || 1,
    specialRequests: booking.specialRequests || '',
    status:          booking.status          || 'pending',
    paymentStatus:   booking.paymentStatus   || 'pending',
    roomType:        booking.roomType        || 'deluxe',
  });

  const [availableRooms, setAvailableRooms]   = useState([]);
  const [selectedRoomIds, setSelectedRoomIds] = useState(booking.roomIds?.map(r => r._id || r) || []);
  const [roomSearching, setRoomSearching]     = useState(false);
  const [roomSearched, setRoomSearched]       = useState(false);

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

  const toggleRoom  = (id) => setSelectedRoomIds(prev => prev.includes(id) ? prev.filter(r => r !== id) : [...prev, id]);
  const revertRooms = () => { setRoomSearched(false); setSelectedRoomIds(booking.roomIds?.map(r => r._id || r) || []); setAvailableRooms([]); };

  const calcNightsEdit = () => {
    if (!editForm.checkInDate || !editForm.checkOutDate) return 0;
    return Math.max(0, Math.round((new Date(editForm.checkOutDate) - new Date(editForm.checkInDate)) / 86400000));
  };
  const totalPrice = ROOM_PRICES[editForm.roomType] * calcNightsEdit() * (selectedRoomIds.length || 1);

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
    setLoading('save'); setError(''); setSuccess('');
    try {
      const token = localStorage.getItem('token');
      await axios.put(`${API}/reservations/${booking._id}`, {
        guestName: editForm.guestName, email: editForm.email, phone: editForm.phone,
        checkInDate: editForm.checkInDate, checkOutDate: editForm.checkOutDate,
        numberOfGuests: Number(editForm.numberOfGuests), specialRequests: editForm.specialRequests,
        status: editForm.status, paymentStatus: editForm.paymentStatus,
        roomType: editForm.roomType, roomIds: selectedRoomIds,
        numberOfRooms: selectedRoomIds.length, totalPrice,
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
              <div className="rcb-detail-item"><span className="rcb-dl">Rooms</span><span className="rcb-dv">{booking.roomIds?.map(r => `#${r.roomNumber}`).join(', ') || '—'}</span></div>
              <div className="rcb-detail-item"><span className="rcb-dl">Guests</span><span className="rcb-dv">{booking.numberOfGuests}</span></div>
              <div className="rcb-detail-item"><span className="rcb-dl">Total Price</span><span className="rcb-dv rcb-dv--price">${booking.totalPrice?.toLocaleString()}</span></div>
              <div className="rcb-detail-item"><span className="rcb-dl">Payment</span><span className="rcb-dv">{PAYMENT_META[booking.paymentStatus] || booking.paymentStatus}</span></div>
              {booking.specialRequests && <div className="rcb-detail-item rcb-detail-item--full"><span className="rcb-dl">Special Requests</span><span className="rcb-dv">{booking.specialRequests}</span></div>}
            </div>
            <div className="rcb-detail-actions">
              {booking.status === 'pending'    && <button className="rcb-act rcb-act--confirm"  onClick={() => updateStatus('confirmed')}   disabled={loading === 'confirmed'  }><CheckCircle size={15}/>{loading === 'confirmed'   ? 'Confirming…' : 'Confirm'  }</button>}
              {booking.status === 'confirmed'  && <button className="rcb-act rcb-act--checkin"  onClick={() => updateStatus('checked-in')}  disabled={loading === 'checked-in' }><LogIn  size={15}/>{loading === 'checked-in'  ? 'Processing…' : 'Check In' }</button>}
              {booking.status === 'checked-in' && <button className="rcb-act rcb-act--checkout" onClick={() => updateStatus('checked-out')} disabled={loading === 'checked-out'}><LogOut size={15}/>{loading === 'checked-out' ? 'Processing…' : 'Check Out'}</button>}
            </div>
          </div>
        )}

        {mode === 'edit' && (
          <div className="rcb-modal-body">
            <div className="rcb-modal-section-title"><Pencil size={12}/> Edit Booking Details</div>
            <div className="rcb-form-grid">
              <div className="rcb-field"><label><User size={13}/> Guest Name</label><input value={editForm.guestName} onChange={e => setEditForm({...editForm, guestName: e.target.value})} placeholder="Full name"/></div>
              <div className="rcb-field"><label><Mail size={13}/> Email</label><input type="email" value={editForm.email} onChange={e => setEditForm({...editForm, email: e.target.value})} placeholder="email@example.com"/></div>
              <div className="rcb-field"><label><Phone size={13}/> Phone</label><input value={editForm.phone} onChange={e => setEditForm({...editForm, phone: e.target.value})} placeholder="+1 234 567 890"/></div>
              <div className="rcb-field"><label><Users size={13}/> No. of Guests</label><input type="number" min="1" max="20" value={editForm.numberOfGuests} onChange={e => setEditForm({...editForm, numberOfGuests: e.target.value})}/></div>
              <div className="rcb-field"><label><Calendar size={13}/> Check-in Date</label><input type="date" value={editForm.checkInDate} onChange={e => { setEditForm({...editForm, checkInDate: e.target.value}); setRoomSearched(false); setSelectedRoomIds(booking.roomIds?.map(r => r._id || r) || []); }}/></div>
              <div className="rcb-field"><label><Calendar size={13}/> Check-out Date</label><input type="date" value={editForm.checkOutDate} onChange={e => { setEditForm({...editForm, checkOutDate: e.target.value}); setRoomSearched(false); setSelectedRoomIds(booking.roomIds?.map(r => r._id || r) || []); }}/></div>
              <div className="rcb-field"><label><BedDouble size={13}/> Room Type</label><div className="rcb-select-wrap"><select value={editForm.roomType} onChange={e => { setEditForm({...editForm, roomType: e.target.value}); setRoomSearched(false); setSelectedRoomIds([]); setAvailableRooms([]); }}><option value="single">Single</option><option value="double">Double</option><option value="deluxe">Deluxe</option><option value="suite">Suite</option><option value="family">Family</option></select><ChevronDown size={14} className="rcb-select-chevron"/></div></div>
              <div className="rcb-field"><label>Booking Status</label><div className="rcb-select-wrap"><select value={editForm.status} onChange={e => setEditForm({...editForm, status: e.target.value})}><option value="pending">Pending</option><option value="confirmed">Confirmed</option><option value="checked-in">Checked In</option><option value="checked-out">Checked Out</option><option value="cancelled">Cancelled</option></select><ChevronDown size={14} className="rcb-select-chevron"/></div></div>
              <div className="rcb-field"><label><CreditCard size={13}/> Payment Status</label><div className="rcb-select-wrap"><select value={editForm.paymentStatus} onChange={e => setEditForm({...editForm, paymentStatus: e.target.value})}><option value="pending">Pending</option><option value="completed">Completed</option><option value="failed">Failed</option><option value="refunded">Refunded</option></select><ChevronDown size={14} className="rcb-select-chevron"/></div></div>
              <div className="rcb-field rcb-field--full"><label>Special Requests</label><textarea rows={3} value={editForm.specialRequests} onChange={e => setEditForm({...editForm, specialRequests: e.target.value})} placeholder="Any special requests…"/></div>
            </div>
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
                  {availableRooms.length === 0 ? <p className="rcb-modal-empty">No rooms available for the selected dates &amp; type.</p> : <div className="rcb-room-picker">{availableRooms.map(r => <button key={r._id} type="button" className={`rcb-room-chip ${selectedRoomIds.includes(r._id) ? 'selected' : ''}`} onClick={() => toggleRoom(r._id)}><span className="rcb-room-chip-num">#{r.roomNumber}</span><span className="rcb-room-chip-floor">Floor {r.floor}</span></button>)}</div>}
                  {selectedRoomIds.length > 0 && calcNightsEdit() > 0 && <div className="rcb-price-preview" style={{ marginTop: 10 }}><CreditCard size={14}/><span>New estimated total: <strong>${totalPrice.toLocaleString()}</strong> ({calcNightsEdit()} nights × {selectedRoomIds.length} room{selectedRoomIds.length > 1 ? 's' : ''})</span></div>}
                  <button type="button" className="rcb-modal-btn rcb-modal-btn--secondary" style={{ fontSize: 12, padding: '7px 14px', marginTop: 10 }} onClick={revertRooms}>↩ Keep Original Rooms</button>
                </div>
              )}
            </div>
            <div className="rcb-modal-footer">
              <button className="rcb-modal-btn rcb-modal-btn--secondary" onClick={() => { setMode('view'); setError(''); revertRooms(); }}>Cancel</button>
              <button className="rcb-modal-btn rcb-modal-btn--save" onClick={saveEdit} disabled={loading === 'save'}><Save size={14}/>{loading === 'save' ? 'Saving…' : 'Save Changes'}</button>
            </div>
          </div>
        )}

        {mode === 'delete' && (
  <div className="rcb-modal-body">
    <div className="rcb-delete-confirm">
      <div className="rcb-delete-icon-wrap">
        <AlertTriangle size={28} className="rcb-delete-icon"/>
      </div>

      {booking.status === 'cancelled' ? (
        <>
          <h3 className="rcb-delete-heading">Permanently delete this record?</h3>
          <p className="rcb-delete-desc">
            This cancelled booking for <strong>{booking.guestName}</strong> (#{booking.confirmationNumber}) will be
            <strong> permanently removed</strong> from the database. No emails will be sent.
            This action cannot be undone.
          </p>
        </>
      ) : (
        <>
          <h3 className="rcb-delete-heading">Cancel this booking?</h3>
          <p className="rcb-delete-desc">
            You're about to cancel the booking for <strong>{booking.guestName}</strong> (#{booking.confirmationNumber}).
            The guest and admins will be notified by email.
            This action cannot be undone.
          </p>
        </>
      )}

      <div className="rcb-delete-meta">
        <span>{fmt(booking.checkInDate)} → {fmt(booking.checkOutDate)}</span>
        <span>{booking.roomIds?.map(r => `#${r.roomNumber}`).join(', ') || '—'}</span>
      </div>

      <div className="rcb-delete-actions">
        <button
          className="rcb-modal-btn rcb-modal-btn--secondary"
          onClick={() => { setMode('view'); setError(''); }}
        >
          Keep Booking
        </button>
        <button
          className="rcb-modal-btn rcb-modal-btn--delete"
          onClick={confirmDelete}
          disabled={loading === 'delete'}
        >
          <Trash2 size={14}/>
          {loading === 'delete'
            ? 'Deleting…'
            : booking.status === 'cancelled'
              ? 'Yes, Delete Permanently'
              : 'Yes, Cancel Booking'
          }
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
        groups: { 'checked-in': filtered.filter(r => r.status === 'checked-in'), 'confirmed': filtered.filter(r => r.status === 'confirmed'), 'pending': filtered.filter(r => r.status === 'pending'), 'checked-out': filtered.filter(r => r.status === 'checked-out'), 'cancelled': filtered.filter(r => r.status === 'cancelled') },
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
          <button className="rcb-new-btn" onClick={() => setShowNewModal(true)}><Plus size={16}/> New Booking</button>
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
                          <span className="rcb-date-range">{fmtShort(booking.checkInDate)}</span>
                          <ArrowRightLeft size={12} className="rcb-date-arrow"/>
                          <span className="rcb-date-range">{fmtShort(booking.checkOutDate)}</span>
                        </div>
                        <div className="rcb-card-footer">
                          <span className="rcb-price"><CreditCard size={12}/>${booking.totalPrice?.toLocaleString() || 0}</span>
                          <span className="rcb-guests-count"><Users size={12}/>{booking.numberOfGuests}</span>
                          <span className="rcb-rooms-count"><BedDouble size={12}/>{booking.numberOfRooms}</span>
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

      {showNewModal  && <NewBookingModal onClose={() => setShowNewModal(false)} onCreated={fetchReservations}/>}
      {detailBooking && <BookingDetailModal booking={detailBooking} onClose={() => setDetailBooking(null)} onUpdated={fetchReservations}/>}
    </div>
  );
};

export default ReceptionistBookings;