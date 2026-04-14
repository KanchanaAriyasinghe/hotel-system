// frontend/src/pages/admin/RoomsPage.jsx

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  BedDouble, Plus, Search, RefreshCw,
  Trash2, Eye,
  CheckCircle, XCircle, Wrench, Sparkles,
  Filter, ChevronLeft, ChevronRight,
  CalendarCheck, Clock, Ban, LogOut, HelpCircle,
} from 'lucide-react';
import AddRoomModal from './modals/AddRoomModal';
import './RoomsPage.css';

const API = process.env.REACT_APP_API_URL;
const getAuthHeaders = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
});

const ROWS_PER_PAGE = 5;

const STATUS_META = {
  available:   { label: 'Available',   cls: 'pill--green',  Icon: CheckCircle },
  occupied:    { label: 'Occupied',    cls: 'pill--blue',   Icon: BedDouble   },
  maintenance: { label: 'Maintenance', cls: 'pill--amber',  Icon: Wrench      },
  cleaning:    { label: 'Cleaning',    cls: 'pill--purple', Icon: Sparkles    },
};

const BOOKING_STATUS_META = {
  'pending':     { label: 'Pending',     cls: 'rp-bpill--orange', Icon: Clock         },
  'confirmed':   { label: 'Confirmed',   cls: 'rp-bpill--blue',   Icon: CalendarCheck },
  'checked-in':  { label: 'Checked In',  cls: 'rp-bpill--green',  Icon: CheckCircle   },
  'checked-out': { label: 'Checked Out', cls: 'rp-bpill--gray',   Icon: LogOut        },
  'cancelled':   { label: 'Cancelled',   cls: 'rp-bpill--red',    Icon: Ban           },
};
const BOOKING_STATUS_NONE = { label: 'Not Booked', cls: 'rp-bpill--none', Icon: HelpCircle };

const TYPE_COLORS = {
  single: '#6366f1',
  double: '#0ea5e9',
  deluxe: '#f59e0b',
  suite:  '#ec4899',
  family: '#10b981',
};

// Safe string helper — never pass raw object to JSX
const str = (v) => (v == null ? '' : String(v));

// ── Normalise an amenity entry that may be a populated object OR a plain id ──
const getAmenityDisplay = (a) => {
  if (a !== null && typeof a === 'object') {
    return {
      id:    str(a._id),
      label: str(a.label || a.name),
      icon:  str(a.icon),
    };
  }
  // fallback: raw ObjectId string
  return { id: str(a), label: str(a), icon: '' };
};

