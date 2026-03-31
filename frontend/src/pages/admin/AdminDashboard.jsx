// frontend/src/pages/admin/AdminDashboard.jsx

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  Users, BarChart3,
  Plus, Wrench, Shield, TrendingUp,
  CheckCircle, RefreshCw,
  BedDouble, Calendar,
  Wifi, WifiOff, DollarSign,
  UserPlus,
} from 'lucide-react';
import AddStaffModal    from './modals/AddStaffModal';
import AddRoomModal     from './modals/AddRoomModal';
import ViewReportsModal from './modals/ViewReportsModal';
import ManageRolesModal from './modals/ManageRolesModal';
import './AdminDashboard.css';
import admin from '../../assets/admin.png';

const API = process.env.REACT_APP_API_URL;

const getAuthHeaders = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
});

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [user, setUser]             = useState(null);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [serverStatus, setServerStatus] = useState(null);

  const [rooms, setRooms]               = useState([]);
  const [users, setUsers]               = useState([]);
  const [reservations, setReservations] = useState([]);

  const [stats, setStats] = useState({
    totalRooms: 0, availableRooms: 0, occupiedRooms: 0,
    occupancyRate: 0, totalUsers: 0, totalReservations: 0,
  });

  const [modal, setModal] = useState(null);

  // ── Auth guard ──────────────────────────────────────────────
  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (!stored) { navigate('/'); return; }
    const u = JSON.parse(stored);
    if (u.role !== 'admin') { navigate('/'); return; }
    setUser(u);
  }, [navigate]);

  // ── Health check ────────────────────────────────────────────
  const checkHealth = useCallback(async () => {
    try {
      await axios.get(`${API}/health`);
      setServerStatus('ok');
    } catch {
      setServerStatus('error');
    }
  }, []);

  // ── Fetch all data ──────────────────────────────────────────
  const fetchData = useCallback(async () => {
    const [roomsRes, usersRes, reservationsRes] = await Promise.allSettled([
      axios.get(`${API}/rooms`,        getAuthHeaders()),
      axios.get(`${API}/users`,        getAuthHeaders()),
      axios.get(`${API}/reservations`, getAuthHeaders()),
    ]);

    const roomList = roomsRes.status === 'fulfilled'
      ? (roomsRes.value.data?.data ?? []) : [];
    const userList = usersRes.status === 'fulfilled'
      ? (usersRes.value.data?.data ?? []) : [];
    const resList  = reservationsRes.status === 'fulfilled'
      ? (reservationsRes.value.data?.data ?? []) : [];

    const available = roomList.filter(r => r.status === 'available').length;
    const occupied  = roomList.length - available;
    const rate      = roomList.length > 0
      ? Math.round((occupied / roomList.length) * 100) : 0;

    setRooms(roomList);
    setUsers(userList);
    setReservations(resList);
    setStats({
      totalRooms:        roomList.length,
      availableRooms:    available,
      occupiedRooms:     occupied,
      occupancyRate:     rate,
      totalUsers:        userList.length,
      totalReservations: resList.length,
    });
  }, []);

  const loadAll = useCallback(async () => {
    await Promise.all([checkHealth(), fetchData()]);
    setLoading(false);
    setRefreshing(false);
  }, [checkHealth, fetchData]);

  useEffect(() => { if (user) loadAll(); }, [user, loadAll]);

  const handleRefresh    = () => { setRefreshing(true); loadAll(); };
  const handleModalClose = (shouldRefresh = false) => {
    setModal(null);
    if (shouldRefresh) loadAll();
  };

  // ── Derived reservation counts ──────────────────────────────
  const pendingRes   = reservations.filter(r => r.status === 'pending').length;
  const confirmedRes = reservations.filter(r => r.status === 'confirmed').length;
  const checkedInRes = reservations.filter(r => r.status === 'checked-in').length;
  const cancelledRes = reservations.filter(r => r.status === 'cancelled').length;

  const revenue = reservations
    .filter(r => ['confirmed', 'checked-in'].includes(r.status))
    .reduce((sum, r) => sum + (r.totalPrice || 0), 0);

  if (loading) {
    return (
      <div className="adash-loading">
        <div className="adash-spinner" />
        <p>Loading Dashboard…</p>
      </div>
    );
  }

  return (
    <div className="adash">

      {/* ── Header ───────────────────────────────────────────── */}
      <header className="adash-header">
        <div className="adash-header-left">
          <h2 className="adash-greeting">
            Welcome back, <strong>{user?.fullName || 'Admin'}</strong>
          </h2>
          <p className="adash-date">
            {new Date().toLocaleDateString('en-US', {
              weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
            })}
          </p>
        </div>
        <div className="adash-header-right">
          <button
            className={`adash-refresh-btn ${refreshing ? 'spinning' : ''}`}
            onClick={handleRefresh}
            title="Refresh"
          >
            <RefreshCw size={18} />
          </button>
          <div className="adash-user-chip">
            <span className="adash-role-badge">Admin</span>
            <img src={admin} alt="avatar" className="adash-avatar" />
          </div>
        </div>
      </header>

      {/* ── Stats Row ── */}
      <section className="adash-stats">
        {[
          { label: 'Total Rooms',    value: stats.totalRooms,        Icon: BedDouble,   color: '#6366f1', bg: '#eef2ff', note: 'all room records'        },
          { label: 'Available',      value: stats.availableRooms,    Icon: CheckCircle, color: '#10b981', bg: '#f0fdf4', note: `${stats.occupancyRate}% occupied` },
          { label: 'Reservations',   value: stats.totalReservations, Icon: Calendar,    color: '#f59e0b', bg: '#fffbeb', note: `${pendingRes} pending`    },
          {
            label: 'Revenue',
            value: revenue >= 1000 ? `$${(revenue / 1000).toFixed(1)}K` : `$${revenue}`,
            Icon: DollarSign, color: '#0ea5e9', bg: '#f0f9ff', note: 'confirmed + checked-in',
          },
          { label: 'Staff Accounts', value: stats.totalUsers, Icon: Users, color: '#ec4899', bg: '#fdf2f8', note: 'registered users' },
        ].map(({ label, value, Icon, color, bg, note }) => (
          <div className="adash-stat-card" key={label}>
            <div className="adash-stat-icon" style={{ background: bg, color }}>
              <Icon size={22} />
            </div>
            <div className="adash-stat-body">
              <span className="adash-stat-label">{label}</span>
              <span className="adash-stat-value">{value}</span>
              <span className="adash-stat-note">{note}</span>
            </div>
            <TrendingUp size={14} className="adash-stat-trend" style={{ color }} />
          </div>
        ))}
      </section>

      {/* ── Bottom Grid ── */}
      <div className="adash-grid">

        {/* Rooms table */}
        <section className="adash-card">
          <div className="adash-card-header">
            <h3><BedDouble size={16} /> Rooms</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span className="adash-badge">{stats.totalRooms} total</span>
              <button className="adash-view-all-btn" onClick={() => navigate('/admin/rooms')}>
                View All →
              </button>
            </div>
          </div>
          {rooms.length === 0
            ? <p className="adash-empty">No rooms yet. Use "Add New Room" to create one.</p>
            : (
              <div className="adash-table-wrap">
                <table className="adash-table">
                  <thead>
                    <tr>
                      <th>No.</th>
                      <th>Type</th>
                      <th>Floor</th>
                      <th>Price/Night</th>
                      <th>Capacity</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rooms.slice(0, 7).map((room, i) => (
                      <tr
                        key={room._id || i}
                        style={{ cursor: 'pointer' }}
                        onClick={() => navigate(`/admin/rooms/${room._id}`)}
                      >
                        <td className="room-num">#{room.roomNumber}</td>
                        <td className="capitalize">{room.roomType}</td>
                        <td>{room.floor}</td>
                        <td><strong>${room.pricePerNight}</strong></td>
                        <td>{room.capacity}</td>
                        <td>
                          <span className={`adash-status-pill ${room.status === 'available' ? 'pill--green' : 'pill--amber'}`}>
                            {room.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {rooms.length > 7 && (
                  <p
                    className="adash-table-more"
                    style={{ cursor: 'pointer' }}
                    onClick={() => navigate('/admin/rooms')}
                  >
                    +{rooms.length - 7} more rooms — View all →
                  </p>
                )}
              </div>
            )
          }
        </section>

        {/* Right column */}
        <div className="adash-right-col">

          {/* Reservations card */}
          <section className="adash-card adash-res-card">
            <div className="adash-card-header">
              <h3><Calendar size={16} /> Reservations</h3>
              <span className="adash-badge">{stats.totalReservations} total</span>
            </div>
            <div className="adash-res-grid">
              {[
                { label: 'Pending',    value: pendingRes,   color: '#f59e0b', bg: '#fffbeb' },
                { label: 'Confirmed',  value: confirmedRes, color: '#6366f1', bg: '#eef2ff' },
                { label: 'Checked In', value: checkedInRes, color: '#10b981', bg: '#f0fdf4' },
                { label: 'Cancelled',  value: cancelledRes, color: '#ef4444', bg: '#fef2f2' },
              ].map(({ label, value, color, bg }) => (
                <div key={label} className="adash-res-item" style={{ background: bg }}>
                  <span className="adash-res-value" style={{ color }}>{value}</span>
                  <span className="adash-res-label">{label}</span>
                </div>
              ))}
            </div>

            {reservations.length > 0 && (
              <div className="adash-recent-res">
                <p className="adash-recent-title">Recent</p>
                {reservations.slice(0, 4).map((res, i) => (
                  <div key={res._id || i} className="adash-recent-row">
                    <div className="adash-recent-guest">
                      <p className="adash-recent-name">{res.guestName}</p>
                      <p className="adash-recent-dates">
                        {new Date(res.checkInDate).toLocaleDateString()} → {new Date(res.checkOutDate).toLocaleDateString()}
                      </p>
                    </div>
                    <span className={`adash-status-pill ${
                      res.status === 'confirmed'  ? 'pill--blue'  :
                      res.status === 'checked-in' ? 'pill--green' :
                      res.status === 'pending'    ? 'pill--amber' : 'pill--red'
                    }`}>
                      {res.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Quick Actions */}
          <section className="adash-card adash-actions">
            <div className="adash-card-header">
              <h3><Wrench size={16} /> Quick Actions</h3>
            </div>
            <div className="adash-action-grid">
              {[
                { label: 'Add Staff Member', Icon: UserPlus,  action: 'addStaff', color: '#6366f1', desc: 'POST /api/staff'           },
                { label: 'Add New Room',     Icon: BedDouble, action: 'addRoom',  color: '#8b5cf6', desc: 'POST /api/rooms'            },
                { label: 'View Reports',     Icon: BarChart3, action: 'reports',  color: '#0ea5e9', desc: 'Rooms & reservations data'  },
                { label: 'Manage Roles',     Icon: Shield,    action: 'roles',    color: '#ec4899', desc: 'PUT /api/users/:id'         },
              ].map(({ label, Icon, action, color, desc }) => (
                <button
                  key={action}
                  className="adash-action-btn"
                  style={{ '--accent': color }}
                  onClick={() => setModal(action)}
                >
                  <span className="adash-action-icon"><Icon size={20} /></span>
                  <span className="adash-action-label">{label}</span>
                  <span className="adash-action-desc">{desc}</span>
                </button>
              ))}
            </div>
          </section>

        </div>
      </div>

      {/* ── Modals ── */}
      {modal === 'addStaff' && <AddStaffModal    onClose={handleModalClose} />}
      {modal === 'addRoom'  && <AddRoomModal     onClose={handleModalClose} />}
      {modal === 'reports'  && (
        <ViewReportsModal
          onClose={handleModalClose}
          rooms={rooms}
          reservations={reservations}
          users={users}
          stats={{ ...stats, revenue, pendingRes, confirmedRes, checkedInRes, cancelledRes }}
        />
      )}
      {modal === 'roles' && <ManageRolesModal onClose={handleModalClose} users={users} />}
    </div>
  );
};

export default AdminDashboard;