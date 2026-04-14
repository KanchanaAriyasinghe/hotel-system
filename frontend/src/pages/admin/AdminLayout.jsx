// frontend/src/pages/admin/AdminLayout.jsx

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import axios from 'axios';
import {
  LogOut, Users, BarChart3, Settings,
  BedDouble, Calendar, ChevronRight,
  Wifi, WifiOff, Moon, Sun, Sparkles,
} from 'lucide-react';
import admin from '../../assets/admin.png';
import './AdminLayout.css';
import './AdminDarkMode.css';

const API = process.env.REACT_APP_API_URL;

const NAV_ITEMS = [
  { id: 'overview',     label: 'Overview',     Icon: BarChart3,  path: '/admin/dashboard'    },
  { id: 'rooms',        label: 'Rooms',         Icon: BedDouble,  path: '/admin/rooms'        },
  { id: 'reservations', label: 'Reservations',  Icon: Calendar,   path: '/admin/reservations' },
  { id: 'amenities',    label: 'Amenities',     Icon: Sparkles,   path: '/admin/amenities'    },
  { id: 'users',        label: 'Users',         Icon: Users,      path: '/admin/users'        },
  { id: 'settings',     label: 'Settings',      Icon: Settings,   path: '/admin/settings'     },
];

const AdminLayout = () => {
  const navigate  = useNavigate();
  const location  = useLocation();
  const [user, setUser]                 = useState(null);
  const [serverStatus, setServerStatus] = useState(null);

  // ── Dark mode — persisted in localStorage ──────────────────
  const [darkMode, setDarkMode] = useState(() => {
    try {
      const saved = localStorage.getItem('admin_prefs');
      return saved ? JSON.parse(saved).darkMode ?? false : false;
    } catch { return false; }
  });

  useEffect(() => {
    const content = document.getElementById('admin-content-area');
    if (content) content.classList.toggle('admin-content--dark', darkMode);
    document.body.setAttribute('data-admin-dark', darkMode ? 'true' : 'false');

    try {
      const saved = localStorage.getItem('admin_prefs');
      const prefs = saved ? JSON.parse(saved) : {};
      localStorage.setItem('admin_prefs', JSON.stringify({ ...prefs, darkMode }));
    } catch {}

    return () => { document.body.removeAttribute('data-admin-dark'); };
  }, [darkMode]);

  const toggleDarkMode = () => setDarkMode(d => !d);

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

        {/* ── Dark Mode Toggle ─────────────────────────────── */}
        <div className="admin-dark-toggle-row">
          <div className="admin-dark-toggle-info">
            {darkMode
              ? <Moon size={15} className="admin-dark-icon" />
              : <Sun  size={15} className="admin-dark-icon" />}
            <span className="admin-dark-label">{darkMode ? 'Dark Mode' : 'Light Mode'}</span>
          </div>
          <button
            className={`admin-toggle ${darkMode ? 'admin-toggle--on' : ''}`}
            onClick={toggleDarkMode}
            title="Toggle dark / light mode"
          />
        </div>

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

      {/* ── Page content ─────────────────────────────────────── */}
      <div
        id="admin-content-area"
        className={`admin-content${darkMode ? ' admin-content--dark' : ''}`}
      >
        <Outlet />
      </div>
    </div>
  );
};

export default AdminLayout;