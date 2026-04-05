// frontend/src/pages/housekeeper/RoomManagement.jsx
//
// Endpoints:
//   GET  /api/rooms                          → { success, count, data: Room[] }  (filtered to assigned rooms)
//   PUT  /api/rooms/:id                      → { success, data: Room }
//   POST /api/reservations/room-statuses     → { success, data: { [roomId]: { bookingStatus, guestName, ... } } }

import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import {
  BedDouble, Search, RefreshCw, Filter,
  CheckCircle, Wrench, Sparkles, Edit3,
  Save, X, AlertCircle, Layers, Users,
  Tag, Wifi, Tv, Wind, Wine, Droplets, Zap, Shield, FileText,
  ClipboardList, CalendarCheck, Clock, Ban, LogOut, HelpCircle,
} from 'lucide-react';
import './RoomManagement.css';
import housekeeper from '../../assets/housekeeper.jpeg';


const API = process.env.REACT_APP_API_URL;
const getAuthHeaders = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
});

const STATUS_META = {
  available:   { label: 'Available',   cls: 'rm-pill--green',  Icon: CheckCircle },
  occupied:    { label: 'Occupied',    cls: 'rm-pill--blue',   Icon: BedDouble   },
  maintenance: { label: 'Maintenance', cls: 'rm-pill--amber',  Icon: Wrench      },
  cleaning:    { label: 'Cleaning',    cls: 'rm-pill--purple', Icon: Sparkles    },
};

// Booking status display config
const BOOKING_STATUS_META = {
  'pending':      { label: 'Pending',      cls: 'rm-bpill--orange', Icon: Clock         },
  'confirmed':    { label: 'Confirmed',    cls: 'rm-bpill--blue',   Icon: CalendarCheck },
  'checked-in':   { label: 'Checked In',   cls: 'rm-bpill--green',  Icon: CheckCircle   },
  'checked-out':  { label: 'Checked Out',  cls: 'rm-bpill--gray',   Icon: LogOut        },
  'cancelled':    { label: 'Cancelled',    cls: 'rm-bpill--red',    Icon: Ban           },
};
const BOOKING_STATUS_NONE = { label: 'Not Booked', cls: 'rm-bpill--none', Icon: HelpCircle };

const TYPE_COLORS = {
  single: '#6366f1', double: '#0ea5e9',
  deluxe: '#f59e0b', suite:  '#ec4899', family: '#10b981',
};

const AMENITY_OPTIONS = ['wifi', 'pool', 'spa', 'restaurant', 'bar', 'gym', 'tv', 'ac'];
const AMENITY_LABELS  = { wifi: 'WiFi', pool: 'Pool', spa: 'Spa', restaurant: 'Restaurant', bar: 'Bar', gym: 'Gym', tv: 'TV', ac: 'AC' };
const AMENITY_ICONS   = { wifi: Wifi, pool: Droplets, spa: Sparkles, restaurant: Zap, bar: Wine, gym: Shield, tv: Tv, ac: Wind };
const EDITABLE_STATUSES = ['available', 'occupied', 'maintenance', 'cleaning'];

