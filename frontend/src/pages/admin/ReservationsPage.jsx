// frontend/src/pages/admin/ReservationsPage.jsx

import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import {
  Calendar, Search, Filter, RefreshCw,
  ChevronDown, ChevronUp, X, Eye,
  User, Mail, Phone, BedDouble,
  Users, DollarSign, Clock, Hash,
  CheckCircle, XCircle, AlertCircle,
  CreditCard, Tag, Layers,
} from 'lucide-react';
import './ReservationsPage.css';

const API = process.env.REACT_APP_API_URL;
const getAuthHeaders = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
});

// ── Helpers ──────────────────────────────────────────────────────
const STATUS_META = {
  pending:    { label: 'Pending',     cls: 'pill--amber',  Icon: Clock        },
  confirmed:  { label: 'Confirmed',   cls: 'pill--blue',   Icon: CheckCircle  },
  'checked-in':  { label: 'Checked In',  cls: 'pill--green',  Icon: CheckCircle  },
  'checked-out': { label: 'Checked Out', cls: 'pill--purple', Icon: CheckCircle  },
  cancelled:  { label: 'Cancelled',   cls: 'pill--red',    Icon: XCircle      },
};

const PAY_META = {
  pending:   { label: 'Pending',   cls: 'pay--amber' },
  completed: { label: 'Paid',      cls: 'pay--green' },
  failed:    { label: 'Failed',    cls: 'pay--red'   },
  refunded:  { label: 'Refunded',  cls: 'pay--purple'},
};

const fmt = (d) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
const nights = (ci, co) => {
  const diff = new Date(co) - new Date(ci);
  return diff > 0 ? Math.round(diff / 86400000) : 0;
};

// ── Detail Drawer ────────────────────────────────────────────────
const DetailDrawer = ({ res, onClose, onStatusChange }) => {
  const [updating, setUpdating] = useState(false);
  const [newStatus, setNewStatus] = useState(res.status);

  const handleStatusUpdate = async () => {
    if (newStatus === res.status) return;
    setUpdating(true);
    try {
      await axios.put(`${API}/reservations/${res._id}`, { status: newStatus }, getAuthHeaders());
      onStatusChange(res._id, newStatus);
      onClose();
    } catch (e) {
      console.error(e);
    } finally {
      setUpdating(false);
    }
  };

  const n = nights(res.checkInDate, res.checkOutDate);
  const sm = STATUS_META[res.status] || STATUS_META.pending;

  return (
    <div className="res-drawer-overlay" onClick={onClose}>
      <aside className="res-drawer" onClick={e => e.stopPropagation()}>
        <div className="res-drawer-header">
          <div>
            <p className="res-drawer-conf">#{res.confirmationNumber || 'N/A'}</p>
            <h2 className="res-drawer-name">{res.guestName}</h2>
          </div>
          <button className="res-drawer-close" onClick={onClose}><X size={18} /></button>
        </div>

        <div className="res-drawer-body">
          {/* Status badges */}
          <div className="res-drawer-badges">
            <span className={`res-pill ${sm.cls}`}><sm.Icon size={12} />{sm.label}</span>
            <span className={`res-pay-pill ${PAY_META[res.paymentStatus]?.cls || 'pay--amber'}`}>
              <CreditCard size={12} />{PAY_META[res.paymentStatus]?.label || 'Pending'}
            </span>
          </div>

          {/* Dates */}
          <div className="res-drawer-dates">
            <div className="res-date-block">
              <p className="res-date-label">Check-in</p>
              <p className="res-date-val">{fmt(res.checkInDate)}</p>
            </div>
            <div className="res-date-divider">
              <span>{n} night{n !== 1 ? 's' : ''}</span>
              <div className="res-date-line" />
            </div>
            <div className="res-date-block">
              <p className="res-date-label">Check-out</p>
              <p className="res-date-val">{fmt(res.checkOutDate)}</p>
            </div>
          </div>

          {/* Guest info */}
          <section className="res-drawer-section">
            <h4 className="res-drawer-section-title">Guest Information</h4>
            <div className="res-info-grid">
              <InfoRow Icon={User}   label="Name"  value={res.guestName} />
              <InfoRow Icon={Mail}   label="Email" value={res.email} />
              <InfoRow Icon={Phone}  label="Phone" value={res.phone} />
              <InfoRow Icon={Users}  label="Guests" value={`${res.numberOfGuests} guest${res.numberOfGuests !== 1 ? 's' : ''}`} />
            </div>
          </section>

          {/* Room info */}
          <section className="res-drawer-section">
            <h4 className="res-drawer-section-title">Room Details</h4>
            <div className="res-info-grid">
              <InfoRow Icon={BedDouble} label="Room Type"    value={res.roomType}                            capitalize />
              <InfoRow Icon={Layers}    label="No. of Rooms" value={`${res.numberOfRooms} room${res.numberOfRooms !== 1 ? 's' : ''}`} />
              <InfoRow Icon={DollarSign} label="Total Price" value={`$${res.totalPrice?.toLocaleString()}`} />
              <InfoRow Icon={Hash}      label="Confirmation" value={res.confirmationNumber || '—'} mono />
            </div>
          </section>

          {/* Amenities */}
          {res.amenities?.length > 0 && (
            <section className="res-drawer-section">
              <h4 className="res-drawer-section-title">Amenities</h4>
              <div className="res-amenities">
                {res.amenities.map(a => (
                  <span key={a} className="res-amenity-tag"><Tag size={11} />{a}</span>
                ))}
              </div>
            </section>
          )}

          {/* Special requests */}
          {res.specialRequests && (
            <section className="res-drawer-section">
              <h4 className="res-drawer-section-title">Special Requests</h4>
              <p className="res-special-req">{res.specialRequests}</p>
            </section>
          )}

          {/* Update status */}
          <section className="res-drawer-section">
            <h4 className="res-drawer-section-title">Update Status</h4>
            <div className="res-status-update">
              <select
                className="res-status-select"
                value={newStatus}
                onChange={e => setNewStatus(e.target.value)}
              >
                {Object.entries(STATUS_META).map(([val, { label }]) => (
                  <option key={val} value={val}>{label}</option>
                ))}
              </select>
              <button
                className="res-update-btn"
                onClick={handleStatusUpdate}
                disabled={updating || newStatus === res.status}
              >
                {updating ? 'Saving…' : 'Save'}
              </button>
            </div>
          </section>
        </div>
      </aside>
    </div>
  );
};

