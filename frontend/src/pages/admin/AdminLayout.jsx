// frontend/src/pages/admin/AdminLayout.jsx
//
// Shared layout: renders the sidebar + wraps child routes via <Outlet />.
// Drop this into your router as the parent of all /admin/* routes.

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import axios from 'axios';
import {
  LogOut, Users, BarChart3, Settings,
  BedDouble, Calendar, ChevronRight,
  Wifi, WifiOff,
} from 'lucide-react';
import admin from '../../assets/admin.png';
import './AdminLayout.css';

const API = process.env.REACT_APP_API_URL;

const NAV_ITEMS = [
  { id: 'overview',     label: 'Overview',     Icon: BarChart3, path: '/admin/dashboard'    },
  { id: 'rooms',        label: 'Rooms',         Icon: BedDouble, path: '/admin/rooms'        },
  { id: 'reservations', label: 'Reservations',  Icon: Calendar,  path: '/admin/reservations' },
  { id: 'users',        label: 'Users',         Icon: Users,     path: '/admin/users'        },
  { id: 'settings',     label: 'Settings',      Icon: Settings,  path: '/admin/settings'     },
];

const AdminLayout = () => {
  const navigate  = useNavigate();
  const location  = useLocation();
  const [user, setUser]               = useState(null);
  const [serverStatus, setServerStatus] = useState(null); // 'ok' | 'error'

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

  useEffect(() => { checkHealth(); }, [checkHealth]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/');
  };

  // Determine active nav item by current pathname
  const activeId = NAV_ITEMS.find(item =>
    location.pathname === item.path ||
    location.pathname.startsWith(item.path + '/')
  )?.id ?? 'overview';

  return (
    <div className="admin-layout">
      {/* ── Sidebar ─────────────────────────────────────────── */}
      <aside className="admin-sidebar">
        <div className="admin-sidebar-brand">
          <span className="brand-icon">🏨</span>
          <span className="brand-text">Admin Panel</span>
        </div>

        <nav className="admin-nav">
          {NAV_ITEMS.map(({ id, label, Icon, path }) => (
            <button
              key={id}
              className={`admin-nav-item ${activeId === id ? 'active' : ''}`}
              onClick={() => navigate(path)}
            >
              <Icon size={18} />
              <span>{label}</span>
              {activeId === id && <ChevronRight size={14} className="nav-arrow" />}
            </button>
          ))}
        </nav>

        <div className="admin-server-status">
          {serverStatus === 'ok'
            ? <><Wifi    size={13} className="status-icon ok"  /><span>Server online</span></>
            : <><WifiOff size={13} className="status-icon err" /><span>Server offline</span></>
          }
        </div>

        <div className="admin-sidebar-footer">
          {user && (
            <div className="admin-user-info">
              <img src={admin} alt="avatar" className="admin-avatar-sm" />
              <div>
                <p className="admin-user-name">{user.fullName || 'Admin'}</p>
                <span className="admin-role-badge">Admin</span>
              </div>
            </div>
          )}
          <button className="admin-logout-btn" onClick={handleLogout}>
            <LogOut size={18} /><span>Logout</span>
          </button>
        </div>
      </aside>

      {/* ── Page content injected by child routes ───────────── */}
      <div className="admin-content">
        <Outlet />
      </div>
    </div>
  );
};

export default AdminLayout;