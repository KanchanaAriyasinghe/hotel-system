// frontend/src/pages/housekeeper/HousekeeperRoomsView.jsx
//
// Read-only view of ALL hotel rooms for housekeepers.
// Endpoint: GET /api/rooms/all  →  { success, count, data: Room[] }
//           POST /api/reservations/room-statuses → { success, data: { [roomId]: { bookingStatus, ... } } }
//
// Columns: Room · Type · Floor · Capacity · Status · Booking Status · Actions
// Pagination: 5 rows per page with prev/next controls.

import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import {
  BedDouble, Search, RefreshCw, Filter,
  CheckCircle, Wrench, Sparkles, X,
  DollarSign, Users, Layers, Tag, FileText,
  Wifi, Tv, Wind, Wine, Droplets, Shield, Zap,
  ImageIcon, Eye, AlertCircle,
  ChevronLeft, ChevronRight,
  CalendarCheck, Clock, Ban, LogOut, HelpCircle,
} from 'lucide-react';
import './HousekeeperRoomsView.css';

const API = process.env.REACT_APP_API_URL;
const getAuthHeaders = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
});

const ROWS_PER_PAGE = 5;

const STATUS_META = {
  available:   { label: 'Available',   cls: 'hrv-pill--green',  Icon: CheckCircle },
  occupied:    { label: 'Occupied',    cls: 'hrv-pill--blue',   Icon: BedDouble   },
  maintenance: { label: 'Maintenance', cls: 'hrv-pill--amber',  Icon: Wrench      },
  cleaning:    { label: 'Cleaning',    cls: 'hrv-pill--purple', Icon: Sparkles    },
};

const BOOKING_STATUS_META = {
  'pending':     { label: 'Pending',     cls: 'hrv-bpill--orange', Icon: Clock         },
  'confirmed':   { label: 'Confirmed',   cls: 'hrv-bpill--blue',   Icon: CalendarCheck },
  'checked-in':  { label: 'Checked In',  cls: 'hrv-bpill--green',  Icon: CheckCircle   },
  'checked-out': { label: 'Checked Out', cls: 'hrv-bpill--gray',   Icon: LogOut        },
  'cancelled':   { label: 'Cancelled',   cls: 'hrv-bpill--red',    Icon: Ban           },
};
const BOOKING_STATUS_NONE = { label: 'Not Booked', cls: 'hrv-bpill--none', Icon: HelpCircle };

const TYPE_COLORS = {
  single: '#6366f1', double: '#0ea5e9',
  deluxe: '#f59e0b', suite: '#ec4899', family: '#10b981',
};

const AMENITY_LABELS = {
  wifi: 'WiFi', pool: 'Pool', spa: 'Spa',
  restaurant: 'Restaurant', bar: 'Bar', gym: 'Gym', tv: 'TV', ac: 'AC',
};
const AMENITY_ICONS = {
  wifi: Wifi, pool: Droplets, spa: Sparkles,
  restaurant: Zap, bar: Wine, gym: Shield, tv: Tv, ac: Wind,
};

