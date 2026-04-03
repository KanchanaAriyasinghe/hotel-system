// frontend/src/pages/receptionist/ReceptionistBookings.jsx

import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import {
  Plus, Search, ChevronLeft, ChevronRight as ChevronRightIcon,
  Users, BedDouble, LogIn, LogOut, Coffee,
  RefreshCw, X, CheckCircle, Clock, ArrowRightLeft,
  CreditCard, User, Phone, Mail, Calendar,
  Pencil, Trash2, AlertTriangle, Save, ChevronDown,
} from 'lucide-react';
import './ReceptionistBookings.css';

const API = process.env.REACT_APP_API_URL;

// ── Helpers ────────────────────────────────────────────────────────
const fmt = (date) => {
  if (!date) return '—';
  const d = new Date(date);
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};
const fmtShort = (date) => {
  if (!date) return '—';
  const d = new Date(date);
  return `${d.toLocaleString('en-GB', { month: 'short' })} ${d.getDate()} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
};

// Convert "2025-06-15T00:00:00.000Z" → "2025-06-15" for <input type="date">
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
  single:  { label: 'Single',  cls: 'rcb-type--single'  },
  double:  { label: 'Double',  cls: 'rcb-type--double'  },
  deluxe:  { label: 'Deluxe',  cls: 'rcb-type--deluxe'  },
  suite:   { label: 'Suite',   cls: 'rcb-type--suite'   },
  family:  { label: 'Family',  cls: 'rcb-type--family'  },
};

const PAYMENT_META = {
  pending:   'Pending',
  completed: 'Completed',
  failed:    'Failed',
  refunded:  'Refunded',
};

// ── Build a 17-day window around today ────────────────────────────
const buildDays = () => {
  const days = [];
  const today = new Date();
  today.setHours(0,0,0,0);
  for (let i = -4; i <= 12; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    days.push(d);
  }
  return days;
};

// ── New Booking Modal ─────────────────────────────────────────────
const NewBookingModal = ({ onClose, onCreated }) => {
  const [form, setForm] = useState({
    guestName: '', email: '', phone: '',
    checkInDate: '', checkOutDate: '',
    roomType: 'deluxe', numberOfGuests: 1, numberOfRooms: 1,
    specialRequests: '',
  });
  const [availableRooms, setAvailableRooms] = useState([]);
  const [selectedRoomIds, setSelectedRoomIds] = useState([]);
  const [loading, setLoading]     = useState(false);
  const [searching, setSearching] = useState(false);
  const [error, setError]         = useState('');
  const [step, setStep]           = useState(1);

  const searchRooms = async () => {
    if (!form.checkInDate || !form.checkOutDate || !form.roomType) return;
    setSearching(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API}/reservations/available`, {
        params: { roomType: form.roomType, checkInDate: form.checkInDate, checkOutDate: form.checkOutDate },
        headers: { Authorization: `Bearer ${token}` },
      });
      setAvailableRooms(res.data.data || []);
      setStep(2);
    } catch (e) {
      setError('Failed to fetch available rooms');
    } finally {
      setSearching(false);
    }
  };

  const toggleRoom = (id) => {
    setSelectedRoomIds(prev =>
      prev.includes(id) ? prev.filter(r => r !== id) : [...prev, id]
    );
  };

  const calcNights = () => {
    if (!form.checkInDate || !form.checkOutDate) return 0;
    const diff = new Date(form.checkOutDate) - new Date(form.checkInDate);
    return Math.max(0, Math.round(diff / 86400000));
  };

  const ROOM_PRICES = { single: 80, double: 120, deluxe: 180, suite: 300, family: 220 };
  const totalPrice  = ROOM_PRICES[form.roomType] * calcNights() * (selectedRoomIds.length || form.numberOfRooms);

  const handleSubmit = async () => {
    if (!form.guestName || !form.email || !form.phone) { setError('Fill all guest details'); return; }
    if (selectedRoomIds.length === 0) { setError('Select at least one room'); return; }
    setLoading(true); setError('');
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API}/reservations`, {
        ...form,
        roomIds: selectedRoomIds,
        numberOfRooms: selectedRoomIds.length,
        totalPrice,
        stayType: 'overnight',
      }, { headers: { Authorization: `Bearer ${token}` } });
      onCreated();
      onClose();
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to create booking');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rcb-modal-overlay" onClick={onClose}>
      <div className="rcb-modal" onClick={e => e.stopPropagation()}>
        <div className="rcb-modal-header">
          <h2 className="rcb-modal-title">New Booking</h2>
          <button className="rcb-modal-close" onClick={onClose}><X size={18}/></button>
        </div>

        {error && <div className="rcb-modal-error">{error}</div>}

        {step === 1 && (
          <div className="rcb-modal-body">
            <div className="rcb-modal-section-title">Guest Information</div>
            <div className="rcb-form-grid">
              <div className="rcb-field">
                <label><User size={13}/> Guest Name</label>
                <input value={form.guestName} onChange={e => setForm({...form, guestName: e.target.value})} placeholder="Full name" />
              </div>
              <div className="rcb-field">
                <label><Mail size={13}/> Email</label>
                <input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} placeholder="email@example.com" />
              </div>
              <div className="rcb-field">
                <label><Phone size={13}/> Phone</label>
                <input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} placeholder="+1 234 567 890" />
              </div>
              <div className="rcb-field">
                <label><BedDouble size={13}/> Room Type</label>
                <select value={form.roomType} onChange={e => setForm({...form, roomType: e.target.value})}>
                  <option value="single">Single</option>
                  <option value="double">Double</option>
                  <option value="deluxe">Deluxe</option>
                  <option value="suite">Suite</option>
                  <option value="family">Family</option>
                </select>
              </div>
              <div className="rcb-field">
                <label><Calendar size={13}/> Check-in</label>
                <input type="date" value={form.checkInDate} onChange={e => setForm({...form, checkInDate: e.target.value})} />
              </div>
              <div className="rcb-field">
                <label><Calendar size={13}/> Check-out</label>
                <input type="date" value={form.checkOutDate} onChange={e => setForm({...form, checkOutDate: e.target.value})} />
              </div>
              <div className="rcb-field">
                <label><Users size={13}/> Guests</label>
                <input type="number" min="1" max="10" value={form.numberOfGuests} onChange={e => setForm({...form, numberOfGuests: +e.target.value})} />
              </div>
              <div className="rcb-field rcb-field--full">
                <label>Special Requests</label>
                <textarea rows={2} value={form.specialRequests} onChange={e => setForm({...form, specialRequests: e.target.value})} placeholder="Any special requests..." />
              </div>
            </div>
            <div className="rcb-modal-footer">
              <button className="rcb-modal-btn rcb-modal-btn--secondary" onClick={onClose}>Cancel</button>
              <button className="rcb-modal-btn rcb-modal-btn--primary" onClick={searchRooms} disabled={searching}>
                {searching ? 'Searching…' : 'Search Rooms →'}
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="rcb-modal-body">
            <div className="rcb-modal-section-title">
              Select Rooms — {availableRooms.length} available ({form.roomType})
            </div>
            {availableRooms.length === 0
              ? <p className="rcb-modal-empty">No rooms available for selected dates.</p>
              : (
                <div className="rcb-room-picker">
                  {availableRooms.map(r => (
                    <button
                      key={r._id}
                      className={`rcb-room-chip ${selectedRoomIds.includes(r._id) ? 'selected' : ''}`}
                      onClick={() => toggleRoom(r._id)}
                    >
                      <span className="rcb-room-chip-num">#{r.roomNumber}</span>
                      <span className="rcb-room-chip-floor">Floor {r.floor}</span>
                    </button>
                  ))}
                </div>
              )
            }
            {selectedRoomIds.length > 0 && (
              <div className="rcb-price-preview">
                <CreditCard size={14}/>
                <span>Estimated total: <strong>${totalPrice.toLocaleString()}</strong> ({calcNights()} nights × {selectedRoomIds.length} room{selectedRoomIds.length > 1 ? 's' : ''})</span>
              </div>
            )}
            <div className="rcb-modal-footer">
              <button className="rcb-modal-btn rcb-modal-btn--secondary" onClick={() => setStep(1)}>← Back</button>
              <button className="rcb-modal-btn rcb-modal-btn--primary" onClick={handleSubmit} disabled={loading || selectedRoomIds.length === 0}>
                {loading ? 'Creating…' : 'Create Booking'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ── Booking Detail Modal ──────────────────────────────────────────
const BookingDetailModal = ({ booking, onClose, onUpdated }) => {
  const [mode, setMode]       = useState('view');   // 'view' | 'edit' | 'delete'
  const [loading, setLoading] = useState('');
  const [error, setError]     = useState('');
  const [success, setSuccess] = useState('');

  // Edit form state — pre-filled from booking
  const [editForm, setEditForm] = useState({
    guestName:       booking.guestName      || '',
    email:           booking.email          || '',
    phone:           booking.phone          || '',
    checkInDate:     toInputDate(booking.checkInDate),
    checkOutDate:    toInputDate(booking.checkOutDate),
    numberOfGuests:  booking.numberOfGuests || 1,
    specialRequests: booking.specialRequests || '',
    status:          booking.status         || 'pending',
    paymentStatus:   booking.paymentStatus  || 'pending',
  });

  // ── Status transition ────────────────────────────────────────────
  const updateStatus = async (status) => {
    setLoading(status); setError('');
    try {
      const token = localStorage.getItem('token');
      await axios.put(`${API}/reservations/${booking._id}`, { status }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      onUpdated();
      onClose();
    } catch (e) {
      setError(e.response?.data?.message || 'Update failed');
    } finally {
      setLoading('');
    }
  };

  // ── Save edits ───────────────────────────────────────────────────
  const saveEdit = async () => {
    if (!editForm.guestName || !editForm.email || !editForm.phone) {
      setError('Guest name, email and phone are required.');
      return;
    }
    setLoading('save'); setError(''); setSuccess('');
    try {
      const token = localStorage.getItem('token');
      await axios.put(`${API}/reservations/${booking._id}`, {
        guestName:       editForm.guestName,
        email:           editForm.email,
        phone:           editForm.phone,
        checkInDate:     editForm.checkInDate,
        checkOutDate:    editForm.checkOutDate,
        numberOfGuests:  Number(editForm.numberOfGuests),
        specialRequests: editForm.specialRequests,
        status:          editForm.status,
        paymentStatus:   editForm.paymentStatus,
      }, { headers: { Authorization: `Bearer ${token}` } });
      setSuccess('Booking updated successfully.');
      setTimeout(() => { onUpdated(); onClose(); }, 900);
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to save changes.');
    } finally {
      setLoading('');
    }
  };

  // ── Delete (cancel) ──────────────────────────────────────────────
  const confirmDelete = async () => {
    setLoading('delete'); setError('');
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API}/reservations/${booking._id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      onUpdated();
      onClose();
    } catch (e) {
      setError(e.response?.data?.message || 'Delete failed');
    } finally {
      setLoading('');
    }
  };

  const meta    = STATUS_META[booking.status]    || STATUS_META.pending;
  const typMeta = ROOM_TYPE_META[booking.roomType] || { label: booking.roomType, cls: '' };

  return (
    <div className="rcb-modal-overlay" onClick={onClose}>
      <div className="rcb-modal rcb-modal--detail" onClick={e => e.stopPropagation()}>

        {/* ── Modal Header ── */}
        <div className="rcb-modal-header">
          <div>
            <h2 className="rcb-modal-title">{booking.guestName}</h2>
            <p className="rcb-modal-conf">#{booking.confirmationNumber}</p>
          </div>
          <div className="rcb-detail-header-actions">
            {/* Edit toggle */}
            <button
              className={`rcb-icon-btn ${mode === 'edit' ? 'rcb-icon-btn--active-edit' : ''}`}
              onClick={() => { setMode(m => m === 'edit' ? 'view' : 'edit'); setError(''); setSuccess(''); }}
              title="Edit booking"
            >
              <Pencil size={15}/>
            </button>
            {/* Delete toggle */}
            <button
              className={`rcb-icon-btn rcb-icon-btn--danger ${mode === 'delete' ? 'rcb-icon-btn--active-delete' : ''}`}
              onClick={() => { setMode(m => m === 'delete' ? 'view' : 'delete'); setError(''); }}
              title="Delete booking"
            >
              <Trash2 size={15}/>
            </button>
            <button className="rcb-modal-close" onClick={onClose}><X size={18}/></button>
          </div>
        </div>

        {/* ── Feedback banners ── */}
        {error   && <div className="rcb-modal-error">{error}</div>}
        {success && <div className="rcb-modal-success">{success}</div>}

        {/* ══════════════ VIEW MODE ══════════════ */}
        {mode === 'view' && (
          <div className="rcb-modal-body">
            <div className="rcb-detail-badges">
              <span className={`rcb-type-badge ${typMeta.cls}`}>{typMeta.label}</span>
              <span className={`rcb-status-pill ${meta.cls}`}><meta.Icon size={12}/>{meta.label}</span>
            </div>

            <div className="rcb-detail-grid">
              <div className="rcb-detail-item">
                <span className="rcb-dl">Email</span>
                <span className="rcb-dv">{booking.email}</span>
              </div>
              <div className="rcb-detail-item">
                <span className="rcb-dl">Phone</span>
                <span className="rcb-dv">{booking.phone}</span>
              </div>
              <div className="rcb-detail-item">
                <span className="rcb-dl">Check-in</span>
                <span className="rcb-dv">{fmt(booking.checkInDate)}</span>
              </div>
              <div className="rcb-detail-item">
                <span className="rcb-dl">Check-out</span>
                <span className="rcb-dv">{fmt(booking.checkOutDate)}</span>
              </div>
              <div className="rcb-detail-item">
                <span className="rcb-dl">Rooms</span>
                <span className="rcb-dv">{booking.roomIds?.map(r => `#${r.roomNumber}`).join(', ') || '—'}</span>
              </div>
              <div className="rcb-detail-item">
                <span className="rcb-dl">Guests</span>
                <span className="rcb-dv">{booking.numberOfGuests}</span>
              </div>
              <div className="rcb-detail-item">
                <span className="rcb-dl">Total Price</span>
                <span className="rcb-dv rcb-dv--price">${booking.totalPrice?.toLocaleString()}</span>
              </div>
              <div className="rcb-detail-item">
                <span className="rcb-dl">Payment</span>
                <span className="rcb-dv">{PAYMENT_META[booking.paymentStatus] || booking.paymentStatus}</span>
              </div>
              {booking.specialRequests && (
                <div className="rcb-detail-item rcb-detail-item--full">
                  <span className="rcb-dl">Special Requests</span>
                  <span className="rcb-dv">{booking.specialRequests}</span>
                </div>
              )}
            </div>

            {/* Status transition actions */}
            <div className="rcb-detail-actions">
              {booking.status === 'pending' && (
                <button className="rcb-act rcb-act--confirm" onClick={() => updateStatus('confirmed')} disabled={loading === 'confirmed'}>
                  <CheckCircle size={15}/>{loading === 'confirmed' ? 'Confirming…' : 'Confirm'}
                </button>
              )}
              {booking.status === 'confirmed' && (
                <button className="rcb-act rcb-act--checkin" onClick={() => updateStatus('checked-in')} disabled={loading === 'checked-in'}>
                  <LogIn size={15}/>{loading === 'checked-in' ? 'Processing…' : 'Check In'}
                </button>
              )}
              {booking.status === 'checked-in' && (
                <button className="rcb-act rcb-act--checkout" onClick={() => updateStatus('checked-out')} disabled={loading === 'checked-out'}>
                  <LogOut size={15}/>{loading === 'checked-out' ? 'Processing…' : 'Check Out'}
                </button>
              )}
            </div>
          </div>
        )}

        {/* ══════════════ EDIT MODE ══════════════ */}
        {mode === 'edit' && (
          <div className="rcb-modal-body">
            <div className="rcb-modal-section-title">
              <Pencil size={12}/> Edit Booking Details
            </div>
            <div className="rcb-form-grid">
              <div className="rcb-field">
                <label><User size={13}/> Guest Name</label>
                <input
                  value={editForm.guestName}
                  onChange={e => setEditForm({...editForm, guestName: e.target.value})}
                  placeholder="Full name"
                />
              </div>
              <div className="rcb-field">
                <label><Mail size={13}/> Email</label>
                <input
                  type="email"
                  value={editForm.email}
                  onChange={e => setEditForm({...editForm, email: e.target.value})}
                  placeholder="email@example.com"
                />
              </div>
              <div className="rcb-field">
                <label><Phone size={13}/> Phone</label>
                <input
                  value={editForm.phone}
                  onChange={e => setEditForm({...editForm, phone: e.target.value})}
                  placeholder="+1 234 567 890"
                />
              </div>
              <div className="rcb-field">
                <label><Users size={13}/> No. of Guests</label>
                <input
                  type="number" min="1" max="20"
                  value={editForm.numberOfGuests}
                  onChange={e => setEditForm({...editForm, numberOfGuests: e.target.value})}
                />
              </div>
              <div className="rcb-field">
                <label><Calendar size={13}/> Check-in Date</label>
                <input
                  type="date"
                  value={editForm.checkInDate}
                  onChange={e => setEditForm({...editForm, checkInDate: e.target.value})}
                />
              </div>
              <div className="rcb-field">
                <label><Calendar size={13}/> Check-out Date</label>
                <input
                  type="date"
                  value={editForm.checkOutDate}
                  onChange={e => setEditForm({...editForm, checkOutDate: e.target.value})}
                />
              </div>
              <div className="rcb-field">
                <label>Booking Status</label>
                <div className="rcb-select-wrap">
                  <select
                    value={editForm.status}
                    onChange={e => setEditForm({...editForm, status: e.target.value})}
                  >
                    <option value="pending">Pending</option>
                    <option value="confirmed">Confirmed</option>
                    <option value="checked-in">Checked In</option>
                    <option value="checked-out">Checked Out</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                  <ChevronDown size={14} className="rcb-select-chevron"/>
                </div>
              </div>
              <div className="rcb-field">
                <label><CreditCard size={13}/> Payment Status</label>
                <div className="rcb-select-wrap">
                  <select
                    value={editForm.paymentStatus}
                    onChange={e => setEditForm({...editForm, paymentStatus: e.target.value})}
                  >
                    <option value="pending">Pending</option>
                    <option value="completed">Completed</option>
                    <option value="failed">Failed</option>
                    <option value="refunded">Refunded</option>
                  </select>
                  <ChevronDown size={14} className="rcb-select-chevron"/>
                </div>
              </div>
              <div className="rcb-field rcb-field--full">
                <label>Special Requests</label>
                <textarea
                  rows={3}
                  value={editForm.specialRequests}
                  onChange={e => setEditForm({...editForm, specialRequests: e.target.value})}
                  placeholder="Any special requests…"
                />
              </div>
            </div>

            <div className="rcb-modal-footer">
              <button className="rcb-modal-btn rcb-modal-btn--secondary" onClick={() => { setMode('view'); setError(''); }}>
                Cancel
              </button>
              <button
                className="rcb-modal-btn rcb-modal-btn--save"
                onClick={saveEdit}
                disabled={loading === 'save'}
              >
                <Save size={14}/>{loading === 'save' ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </div>
        )}

        {/* ══════════════ DELETE CONFIRM MODE ══════════════ */}
        {mode === 'delete' && (
          <div className="rcb-modal-body">
            <div className="rcb-delete-confirm">
              <div className="rcb-delete-icon-wrap">
                <AlertTriangle size={28} className="rcb-delete-icon"/>
              </div>
              <h3 className="rcb-delete-heading">Delete this booking?</h3>
              <p className="rcb-delete-desc">
                You're about to permanently cancel the booking for{' '}
                <strong>{booking.guestName}</strong> (#{booking.confirmationNumber}).
                This action cannot be undone.
              </p>
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
                  <Trash2 size={14}/>{loading === 'delete' ? 'Deleting…' : 'Yes, Delete'}
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

// ── Main Component ────────────────────────────────────────────────
const ReceptionistBookings = () => {
  const [reservations, setReservations]     = useState([]);
  const [loading, setLoading]               = useState(true);
  const [selectedDate, setSelectedDate]     = useState(new Date());
  const [filterStatus, setFilterStatus]     = useState('all');
  const [search, setSearch]                 = useState('');
  const [days]                              = useState(buildDays);
  const [dateScrollIdx, setDateScrollIdx]   = useState(0);
  const [showNewModal, setShowNewModal]     = useState(false);
  const [detailBooking, setDetailBooking]   = useState(null);

  const fetchReservations = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API}/reservations`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setReservations(res.data.data || []);
    } catch (e) {
      console.error('Failed to fetch reservations', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchReservations(); }, [fetchReservations]);

  // ── Stats for selected date ────────────────────────────────────
  const selDate = new Date(selectedDate); selDate.setHours(0,0,0,0);
  const nextDay = new Date(selDate); nextDay.setDate(selDate.getDate() + 1);

  const stats = {
    inHouse:   reservations.filter(r => r.status === 'checked-in').length,
    freeRooms: 20 - reservations.filter(r => ['confirmed','checked-in'].includes(r.status)).length,
    checkIns:  reservations.filter(r => {
      const d = new Date(r.checkInDate); return d >= selDate && d < nextDay;
    }).length,
    checkOuts: reservations.filter(r => {
      const d = new Date(r.checkOutDate); return d >= selDate && d < nextDay;
    }).length,
    staying:   reservations.filter(r => r.status === 'checked-in').length,
  };

  // ── Filter reservations ────────────────────────────────────────
  const filtered = reservations.filter(r => {
    const matchStatus = filterStatus === 'all' || r.status === filterStatus;
    const q = search.toLowerCase();
    const matchSearch = !q ||
      r.guestName?.toLowerCase().includes(q) ||
      r.email?.toLowerCase().includes(q) ||
      r.confirmationNumber?.toLowerCase().includes(q) ||
      r.roomIds?.some(rm => String(rm.roomNumber).includes(q));
    return matchStatus && matchSearch;
  });

  // ── Group by status ────────────────────────────────────────────
  const groups = {
    'checked-in':  filtered.filter(r => r.status === 'checked-in'),
    'confirmed':   filtered.filter(r => r.status === 'confirmed'),
    'pending':     filtered.filter(r => r.status === 'pending'),
    'checked-out': filtered.filter(r => r.status === 'checked-out'),
    'cancelled':   filtered.filter(r => r.status === 'cancelled'),
  };
  const GROUP_LABELS = {
    'checked-in':  'Staying',
    'confirmed':   'Arriving Soon',
    'pending':     'Pending Confirmation',
    'checked-out': 'Checked Out',
    'cancelled':   'Cancelled',
  };

  const visibleDays = days.slice(dateScrollIdx, dateScrollIdx + 11);

  return (
    <div className="rcb-page">
      {/* ── Date Strip ──────────────────────────────────────────── */}
      <div className="rcb-date-strip">
        <button className="rcb-date-nav" onClick={() => setDateScrollIdx(i => Math.max(0, i - 1))} disabled={dateScrollIdx === 0}>
          <ChevronLeft size={16}/>
        </button>
        <div className="rcb-date-list">
          {visibleDays.map((d, i) => {
            const isToday  = d.toDateString() === new Date().toDateString();
            const isSel    = d.toDateString() === selectedDate.toDateString();
            const dayResvs = reservations.filter(r => {
              const ci = new Date(r.checkInDate);  ci.setHours(0,0,0,0);
              const co = new Date(r.checkOutDate); co.setHours(0,0,0,0);
              return d >= ci && d < co;
            });
            return (
              <button
                key={i}
                className={`rcb-date-item ${isToday ? 'today' : ''} ${isSel ? 'selected' : ''}`}
                onClick={() => setSelectedDate(d)}
              >
                <span className="rcb-day-name">{d.toLocaleString('en-US', {weekday:'short'})}</span>
                <span className="rcb-day-num">{d.getDate()}</span>
                {dayResvs.length > 0 && <span className="rcb-day-dot">{dayResvs.length}</span>}
              </button>
            );
          })}
        </div>
        <button className="rcb-date-nav" onClick={() => setDateScrollIdx(i => Math.min(days.length - 11, i + 1))} disabled={dateScrollIdx >= days.length - 11}>
          <ChevronRightIcon size={16}/>
        </button>
      </div>

      {/* ── Stats Bar ───────────────────────────────────────────── */}
      <div className="rcb-stats-bar">
        <div className="rcb-stat rcb-stat--large">
          <span className="rcb-stat-num">{stats.inHouse}</span>
          <span className="rcb-stat-lbl">Guests in-house</span>
        </div>
        <div className="rcb-stat rcb-stat--large">
          <span className="rcb-stat-num">{Math.max(0, stats.freeRooms)}</span>
          <span className="rcb-stat-lbl">Rooms free</span>
        </div>
        <div className="rcb-stat-divider"/>
        <div className="rcb-stat">
          <span className="rcb-stat-num">{stats.checkIns}</span>
          <span className="rcb-stat-lbl">Check-ins</span>
        </div>
        <div className="rcb-stat">
          <span className="rcb-stat-num">{stats.checkOuts}</span>
          <span className="rcb-stat-lbl">Check-outs</span>
        </div>
        <div className="rcb-stat">
          <span className="rcb-stat-num">{stats.staying}</span>
          <span className="rcb-stat-lbl">Staying</span>
        </div>
      </div>

      {/* ── Toolbar ─────────────────────────────────────────────── */}
      <div className="rcb-toolbar">
        <div className="rcb-search-wrap">
          <Search size={15} className="rcb-search-icon"/>
          <input
            className="rcb-search"
            placeholder="Search guest, room, confirmation…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="rcb-filter-row">
          {['all','pending','confirmed','checked-in','checked-out','cancelled'].map(s => (
            <button
              key={s}
              className={`rcb-filter-btn ${filterStatus === s ? 'active' : ''}`}
              onClick={() => setFilterStatus(s)}
            >
              {s === 'all' ? 'All' : STATUS_META[s]?.label || s}
            </button>
          ))}
        </div>
        <div className="rcb-toolbar-right">
          <button className="rcb-refresh-btn" onClick={fetchReservations} title="Refresh">
            <RefreshCw size={15}/>
          </button>
          <button className="rcb-new-btn" onClick={() => setShowNewModal(true)}>
            <Plus size={16}/> New Booking
          </button>
        </div>
      </div>

      {/* ── Content ─────────────────────────────────────────────── */}
      <div className="rcb-content-area">
        {loading ? (
          <div className="rcb-loading"><div className="rcb-spinner"/><span>Loading reservations…</span></div>
        ) : filtered.length === 0 ? (
          <div className="rcb-empty">No reservations found.</div>
        ) : (
          Object.entries(groups).map(([status, items]) => {
            if (items.length === 0) return null;
            return (
              <section key={status} className="rcb-group">
                <h2 className="rcb-section-title">
                  {GROUP_LABELS[status]}{' '}
                  <span className="rcb-section-count">{items.length}</span>
                </h2>
                <div className="rcb-grid">
                  {items.map(booking => {
                    const bMeta   = STATUS_META[booking.status]    || STATUS_META.pending;
                    const typMeta = ROOM_TYPE_META[booking.roomType] || { label: booking.roomType, cls: '' };
                    const rooms   = booking.roomIds?.map(r => r.roomNumber).join(', ') || '—';
                    return (
                      <div
                        key={booking._id}
                        className="rcb-booking-card"
                        onClick={() => setDetailBooking(booking)}
                      >
                        <div className="rcb-card-top">
                          <div className="rcb-card-left">
                            <span className={`rcb-type-badge ${typMeta.cls}`}>{typMeta.label.toUpperCase()}</span>
                            <span className="rcb-room-nums">{rooms}</span>
                          </div>
                          <span className={`rcb-status-pill ${bMeta.cls}`}>
                            <bMeta.Icon size={11}/>{bMeta.label}
                          </span>
                        </div>
                        <div className="rcb-guest-name">{booking.guestName}</div>
                        <div className="rcb-guest-sub">{booking.email}</div>
                        <div className="rcb-dates">
                          <span className="rcb-date-range">{fmtShort(booking.checkInDate)}</span>
                          <ArrowRightLeft size={12} className="rcb-date-arrow"/>
                          <span className="rcb-date-range">{fmtShort(booking.checkOutDate)}</span>
                        </div>
                        <div className="rcb-card-footer">
                          <span className="rcb-price">
                            <CreditCard size={12}/>${booking.totalPrice?.toLocaleString() || 0}
                          </span>
                          <span className="rcb-guests-count">
                            <Users size={12}/>{booking.numberOfGuests}
                          </span>
                          <span className="rcb-rooms-count">
                            <BedDouble size={12}/>{booking.numberOfRooms}
                          </span>
                          {booking.paymentStatus === 'completed' && (
                            <span className="rcb-invoiced-badge"><CheckCircle size={11}/>Invoiced</span>
                          )}
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

      {/* ── Modals ──────────────────────────────────────────────── */}
      {showNewModal && (
        <NewBookingModal onClose={() => setShowNewModal(false)} onCreated={fetchReservations}/>
      )}
      {detailBooking && (
        <BookingDetailModal
          booking={detailBooking}
          onClose={() => setDetailBooking(null)}
          onUpdated={fetchReservations}
        />
      )}
    </div>
  );
};

export default ReceptionistBookings;