const InfoRow = ({ Icon, label, value, capitalize, mono }) => (
  <div className="res-info-row">
    <span className="res-info-icon"><Icon size={13} /></span>
    <span className="res-info-label">{label}</span>
    <span className={`res-info-value ${capitalize ? 'capitalize' : ''} ${mono ? 'mono' : ''}`}>{value}</span>
  </div>
);

// ── Main Page ─────────────────────────────────────────────────────
const ReservationsPage = () => {
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading]           = useState(true);
  const [refreshing, setRefreshing]     = useState(false);
  const [selected, setSelected]         = useState(null);

  // Filters
  const [search, setSearch]             = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [payFilter, setPayFilter]       = useState('all');
  const [sortField, setSortField]       = useState('createdAt');
  const [sortDir, setSortDir]           = useState('desc');

  const fetchReservations = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/reservations`, getAuthHeaders());
      setReservations(res.data?.data ?? []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchReservations(); }, [fetchReservations]);

  const handleRefresh = () => { setRefreshing(true); fetchReservations(); };

  const handleStatusChange = (id, newStatus) => {
    setReservations(prev =>
      prev.map(r => r._id === id ? { ...r, status: newStatus } : r)
    );
  };

  const handleSort = (field) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('desc'); }
  };

  // ── Derived stats ────────────────────────────────────────────
  const stats = {
    total:     reservations.length,
    pending:   reservations.filter(r => r.status === 'pending').length,
    confirmed: reservations.filter(r => r.status === 'confirmed').length,
    checkedIn: reservations.filter(r => r.status === 'checked-in').length,
    cancelled: reservations.filter(r => r.status === 'cancelled').length,
    revenue:   reservations
      .filter(r => ['confirmed', 'checked-in', 'checked-out'].includes(r.status))
      .reduce((s, r) => s + (r.totalPrice || 0), 0),
  };

  // ── Filter + sort ────────────────────────────────────────────
  const filtered = reservations
    .filter(r => {
      const q = search.toLowerCase();
      const matchSearch = !q ||
        r.guestName?.toLowerCase().includes(q) ||
        r.email?.toLowerCase().includes(q) ||
        r.confirmationNumber?.toLowerCase().includes(q) ||
        r.phone?.includes(q);
      const matchStatus = statusFilter === 'all' || r.status === statusFilter;
      const matchPay    = payFilter === 'all' || r.paymentStatus === payFilter;
      return matchSearch && matchStatus && matchPay;
    })
    .sort((a, b) => {
      let av = a[sortField], bv = b[sortField];
      if (sortField === 'checkInDate' || sortField === 'createdAt') {
        av = new Date(av); bv = new Date(bv);
      }
      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });

  const SortIcon = ({ field }) => {
    if (sortField !== field) return <ChevronDown size={13} style={{ opacity: 0.3 }} />;
    return sortDir === 'asc' ? <ChevronUp size={13} /> : <ChevronDown size={13} />;
  };

  if (loading) {
    return (
      <div className="res-loading">
        <div className="res-spinner" />
        <p>Loading reservations…</p>
      </div>
    );
  }

  return (
    <div className="res-page">
      {/* ── Header ─────────────────────────────────────────────── */}
      <header className="res-header">
        <div>
          <h1 className="res-title">Reservations</h1>
          <p className="res-subtitle">{stats.total} total · {filtered.length} shown</p>
        </div>
        <button
          className={`res-refresh-btn ${refreshing ? 'spinning' : ''}`}
          onClick={handleRefresh}
          title="Refresh"
        >
          <RefreshCw size={16} />
        </button>
      </header>

      {/* ── Summary cards ──────────────────────────────────────── */}
      <section className="res-summary">
        {[
          { label: 'Total',      value: stats.total,                                            color: '#6366f1', bg: '#eef2ff' },
          { label: 'Pending',    value: stats.pending,                                          color: '#f59e0b', bg: '#fffbeb' },
          { label: 'Confirmed',  value: stats.confirmed,                                        color: '#6366f1', bg: '#eef2ff' },
          { label: 'Checked In', value: stats.checkedIn,                                        color: '#10b981', bg: '#f0fdf4' },
          { label: 'Cancelled',  value: stats.cancelled,                                        color: '#ef4444', bg: '#fef2f2' },
          { label: 'Revenue',
            value: stats.revenue >= 1000 ? `$${(stats.revenue / 1000).toFixed(1)}K` : `$${stats.revenue}`,
            color: '#0ea5e9', bg: '#f0f9ff' },
        ].map(({ label, value, color, bg }) => (
          <div key={label} className="res-summary-card" style={{ '--c': color, '--bg': bg }}>
            <span className="res-summary-val">{value}</span>
            <span className="res-summary-label">{label}</span>
          </div>
        ))}
      </section>

      {/* ── Filters ────────────────────────────────────────────── */}
      <div className="res-filters">
        <div className="res-search-wrap">
          <Search size={15} className="res-search-icon" />
          <input
            className="res-search"
            placeholder="Search guest, email, confirmation…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button className="res-search-clear" onClick={() => setSearch('')}>
              <X size={14} />
            </button>
          )}
        </div>

        <div className="res-filter-group">
          <Filter size={14} className="res-filter-icon" />
          <select className="res-select" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="all">All Status</option>
            {Object.entries(STATUS_META).map(([v, { label }]) => (
              <option key={v} value={v}>{label}</option>
            ))}
          </select>
        </div>

        <div className="res-filter-group">
          <CreditCard size={14} className="res-filter-icon" />
          <select className="res-select" value={payFilter} onChange={e => setPayFilter(e.target.value)}>
            <option value="all">All Payments</option>
            {Object.entries(PAY_META).map(([v, { label }]) => (
              <option key={v} value={v}>{label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* ── Table ──────────────────────────────────────────────── */}
      {filtered.length === 0 ? (
        <div className="res-empty">
          <AlertCircle size={32} />
          <p>No reservations found</p>
          <span>Try adjusting your search or filters</span>
        </div>
      ) : (
        <div className="res-table-wrap">
          <table className="res-table">
            <thead>
              <tr>
                <th onClick={() => handleSort('confirmationNumber')} className="sortable">
                  Confirmation <SortIcon field="confirmationNumber" />
                </th>
                <th onClick={() => handleSort('guestName')} className="sortable">
                  Guest <SortIcon field="guestName" />
                </th>
                <th onClick={() => handleSort('roomType')} className="sortable">
                  Room <SortIcon field="roomType" />
                </th>
                <th onClick={() => handleSort('checkInDate')} className="sortable">
                  Check-in <SortIcon field="checkInDate" />
                </th>
                <th onClick={() => handleSort('checkOutDate')} className="sortable">
                  Check-out <SortIcon field="checkOutDate" />
                </th>
                <th>Nights</th>
                <th onClick={() => handleSort('totalPrice')} className="sortable">
                  Total <SortIcon field="totalPrice" />
                </th>
                <th>Payment</th>
                <th onClick={() => handleSort('status')} className="sortable">
                  Status <SortIcon field="status" />
                </th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((res, i) => {
                const sm  = STATUS_META[res.status]  || STATUS_META.pending;
                const pm  = PAY_META[res.paymentStatus] || PAY_META.pending;
                const n   = nights(res.checkInDate, res.checkOutDate);
                return (
                  <tr key={res._id || i} className="res-row" onClick={() => setSelected(res)}>
                    <td className="mono res-conf">#{res.confirmationNumber || '—'}</td>
                    <td>
                      <div className="res-guest-cell">
                        <span className="res-guest-name">{res.guestName}</span>
                        <span className="res-guest-email">{res.email}</span>
                      </div>
                    </td>
                    <td className="capitalize">{res.roomType} · {res.numberOfRooms}x</td>
                    <td>{fmt(res.checkInDate)}</td>
                    <td>{fmt(res.checkOutDate)}</td>
                    <td className="center">{n}n</td>
                    <td><strong>${res.totalPrice?.toLocaleString()}</strong></td>
                    <td><span className={`res-pay-pill ${pm.cls}`}>{pm.label}</span></td>
                    <td>
                      <span className={`res-pill ${sm.cls}`}>
                        <sm.Icon size={11} />{sm.label}
                      </span>
                    </td>
                    <td onClick={e => e.stopPropagation()}>
                      <button className="res-view-btn" onClick={() => setSelected(res)}>
                        <Eye size={14} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Detail drawer ───────────────────────────────────────── */}
      {selected && (
        <DetailDrawer
          res={selected}
          onClose={() => setSelected(null)}
          onStatusChange={handleStatusChange}
        />
      )}
    </div>
  );
};

export default ReservationsPage;