// frontend/src/pages/admin/RoomsPage.jsx
//
// Endpoints:
//   GET    /api/rooms          → { success, count, data: Room[] }
//   DELETE /api/rooms/:id      → { success, message }

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  BedDouble, Plus, Search, RefreshCw,
  ChevronRight, Trash2, Eye,
  CheckCircle, XCircle, Wrench, Sparkles,
  Filter,
} from 'lucide-react';
import AddRoomModal from './modals/AddRoomModal';
import './RoomsPage.css';

const API = process.env.REACT_APP_API_URL;
const getAuthHeaders = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
});

const STATUS_META = {
  available:   { label: 'Available',   cls: 'pill--green', Icon: CheckCircle },
  occupied:    { label: 'Occupied',    cls: 'pill--blue',  Icon: BedDouble   },
  maintenance: { label: 'Maintenance', cls: 'pill--amber', Icon: Wrench      },
  cleaning:    { label: 'Cleaning',    cls: 'pill--purple',Icon: Sparkles    },
};

const TYPE_COLORS = {
  single:  '#6366f1',
  double:  '#0ea5e9',
  deluxe:  '#f59e0b',
  suite:   '#ec4899',
  family:  '#10b981',
};

const RoomsPage = () => {
  const navigate = useNavigate();
  const [rooms, setRooms]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch]       = useState('');
  const [filterType, setFilterType]   = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null); // room _id
  const [deleting, setDeleting]   = useState(false);
  const [error, setError]         = useState('');

  const fetchRooms = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/rooms`, getAuthHeaders());
      setRooms(res.data?.data ?? []);
    } catch {
      setError('Failed to load rooms.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchRooms(); }, [fetchRooms]);

  const handleRefresh = () => { setRefreshing(true); fetchRooms(); };

  const handleDelete = async (id) => {
    setDeleting(true);
    try {
      await axios.delete(`${API}/rooms/${id}`, getAuthHeaders());
      setRooms(prev => prev.filter(r => r._id !== id));
      setDeleteConfirm(null);
    } catch {
      setError('Failed to delete room.');
    } finally {
      setDeleting(false);
    }
  };

  // Filtered list
  const filtered = rooms.filter(r => {
    const matchSearch = search === '' ||
      r.roomNumber.toLowerCase().includes(search.toLowerCase()) ||
      r.roomType.toLowerCase().includes(search.toLowerCase());
    const matchType   = filterType   === 'all' || r.roomType   === filterType;
    const matchStatus = filterStatus === 'all' || r.status     === filterStatus;
    return matchSearch && matchType && matchStatus;
  });

  // Summary counts
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
          <div className="rp-summary-card" key={label} style={{ '--card-color': color, '--card-bg': bg }}>
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
              <option key={t} value={t}>{t.charAt(0).toUpperCase()+t.slice(1)}</option>
            ))}
          </select>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="all">All Statuses</option>
            {['available','occupied','maintenance','cleaning'].map(s => (
              <option key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</option>
            ))}
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
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((room, i) => {
                const sm = STATUS_META[room.status] || STATUS_META.available;
                return (
                  <tr
                    key={room._id || i}
                    className="rp-row"
                    onClick={() => navigate(`/admin/rooms/${room._id}`)}
                  >
                    <td>
                      <span className="rp-room-num">#{room.roomNumber}</span>
                    </td>
                    <td>
                      <span
                        className="rp-type-badge"
                        style={{ '--type-color': TYPE_COLORS[room.roomType] || '#6366f1' }}
                      >
                        {room.roomType}
                      </span>
                    </td>
                    <td className="rp-floor">Floor {room.floor}</td>
                    <td className="rp-capacity">{room.capacity} guest{room.capacity !== 1 ? 's' : ''}</td>
                    <td className="rp-price"><strong>${room.pricePerNight}</strong></td>
                    <td>
                      <div className="rp-amenity-chips">
                        {(room.amenities || []).slice(0, 3).map(a => (
                          <span key={a} className="rp-amenity-chip">{a}</span>
                        ))}
                        {(room.amenities || []).length > 3 && (
                          <span className="rp-amenity-chip rp-amenity-more">
                            +{room.amenities.length - 3}
                          </span>
                        )}
                        {(room.amenities || []).length === 0 && (
                          <span className="rp-amenity-none">—</span>
                        )}
                      </div>
                    </td>
                    <td>
                      <span className={`rp-status-pill ${sm.cls}`}>
                        <sm.Icon size={11} />
                        {sm.label}
                      </span>
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
          <p className="rp-table-count">
            Showing {filtered.length} of {rooms.length} rooms
          </p>
        </div>
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