const RoomsPage = () => {
  const navigate = useNavigate();
  const [rooms,         setRooms]         = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [refreshing,    setRefreshing]    = useState(false);
  const [search,        setSearch]        = useState('');
  const [filterType,    setFilterType]    = useState('all');
  const [filterStatus,  setFilterStatus]  = useState('all');
  const [filterBooking, setFilterBooking] = useState('all');
  const [showModal,     setShowModal]     = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [deleting,      setDeleting]      = useState(false);
  const [error,         setError]         = useState('');
  const [page,          setPage]          = useState(1);

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
      const res     = await axios.get(`${API}/rooms`, getAuthHeaders());
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

  // Reset to page 1 whenever filters change
  useEffect(() => { setPage(1); }, [search, filterType, filterStatus, filterBooking]);

  const handleRefresh = () => { setRefreshing(true); fetchRooms(); };

  const handleDelete = async (id) => {
    setDeleting(true);
    try {
      await axios.delete(`${API}/rooms/${id}`, getAuthHeaders());
      setRooms(prev => prev.filter(r => r._id !== id));
      setBookingStatusMap(prev => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      setDeleteConfirm(null);
    } catch {
      setError('Failed to delete room.');
    } finally {
      setDeleting(false);
    }
  };

  // ── Filtered list ──────────────────────────────────────────
  const filtered = rooms.filter(r => {
    const matchSearch = search === '' ||
      str(r.roomNumber).toLowerCase().includes(search.toLowerCase()) ||
      str(r.roomType).toLowerCase().includes(search.toLowerCase());
    const matchType   = filterType   === 'all' || r.roomType === filterType;
    const matchStatus = filterStatus === 'all' || r.status   === filterStatus;

    const bStatus     = bookingStatusMap[r._id]?.bookingStatus ?? null;
    const matchBooking = filterBooking === 'all' ||
      (filterBooking === 'not-booked' ? bStatus === null : bStatus === filterBooking);

    return matchSearch && matchType && matchStatus && matchBooking;
  });

  // ── Pagination ─────────────────────────────────────────────
  const totalPages = Math.max(1, Math.ceil(filtered.length / ROWS_PER_PAGE));
  const safePage   = Math.min(page, totalPages);
  const pageStart  = (safePage - 1) * ROWS_PER_PAGE;
  const pageRows   = filtered.slice(pageStart, pageStart + ROWS_PER_PAGE);

  const goTo   = (p) => setPage(Math.max(1, Math.min(p, totalPages)));
  const goPrev = () => goTo(safePage - 1);
  const goNext = () => goTo(safePage + 1);

  const pageNumbers = () => {
    if (totalPages <= 5) return Array.from({ length: totalPages }, (_, i) => i + 1);
    if (safePage <= 3)   return [1, 2, 3, 4, '…', totalPages];
    if (safePage >= totalPages - 2) return [1, '…', totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    return [1, '…', safePage - 1, safePage, safePage + 1, '…', totalPages];
  };

  // ── Summary counts ─────────────────────────────────────────
  const counts = {
    total:       rooms.length,
    available:   rooms.filter(r => r.status === 'available').length,
    occupied:    rooms.filter(r => r.status === 'occupied').length,
    maintenance: rooms.filter(r => r.status === 'maintenance').length,
  };

  if (loading) {
    return (
      <div className="rp-loading">
        <div className="rp-spinner" />
        <p>Loading rooms…</p>
      </div>
    );
  }

  return (
    <div className="rp-root">

      {/* ── Page Header ── */}
      <div className="rp-page-header">
        <div className="rp-page-title">
          <BedDouble size={22} />
          <div>
            <h1>Rooms</h1>
            <p className="rp-page-sub">Manage all hotel rooms</p>
          </div>
        </div>
        <div className="rp-page-actions">
          <button
            className={`rp-icon-btn ${refreshing ? 'spinning' : ''}`}
            onClick={handleRefresh}
            title="Refresh"
          >
            <RefreshCw size={16} />
          </button>
          <button className="rp-btn-primary" onClick={() => setShowModal(true)}>
            <Plus size={16} /> Add Room
          </button>
        </div>
      </div>

      {/* ── Summary Cards ── */}
      <div className="rp-summary-row">
        {[
          { label: 'Total',       value: counts.total,       color: '#6366f1', bg: '#eef2ff' },
          { label: 'Available',   value: counts.available,   color: '#10b981', bg: '#f0fdf4' },
          { label: 'Occupied',    value: counts.occupied,    color: '#0ea5e9', bg: '#f0f9ff' },
          { label: 'Maintenance', value: counts.maintenance, color: '#f59e0b', bg: '#fffbeb' },
        ].map(({ label, value, color, bg }) => (
          <div
            className="rp-summary-card"
            key={label}
            style={{ '--card-color': color, '--card-bg': bg }}
          >
            <span className="rp-summary-value">{value}</span>
            <span className="rp-summary-label">{label}</span>
          </div>
        ))}
      </div>

      {/* ── Filters ── */}
      <div className="rp-filters">
        <div className="rp-search-wrap">
          <Search size={15} className="rp-search-icon" />
          <input
            className="rp-search"
            placeholder="Search by room number or type…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="rp-filter-group">
          <Filter size={14} />
          <select value={filterType} onChange={e => setFilterType(e.target.value)}>
            <option value="all">All Types</option>
            {['single','double','deluxe','suite','family'].map(t => (
              <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
            ))}
          </select>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="all">All Statuses</option>
            {['available','occupied','maintenance','cleaning'].map(s => (
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

      {error && <p className="rp-error">{error}</p>}

      {/* ── Table ── */}
      {filtered.length === 0 ? (
        <div className="rp-empty">
          <BedDouble size={40} />
          <p>{rooms.length === 0 ? 'No rooms yet. Add your first room!' : 'No rooms match your filters.'}</p>
        </div>
      ) : (
        <>
          <div className="rp-table-wrap">
            <table className="rp-table">
              <thead>
                <tr>
                  <th>Room</th>
                  <th>Type</th>
                  <th>Floor</th>
                  <th>Capacity</th>
                  <th>Price / Night</th>
                  <th>Amenities</th>
                  <th>Room Status</th>
                  <th className="rp-th-booking">
                    Booking Status
                    {bookingStatusLoading && (
                      <span className="rp-bstatus-loading-dot" title="Loading…" />
                    )}
                  </th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((room, i) => {
                  const sm = STATUS_META[room.status] || STATUS_META.available;

                  const bInfo = bookingStatusMap[room._id];
                  const bKey  = bInfo?.bookingStatus ?? null;
                  const bMeta = (bKey && BOOKING_STATUS_META[bKey]) || BOOKING_STATUS_NONE;
                  const BIcon = bMeta.Icon;

                  // ── Normalise amenities — handle both populated objects and raw IDs ──
                  const amenityList = (room.amenities || []).map(getAmenityDisplay);

                  return (
                    <tr
                      key={room._id || i}
                      className="rp-row"
                      onClick={() => navigate(`/admin/rooms/${room._id}`)}
                    >
                      <td><span className="rp-room-num">#{str(room.roomNumber)}</span></td>
                      <td>
                        <span
                          className="rp-type-badge"
                          style={{ '--type-color': TYPE_COLORS[room.roomType] || '#6366f1' }}
                        >
                          {str(room.roomType)}
                        </span>
                      </td>
                      <td className="rp-floor">Floor {str(room.floor)}</td>
                      <td className="rp-capacity">{str(room.capacity)} guest{room.capacity !== 1 ? 's' : ''}</td>
                      <td className="rp-price"><strong>${str(room.pricePerNight)}</strong></td>

                      {/* ── Amenities — rendered from normalised objects ── */}
                      <td>
                        <div className="rp-amenity-chips">
                          {amenityList.length === 0 && (
                            <span className="rp-amenity-none">—</span>
                          )}
                          {amenityList.slice(0, 3).map(a => (
                            <span key={a.id} className="rp-amenity-chip" title={a.label}>
                              {a.icon && <span style={{ marginRight: 3 }}>{a.icon}</span>}
                              {a.label}
                            </span>
                          ))}
                          {amenityList.length > 3 && (
                            <span className="rp-amenity-chip rp-amenity-more">
                              +{amenityList.length - 3}
                            </span>
                          )}
                        </div>
                      </td>

                      <td>
                        <span className={`rp-status-pill ${sm.cls}`}>
                          <sm.Icon size={11} /> {sm.label}
                        </span>
                      </td>

                      {/* ── Booking Status ── */}
                      <td onClick={e => e.stopPropagation()}>
                        {bookingStatusLoading && !bookingStatusMap[room._id] ? (
                          <span className="rp-bstatus-skeleton" />
                        ) : (
                          <div className="rp-bstatus-wrap">
                            <span className={`rp-booking-pill ${bMeta.cls}`}>
                              <BIcon size={11} /> {bMeta.label}
                            </span>
                            {bInfo?.guestName && bKey !== 'cancelled' && bKey !== null && (
                              <span className="rp-bstatus-guest">{str(bInfo.guestName)}</span>
                            )}
                          </div>
                        )}
                      </td>

                      <td onClick={e => e.stopPropagation()}>
                        <div className="rp-action-btns">
                          <button
                            className="rp-act-btn rp-act-view"
                            onClick={() => navigate(`/admin/rooms/${room._id}`)}
                            title="View details"
                          >
                            <Eye size={15} />
                          </button>
                          <button
                            className="rp-act-btn rp-act-delete"
                            onClick={() => setDeleteConfirm(room._id)}
                            title="Delete room"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* ── Pagination Footer ── */}
            <div className="rp-pagination">
              <span className="rp-pagination-info">
                Showing {pageStart + 1}–{Math.min(pageStart + ROWS_PER_PAGE, filtered.length)} of {filtered.length} rooms
              </span>

              <div className="rp-pagination-controls">
                <button
                  className="rp-page-btn rp-page-arrow"
                  onClick={goPrev}
                  disabled={safePage === 1}
                  title="Previous page"
                >
                  <ChevronLeft size={15} />
                </button>

                {pageNumbers().map((p, idx) =>
                  p === '…' ? (
                    <span key={`ellipsis-${idx}`} className="rp-page-ellipsis">…</span>
                  ) : (
                    <button
                      key={p}
                      className={`rp-page-btn ${safePage === p ? 'rp-page-btn--active' : ''}`}
                      onClick={() => goTo(p)}
                    >
                      {p}
                    </button>
                  )
                )}

                <button
                  className="rp-page-btn rp-page-arrow"
                  onClick={goNext}
                  disabled={safePage === totalPages}
                  title="Next page"
                >
                  <ChevronRight size={15} />
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── Delete Confirm Modal ── */}
      {deleteConfirm && (
        <div className="rp-overlay" onClick={() => setDeleteConfirm(null)}>
          <div className="rp-confirm-box" onClick={e => e.stopPropagation()}>
            <XCircle size={36} className="rp-confirm-icon" />
            <h3>Delete Room?</h3>
            <p>This action cannot be undone. The room and all its data will be permanently removed.</p>
            <div className="rp-confirm-btns">
              <button className="rp-btn-cancel" onClick={() => setDeleteConfirm(null)}>Cancel</button>
              <button
                className="rp-btn-danger"
                onClick={() => handleDelete(deleteConfirm)}
                disabled={deleting}
              >
                {deleting ? 'Deleting…' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Add Room Modal ── */}
      {showModal && (
        <AddRoomModal
          onClose={(refresh) => {
            setShowModal(false);
            if (refresh) fetchRooms();
          }}
        />
      )}
    </div>
  );
};

export default RoomsPage;