// ── Detail Side Panel ───────────────────────────────────────────────────────
const RoomDetailPanel = ({ room, onClose }) => {
  if (!room) return null;

  const sm = STATUS_META[room.status] || STATUS_META.available;
  const typeColor = TYPE_COLORS[room.roomType] || '#6366f1';

  return (
    <aside className="hrv-detail-panel">
      <div className="hrv-panel-header">
        <span className="hrv-panel-title">Room #{room.roomNumber}</span>
        <button className="hrv-panel-close" onClick={onClose} title="Close">
          <X size={18} />
        </button>
      </div>

      <div className="hrv-panel-body">

        {/* Hero */}
        <div className="hrv-panel-hero" style={{ '--hero-color': typeColor }}>
          <div className="hrv-panel-hero-icon">
            <BedDouble size={26} />
          </div>
          <div className="hrv-panel-hero-info">
            <span className="hrv-panel-hero-num">#{room.roomNumber}</span>
            <div className="hrv-panel-hero-badges">
              <span className="hrv-type-badge" style={{ '--type-color': typeColor }}>
                {room.roomType}
              </span>
              <span className={`hrv-status-pill ${sm.cls}`}>
                <sm.Icon size={11} /> {sm.label}
              </span>
            </div>
          </div>
        </div>

        {/* Core details */}
        <section className="hrv-panel-section">
          <h3 className="hrv-panel-section-title"><Tag size={13} /> Details</h3>
          <div className="hrv-detail-grid">
            <div className="hrv-detail-item">
              <span className="hrv-detail-key"><Layers size={12} /> Floor</span>
              <span className="hrv-detail-val">Floor {room.floor}</span>
            </div>
            <div className="hrv-detail-item">
              <span className="hrv-detail-key"><Users size={12} /> Capacity</span>
              <span className="hrv-detail-val">{room.capacity} guest{room.capacity !== 1 ? 's' : ''}</span>
            </div>
            <div className="hrv-detail-item">
              <span className="hrv-detail-key"><DollarSign size={12} /> Price / Night</span>
              <span className="hrv-detail-val hrv-detail-val--price">${room.pricePerNight}</span>
            </div>
            <div className="hrv-detail-item">
              <span className="hrv-detail-key">Active</span>
              <span className={`hrv-detail-val ${room.isActive ? 'hrv-active' : 'hrv-inactive'}`}>
                {room.isActive ? 'Yes' : 'No'}
              </span>
            </div>
          </div>
          {room.description && (
            <div className="hrv-detail-desc">
              <span className="hrv-detail-key"><FileText size={12} /> Description</span>
              <p className="hrv-detail-desc-text">{room.description}</p>
            </div>
          )}
        </section>

        {/* Amenities */}
        {room.amenities?.length > 0 && (
          <section className="hrv-panel-section">
            <h3 className="hrv-panel-section-title"><Sparkles size={13} /> Amenities</h3>
            <div className="hrv-amenity-grid">
              {room.amenities.map(a => {
                const AIcon = AMENITY_ICONS[a] || Zap;
                return (
                  <div key={a} className="hrv-amenity-chip hrv-amenity-chip--active">
                    <AIcon size={13} /> {AMENITY_LABELS[a] || a}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Images */}
        {room.images?.length > 0 && (
          <section className="hrv-panel-section">
            <h3 className="hrv-panel-section-title"><ImageIcon size={13} /> Images</h3>
            <div className="hrv-img-gallery">
              {room.images.map((url, i) => (
                <div key={i} className="hrv-img-item">
                  <img
                    src={url}
                    alt={`Room ${room.roomNumber} #${i + 1}`}
                    onError={e => { e.target.style.display = 'none'; }}
                  />
                  <a href={url} target="_blank" rel="noreferrer" className="hrv-img-link">
                    <Eye size={12} />
                  </a>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Assigned Housekeeper */}
        {room.assignedHousekeeper && (
          <section className="hrv-panel-section">
            <h3 className="hrv-panel-section-title"><Users size={13} /> Assigned Housekeeper</h3>
            <div className="hrv-meta-list">
              <div className="hrv-meta-item">
                <span className="hrv-meta-key">Name</span>
                <span className="hrv-meta-val">{room.assignedHousekeeper.fullName || '—'}</span>
              </div>
              {room.assignedHousekeeper.email && (
                <div className="hrv-meta-item">
                  <span className="hrv-meta-key">Email</span>
                  <span className="hrv-meta-val">{room.assignedHousekeeper.email}</span>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Meta */}
        <section className="hrv-panel-section">
          <h3 className="hrv-panel-section-title"><FileText size={13} /> Meta</h3>
          <div className="hrv-meta-list">
            <div className="hrv-meta-item">
              <span className="hrv-meta-key">Room ID</span>
              <span className="hrv-meta-id">{room._id}</span>
            </div>
            {room.createdAt && (
              <div className="hrv-meta-item">
                <span className="hrv-meta-key">Created</span>
                <span className="hrv-meta-val">
                  {new Date(room.createdAt).toLocaleDateString('en-US', {
                    year: 'numeric', month: 'short', day: 'numeric',
                  })}
                </span>
              </div>
            )}
            {room.updatedAt && (
              <div className="hrv-meta-item">
                <span className="hrv-meta-key">Last Updated</span>
                <span className="hrv-meta-val">
                  {new Date(room.updatedAt).toLocaleDateString('en-US', {
                    year: 'numeric', month: 'short', day: 'numeric',
                  })}
                </span>
              </div>
            )}
          </div>
        </section>

      </div>
    </aside>
  );
};

// ── Main Component ───────────────────────────────────────────────────────────
const HousekeeperRoomsView = () => {
  const [rooms, setRooms]               = useState([]);
  const [loading, setLoading]           = useState(true);
  const [refreshing, setRefreshing]     = useState(false);
  const [search, setSearch]             = useState('');
  const [filterType, setFilterType]     = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterBooking, setFilterBooking] = useState('all');
  const [error, setError]               = useState('');
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [page, setPage]                 = useState(1);

  // Booking status map: roomId → { bookingStatus, guestName, ... }
  const [bookingStatusMap, setBookingStatusMap]         = useState({});
  const [bookingStatusLoading, setBookingStatusLoading] = useState(false);

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
    } finally {
      setBookingStatusLoading(false);
    }
  }, []);

  const fetchRooms = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/rooms/all`, getAuthHeaders());
      const fetched = res.data?.data ?? [];
      setRooms(fetched);
      setError('');
      fetchBookingStatuses(fetched);
    } catch {
      setError('Failed to load rooms.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [fetchBookingStatuses]);

  useEffect(() => { fetchRooms(); }, [fetchRooms]);

  const handleRefresh = () => { setRefreshing(true); fetchRooms(); };

  // Reset to page 1 whenever filters change
  useEffect(() => { setPage(1); }, [search, filterType, filterStatus, filterBooking]);

  const filtered = rooms.filter(r => {
    const q = search.toLowerCase();
    const matchSearch = !q ||
      r.roomNumber?.toLowerCase().includes(q) ||
      r.roomType?.toLowerCase().includes(q);
    const matchType   = filterType   === 'all' || r.roomType === filterType;
    const matchStatus = filterStatus === 'all' || r.status   === filterStatus;

    const bStatus = bookingStatusMap[r._id]?.bookingStatus ?? null;
    const matchBooking = filterBooking === 'all' ||
      (filterBooking === 'not-booked' ? bStatus === null : bStatus === filterBooking);

    return matchSearch && matchType && matchStatus && matchBooking;
  });

  // Pagination math
  const totalPages = Math.max(1, Math.ceil(filtered.length / ROWS_PER_PAGE));
  const safePage   = Math.min(page, totalPages);
  const startIdx   = (safePage - 1) * ROWS_PER_PAGE;
  const pageRows   = filtered.slice(startIdx, startIdx + ROWS_PER_PAGE);

  const counts = {
    total:       rooms.length,
    available:   rooms.filter(r => r.status === 'available').length,
    occupied:    rooms.filter(r => r.status === 'occupied').length,
    maintenance: rooms.filter(r => r.status === 'maintenance').length,
  };

  if (loading) {
    return (
      <div className="hrv-loading">
        <div className="hrv-spinner" />
        <p>Loading rooms…</p>
      </div>
    );
  }

  return (
    <div className={`hrv-root${selectedRoom ? ' hrv-root--panel-open' : ''}`}>

      <div className="hrv-main">

        {/* Header */}
        <div className="hrv-page-header">
          <div className="hrv-page-title">
            <BedDouble size={22} />
            <div>
              <h1>All Rooms</h1>
              <p className="hrv-page-sub">View all hotel rooms — read only</p>
            </div>
          </div>
          <button
            className={`hrv-icon-btn ${refreshing ? 'spinning' : ''}`}
            onClick={handleRefresh}
            title="Refresh"
          >
            <RefreshCw size={16} />
          </button>
        </div>

        {/* Summary cards */}
        <div className="hrv-summary-row">
          {[
            { label: 'Total',       value: counts.total,       color: '#6366f1', bg: '#eef2ff' },
            { label: 'Available',   value: counts.available,   color: '#10b981', bg: '#f0fdf4' },
            { label: 'Occupied',    value: counts.occupied,    color: '#0ea5e9', bg: '#f0f9ff' },
            { label: 'Maintenance', value: counts.maintenance, color: '#f59e0b', bg: '#fffbeb' },
          ].map(({ label, value, color, bg }) => (
            <div key={label} className="hrv-summary-card"
              style={{ '--card-color': color, '--card-bg': bg }}>
              <span className="hrv-summary-value">{value}</span>
              <span className="hrv-summary-label">{label}</span>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="hrv-filters">
          <div className="hrv-search-wrap">
            <Search size={15} className="hrv-search-icon" />
            <input
              className="hrv-search"
              placeholder="Search by room number or type…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="hrv-filter-group">
            <Filter size={14} />
            <select value={filterType} onChange={e => setFilterType(e.target.value)}>
              <option value="all">All Types</option>
              {['single', 'double', 'deluxe', 'suite', 'family'].map(t => (
                <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
              ))}
            </select>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
              <option value="all">All Statuses</option>
              {['available', 'occupied', 'maintenance', 'cleaning'].map(s => (
                <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
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

        {error && (
          <p className="hrv-error"><AlertCircle size={14} /> {error}</p>
        )}

        {/* Table */}
        {filtered.length === 0 ? (
          <div className="hrv-empty">
            <BedDouble size={40} />
            <p>{rooms.length === 0 ? 'No rooms available.' : 'No rooms match your filters.'}</p>
          </div>
        ) : (
          <div className="hrv-table-wrap">
            <table className="hrv-table">
              <thead>
                <tr>
                  <th>Room</th>
                  <th>Type</th>
                  <th>Floor</th>
                  <th>Capacity</th>
                  <th>Room Status</th>
                  <th className="hrv-th-booking">
                    Booking Status
                    {bookingStatusLoading && (
                      <span className="hrv-bstatus-loading-dot" title="Loading…" />
                    )}
                  </th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((room, i) => {
                  const sm = STATUS_META[room.status] || STATUS_META.available;
                  const isSelected = selectedRoom?._id === room._id;

                  const bInfo = bookingStatusMap[room._id];
                  const bKey  = bInfo?.bookingStatus ?? null;
                  const bMeta = (bKey && BOOKING_STATUS_META[bKey]) || BOOKING_STATUS_NONE;
                  const BIcon = bMeta.Icon;

                  return (
                    <tr
                      key={room._id || i}
                      className={`hrv-row${isSelected ? ' hrv-row--selected' : ''}`}
                      onClick={() => setSelectedRoom(isSelected ? null : room)}
                    >
                      <td><span className="hrv-room-num">#{room.roomNumber}</span></td>
                      <td>
                        <span
                          className="hrv-type-badge"
                          style={{ '--type-color': TYPE_COLORS[room.roomType] || '#6366f1' }}
                        >
                          {room.roomType}
                        </span>
                      </td>
                      <td className="hrv-muted">Floor {room.floor}</td>
                      <td className="hrv-muted">{room.capacity} guest{room.capacity !== 1 ? 's' : ''}</td>
                      <td>
                        <span className={`hrv-status-pill ${sm.cls}`}>
                          <sm.Icon size={11} /> {sm.label}
                        </span>
                      </td>

                      {/* Booking Status */}
                      <td onClick={e => e.stopPropagation()}>
                        {bookingStatusLoading && !bookingStatusMap[room._id] ? (
                          <span className="hrv-bstatus-skeleton" />
                        ) : (
                          <div className="hrv-bstatus-wrap">
                            <span className={`hrv-booking-pill ${bMeta.cls}`}>
                              <BIcon size={11} /> {bMeta.label}
                            </span>
                            {bInfo?.guestName && bKey !== 'cancelled' && bKey !== null && (
                              <span className="hrv-bstatus-guest">{bInfo.guestName}</span>
                            )}
                          </div>
                        )}
                      </td>

                      <td onClick={e => e.stopPropagation()}>
                        <button
                          className={`hrv-view-btn${isSelected ? ' hrv-view-btn--active' : ''}`}
                          onClick={() => setSelectedRoom(isSelected ? null : room)}
                          title="View details"
                        >
                          {isSelected ? <><X size={13} /> Close</> : <><Eye size={13} /> View</>}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* ── Pagination bar ── */}
            <div className="hrv-pagination">
              <span className="hrv-pagination-info">
                Showing {startIdx + 1}–{Math.min(startIdx + ROWS_PER_PAGE, filtered.length)} of {filtered.length} rooms
              </span>

              <div className="hrv-pagination-controls">
                <button
                  className="hrv-page-btn"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={safePage === 1}
                  title="Previous page"
                >
                  <ChevronLeft size={16} />
                </button>

                {Array.from({ length: totalPages }, (_, i) => i + 1).map(n => (
                  <button
                    key={n}
                    className={`hrv-page-num${safePage === n ? ' hrv-page-num--active' : ''}`}
                    onClick={() => setPage(n)}
                  >
                    {n}
                  </button>
                ))}

                <button
                  className="hrv-page-btn"
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={safePage === totalPages}
                  title="Next page"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Slide-in detail panel */}
      {selectedRoom && (
        <RoomDetailPanel
          room={selectedRoom}
          onClose={() => setSelectedRoom(null)}
        />
      )}
    </div>
  );
};

export default HousekeeperRoomsView;