const RoomManagement = () => {
  const [rooms, setRooms]           = useState([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch]         = useState('');
  const [filterType, setFilterType]       = useState('all');
  const [filterStatus, setFilterStatus]   = useState('all');
  const [filterBooking, setFilterBooking] = useState('all');
  const [error, setError]           = useState('');
  const [user, setUser]             = useState({});

  // Booking status map: roomId → { bookingStatus, guestName, ... }
  const [bookingStatusMap, setBookingStatusMap]         = useState({});
  const [bookingStatusLoading, setBookingStatusLoading] = useState(false);

  // Inline edit state
  const [editingId, setEditingId]     = useState(null);
  const [editForm, setEditForm]       = useState({});
  const [saving, setSaving]           = useState(false);
  const [saveError, setSaveError]     = useState('');
  const [saveSuccess, setSaveSuccess] = useState('');

  // ── Fetch booking statuses for a list of room objects ─────────────────
  const fetchBookingStatuses = useCallback(async (roomList) => {
    if (!roomList || roomList.length === 0) return;
    setBookingStatusLoading(true);
    try {
      const ids = roomList.map(r => r._id);
      const res = await axios.post(
        `${API}/reservations/room-statuses`,
        { roomIds: ids },
        getAuthHeaders(),
      );
      setBookingStatusMap(res.data?.data ?? {});
    } catch (err) {
      console.error('Failed to load booking statuses:', err.message);
      // Non-fatal — table still renders, booking column shows "Not Booked"
    } finally {
      setBookingStatusLoading(false);
    }
  }, []);

  const fetchRooms = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/rooms`, getAuthHeaders());
      const fetched = res.data?.data ?? [];
      setRooms(fetched);
      fetchBookingStatuses(fetched);
    } catch {
      setError('Failed to load rooms.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [fetchBookingStatuses]);

  useEffect(() => { fetchRooms(); }, [fetchRooms]);

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (stored) setUser(JSON.parse(stored));
  }, []);

  const handleRefresh = () => { setRefreshing(true); fetchRooms(); };

  const startEdit = (room, e) => {
    e.stopPropagation();
    setEditingId(room._id);
    setEditForm({
      status:            room.status            || 'available',
      floor:             room.floor             ?? '',
      capacity:          room.capacity          ?? '',
      amenities:         room.amenities         || [],
      maintenanceReason: room.maintenanceReason || '',
    });
    setSaveError('');
    setSaveSuccess('');
  };

  const cancelEdit = (e) => {
    e?.stopPropagation();
    setEditingId(null);
    setEditForm({});
    setSaveError('');
  };

  const toggleAmenity = (a) =>
    setEditForm(p => ({
      ...p,
      amenities: p.amenities.includes(a)
        ? p.amenities.filter(x => x !== a)
        : [...p.amenities, a],
    }));

  const handleSave = async (room, e) => {
    e.stopPropagation();

    if (editForm.status === 'maintenance' && !editForm.maintenanceReason?.trim()) {
      setSaveError('Please provide a maintenance reason before saving.');
      return;
    }

    setSaving(true);
    setSaveError('');

    const isLeavingMaintenance = editForm.status !== 'maintenance';

    try {
      const payload = {
        ...room,
        status:            editForm.status,
        floor:             Number(editForm.floor),
        capacity:          Number(editForm.capacity),
        amenities:         editForm.amenities,
        maintenanceReason: isLeavingMaintenance
          ? null
          : editForm.maintenanceReason.trim(),
      };

      const res = await axios.put(`${API}/rooms/${room._id}`, payload, getAuthHeaders());

      const serverData = res.data?.data ?? res.data;
      const updated = {
        ...room,
        ...serverData,
        maintenanceReason: payload.maintenanceReason,
      };

      setRooms(prev => prev.map(r => r._id === room._id ? updated : r));
      setEditingId(null);
      setSaveSuccess('Room updated successfully!');
      setTimeout(() => setSaveSuccess(''), 2500);
    } catch (err) {
      setSaveError(err.response?.data?.message || 'Failed to save changes.');
    } finally {
      setSaving(false);
    }
  };

  const filtered = rooms.filter(r => {
    const matchSearch = search === '' ||
      r.roomNumber.toLowerCase().includes(search.toLowerCase()) ||
      r.roomType.toLowerCase().includes(search.toLowerCase());
    const matchType   = filterType   === 'all' || r.roomType === filterType;
    const matchStatus = filterStatus === 'all' || r.status   === filterStatus;

    const bStatus = bookingStatusMap[r._id]?.bookingStatus ?? null;
    const matchBooking = filterBooking === 'all' ||
      (filterBooking === 'not-booked' ? bStatus === null : bStatus === filterBooking);

    return matchSearch && matchType && matchStatus && matchBooking;
  });

  const maintenanceLog = rooms.filter(
    r => r.status === 'maintenance' && r.maintenanceReason?.trim()
  );

  const counts = {
    total:       rooms.length,
    available:   rooms.filter(r => r.status === 'available').length,
    occupied:    rooms.filter(r => r.status === 'occupied').length,
    maintenance: rooms.filter(r => r.status === 'maintenance').length,
    cleaning:    rooms.filter(r => r.status === 'cleaning').length,
  };

  if (loading) {
    return (
      <div className="rm-loading">
        <div className="rm-spinner" />
        <p>Loading rooms…</p>
      </div>
    );
  }

  return (
    <div className="rm-root">

      {/* ── Page Header ── */}
      <div className="rm-page-header">
        <div>
          <h2 className="rm-greeting">
            Welcome back, <strong>{user?.fullName || 'Housekeeper'}</strong>
          </h2>
          <p className="rm-date">
            {new Date().toLocaleDateString('en-US', {
              weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
            })}
            {rooms.length > 0 && (
              <span className="rm-assigned-count">
                &nbsp;·&nbsp;{rooms.length} room{rooms.length !== 1 ? 's' : ''} assigned to you
              </span>
            )}
          </p>
        </div>

        <div className="rm-header-right">
          <button
            className={`rm-icon-btn ${refreshing ? 'spinning' : ''}`}
            onClick={handleRefresh}
            title="Refresh"
          >
            <RefreshCw size={16} />
          </button>
          <span className="rm-role-pill">Housekeeper</span>
          <img
            src={housekeeper}
            alt="avatar"
            className="rm-header-avatar"
          />
        </div>
      </div>

      {/* ── Alerts ── */}
      {saveSuccess && (
        <div className="rm-alert rm-alert--success">
          <CheckCircle size={14} /> {saveSuccess}
        </div>
      )}
      {saveError && (
        <div className="rm-alert rm-alert--error">
          <AlertCircle size={14} /> {saveError}
        </div>
      )}

      {/* ── Summary Cards ── */}
      <div className="rm-summary-row">
        {[
          { label: 'Total',       value: counts.total,       color: '#6366f1', bg: '#eef2ff' },
          { label: 'Available',   value: counts.available,   color: '#10b981', bg: '#f0fdf4' },
          { label: 'Occupied',    value: counts.occupied,    color: '#0ea5e9', bg: '#f0f9ff' },
          { label: 'Maintenance', value: counts.maintenance, color: '#f59e0b', bg: '#fffbeb' },
          { label: 'Cleaning',    value: counts.cleaning,    color: '#7c3aed', bg: '#f5f3ff' },
        ].map(({ label, value, color, bg }) => (
          <div
            className="rm-summary-card"
            key={label}
            style={{ '--card-color': color, '--card-bg': bg }}
          >
            <span className="rm-summary-value">{value}</span>
            <span className="rm-summary-label">{label}</span>
          </div>
        ))}
      </div>

      {/* ── Filters ── */}
      <div className="rm-filters">
        <div className="rm-search-wrap">
          <Search size={15} className="rm-search-icon" />
          <input
            className="rm-search"
            placeholder="Search by room number or type…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="rm-filter-group">
          <Filter size={14} />
          <select value={filterType} onChange={e => setFilterType(e.target.value)}>
            <option value="all">All Types</option>
            {['single','double','deluxe','suite','family'].map(t => (
              <option key={t} value={t}>{t.charAt(0).toUpperCase()+t.slice(1)}</option>
            ))}
          </select>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="all">All Statuses</option>
            {EDITABLE_STATUSES.map(s => (
              <option key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</option>
            ))}
          </select>
          <select value={filterBooking} onChange={e => setFilterBooking(e.target.value)}>
            <option value="all">All Bookings</option>
            <option value="not-booked">Not Booked</option>
            <option value="pending">Pending</option>
            <option value="confirmed">Confirmed</option>
            <option value="checked-in">Checked In</option>
            <option value="checked-out">Checked Out</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {error && <p className="rm-error">{error}</p>}

      {/* ── Main Rooms Table ── */}
      {filtered.length === 0 ? (
        <div className="rm-empty">
          <BedDouble size={40} />
          {rooms.length === 0 ? (
            <>
              <p>No rooms are currently assigned to you.</p>
              <p className="rm-empty-sub">Contact your admin to get rooms assigned to your account.</p>
            </>
          ) : (
            <p>No rooms match your filters.</p>
          )}
        </div>
      ) : (
        <div className="rm-table-wrap">
          <table className="rm-table">
            <thead>
              <tr>
                <th>Room</th>
                <th>Type</th>
                <th>Floor</th>
                <th>Capacity</th>
                <th>Room Status</th>
                <th className="rm-th-booking">
                  Booking Status
                  {bookingStatusLoading && (
                    <span className="rm-bstatus-loading-dot" title="Loading…" />
                  )}
                </th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((room) => {
                const sm        = STATUS_META[room.status] || STATUS_META.available;
                const isEditing = editingId === room._id;
                const isMaintenance = isEditing
                  ? editForm.status === 'maintenance'
                  : room.status === 'maintenance';

                // Booking status for this room
                const bInfo = bookingStatusMap[room._id];
                const bKey  = bInfo?.bookingStatus ?? null;
                const bMeta = (bKey && BOOKING_STATUS_META[bKey]) || BOOKING_STATUS_NONE;
                const BIcon = bMeta.Icon;

                return (
                  <React.Fragment key={room._id}>
                    <tr className={`rm-row ${isEditing ? 'rm-row--editing' : ''}`}>

                      {/* Room */}
                      <td><span className="rm-room-num">#{room.roomNumber}</span></td>

                      {/* Type */}
                      <td>
                        <span
                          className="rm-type-badge"
                          style={{ '--type-color': TYPE_COLORS[room.roomType] || '#6366f1' }}
                        >
                          {room.roomType}
                        </span>
                      </td>

                      {/* Floor */}
                      <td>
                        {isEditing ? (
                          <input
                            className="rm-inline-input"
                            type="number" min="0"
                            value={editForm.floor}
                            onChange={e => setEditForm(p => ({ ...p, floor: e.target.value }))}
                            onClick={e => e.stopPropagation()}
                          />
                        ) : (
                          <span className="rm-cell-text">
                            <Layers size={12} className="rm-cell-icon" /> {room.floor}
                          </span>
                        )}
                      </td>

                      {/* Capacity */}
                      <td>
                        {isEditing ? (
                          <input
                            className="rm-inline-input rm-inline-input--sm"
                            type="number" min="1" max="10"
                            value={editForm.capacity}
                            onChange={e => setEditForm(p => ({ ...p, capacity: e.target.value }))}
                            onClick={e => e.stopPropagation()}
                          />
                        ) : (
                          <span className="rm-cell-text">
                            <Users size={12} className="rm-cell-icon" />
                            {room.capacity} guest{room.capacity !== 1 ? 's' : ''}
                          </span>
                        )}
                      </td>

                      {/* Room Status */}
                      <td>
                        {isEditing ? (
                          <select
                            className="rm-inline-select"
                            value={editForm.status}
                            onChange={e => setEditForm(p => ({
                              ...p,
                              status: e.target.value,
                              maintenanceReason: e.target.value !== 'maintenance' ? '' : p.maintenanceReason,
                            }))}
                            onClick={e => e.stopPropagation()}
                          >
                            {EDITABLE_STATUSES.map(s => (
                              <option key={s} value={s}>
                                {s.charAt(0).toUpperCase() + s.slice(1)}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span className={`rm-status-pill ${sm.cls}`}>
                            <sm.Icon size={11} /> {sm.label}
                          </span>
                        )}
                      </td>

                      {/* Booking Status */}
                      <td>
                        {bookingStatusLoading && bKey === null && !bookingStatusMap[room._id] ? (
                          <span className="rm-bstatus-skeleton" />
                        ) : (
                          <div className="rm-bstatus-wrap">
                            <span className={`rm-booking-pill ${bMeta.cls}`}>
                              <BIcon size={11} /> {bMeta.label}
                            </span>
                            {/* Show guest name under the pill for active bookings */}
                            {bInfo?.guestName && bKey !== 'cancelled' && bKey !== null && (
                              <span className="rm-bstatus-guest">{bInfo.guestName}</span>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Actions */}
                      <td onClick={e => e.stopPropagation()}>
                        {isEditing ? (
                          <div className="rm-action-btns">
                            <button
                              className="rm-act-btn rm-act-save"
                              onClick={(e) => handleSave(room, e)}
                              disabled={saving}
                              title="Save"
                            >
                              <Save size={14} />
                              <span>{saving ? 'Saving…' : 'Save'}</span>
                            </button>
                            <button
                              className="rm-act-btn rm-act-cancel"
                              onClick={cancelEdit}
                              title="Cancel"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        ) : (
                          <button
                            className="rm-act-btn rm-act-edit"
                            onClick={(e) => startEdit(room, e)}
                            title="Edit room"
                          >
                            <Edit3 size={14} />
                            <span>Edit</span>
                          </button>
                        )}
                      </td>
                    </tr>

                    {/* Expanded panel — amenities + maintenance reason */}
                    {isEditing && (
                      <tr className="rm-amenity-row">
                        <td colSpan={7}>
                          <div className="rm-amenity-panel">

                            {isMaintenance && (
                              <div className="rm-maintenance-block">
                                <p className="rm-amenity-panel-label rm-maintenance-label">
                                  <Wrench size={12} /> Maintenance Reason
                                  <span className="rm-required-badge">Required</span>
                                </p>
                                <textarea
                                  className={`rm-maintenance-textarea ${
                                    !editForm.maintenanceReason?.trim() ? 'rm-maintenance-textarea--error' : ''
                                  }`}
                                  placeholder="Describe the maintenance issue (e.g. AC unit not working, plumbing leak…)"
                                  value={editForm.maintenanceReason}
                                  rows={3}
                                  maxLength={500}
                                  onClick={e => e.stopPropagation()}
                                  onChange={e => setEditForm(p => ({
                                    ...p,
                                    maintenanceReason: e.target.value,
                                  }))}
                                />
                                <div className="rm-maintenance-footer">
                                  {!editForm.maintenanceReason?.trim() && (
                                    <span className="rm-maintenance-hint">
                                      <AlertCircle size={11} /> A reason is required for maintenance status
                                    </span>
                                  )}
                                  <span className="rm-char-count">
                                    {(editForm.maintenanceReason || '').length} / 500
                                  </span>
                                </div>
                              </div>
                            )}

                            <p className="rm-amenity-panel-label">
                              <Tag size={12} /> Amenities
                            </p>
                            <div className="rm-amenity-chips">
                              {AMENITY_OPTIONS.map(a => {
                                const AIcon  = AMENITY_ICONS[a] || Zap;
                                const active = editForm.amenities.includes(a);
                                return (
                                  <button
                                    key={a}
                                    type="button"
                                    className={`rm-amenity-chip ${active ? 'rm-amenity-chip--active' : ''}`}
                                    onClick={() => toggleAmenity(a)}
                                  >
                                    <AIcon size={13} /> {AMENITY_LABELS[a]}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
          <p className="rm-table-count">
            Showing {filtered.length} of {rooms.length} assigned room{rooms.length !== 1 ? 's' : ''}
          </p>
        </div>
      )}

      {/* ── Maintenance Log Table ── */}
      {maintenanceLog.length > 0 && (
        <div className="rm-mlog-section">
          <div className="rm-mlog-header">
            <ClipboardList size={16} className="rm-mlog-header-icon" />
            <h3 className="rm-mlog-title">Active Maintenance Log</h3>
            <span className="rm-mlog-badge">{maintenanceLog.length}</span>
            <span className="rm-mlog-subtitle">
              — Records auto-clear when room status changes
            </span>
          </div>

          <div className="rm-mlog-table-wrap">
            <table className="rm-mlog-table">
              <thead>
                <tr>
                  <th>Room No.</th>
                  <th>Room Type</th>
                  <th>Floor</th>
                  <th>Status</th>
                  <th>Maintenance Reason</th>
                </tr>
              </thead>
              <tbody>
                {maintenanceLog.map(room => (
                  <tr key={room._id} className="rm-mlog-row">
                    <td>
                      <span className="rm-mlog-room-num">#{room.roomNumber}</span>
                    </td>
                    <td>
                      <span
                        className="rm-type-badge"
                        style={{ '--type-color': TYPE_COLORS[room.roomType] || '#6366f1' }}
                      >
                        {room.roomType}
                      </span>
                    </td>
                    <td>
                      <span className="rm-cell-text">
                        <Layers size={12} className="rm-cell-icon" /> {room.floor}
                      </span>
                    </td>
                    <td>
                      <span className="rm-status-pill rm-pill--amber">
                        <Wrench size={11} /> Maintenance
                      </span>
                    </td>
                    <td>
                      <div className="rm-mlog-reason">
                        <FileText size={13} className="rm-mlog-reason-icon" />
                        <span>{room.maintenanceReason}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
};

export default RoomManagement;