// frontend/src/pages/receptionist/ReceptionistLayout.jsx

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import axios from 'axios';
import {
  LogOut, Settings, BedDouble, ChevronRight,
  Wifi, WifiOff, Moon, Sun, CalendarDays,
} from 'lucide-react';
import receptionist from '../../assets/receptionist.jpeg';
import './ReceptionistLayout.css';

const API = process.env.REACT_APP_API_URL;

const NAV_ITEMS = [
  { id: 'bookings', label: 'Bookings',         Icon: CalendarDays, path: '/receptionist/bookings'  },
  { id: 'rooms',    label: 'Room Details',      Icon: BedDouble,    path: '/receptionist/rooms'     },
  { id: 'settings', label: 'Profile Settings',  Icon: Settings,     path: '/receptionist/settings'  },
];

const ReceptionistLayout = () => {
  const navigate  = useNavigate();
  const location  = useLocation();
  const [user, setUser]                 = useState(null);
  const [serverStatus, setServerStatus] = useState(null);

  // ── Dark mode — persisted ──────────────────────────────────────
  const [darkMode, setDarkMode] = useState(() => {
    try {
      const saved = localStorage.getItem('rc_prefs');
      return saved ? JSON.parse(saved).darkMode ?? false : false;
    } catch { return false; }
  });

  useEffect(() => {
    const content = document.getElementById('rc-content-area');
    if (content) content.classList.toggle('rc-content--dark', darkMode);
    try {
      const saved = localStorage.getItem('rc_prefs');
      const prefs = saved ? JSON.parse(saved) : {};
      localStorage.setItem('rc_prefs', JSON.stringify({ ...prefs, darkMode }));
    } catch {}
  }, [darkMode]);

  const toggleDarkMode = () => setDarkMode(d => !d);

  // ── Auth guard ─────────────────────────────────────────────────
  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (!stored) { navigate('/'); return; }
    const u = JSON.parse(stored);
    if (u.role !== 'receptionist') { navigate('/'); return; }
    setUser(u);
  }, [navigate]);

  // ── Health check ───────────────────────────────────────────────
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
  )?.id ?? 'bookings';

  return (
    <div className="rc-layout">
      {/* ── Sidebar ──────────────────────────────────────────────── */}
      <aside className="rc-sidebar">
        <div className="rc-sidebar-brand">
          <span className="rc-brand-icon">🛎️</span>
          <span className="rc-brand-text">Reception</span>
        </div>

        <nav className="rc-nav">
          {NAV_ITEMS.map(({ id, label, Icon, path }) => (
            <button
              key={id}
              className={`rc-nav-item ${activeId === id ? 'active' : ''}`}
              onClick={() => navigate(path)}
            >
              <Icon size={18} />
              <span>{label}</span>
              {activeId === id && <ChevronRight size={14} className="rc-nav-arrow" />}
            </button>
          ))}
        </nav>

        {/* ── Dark Mode Toggle ─────────────────────────────────── */}
        <div className="rc-dark-toggle-row">
          <div className="rc-dark-toggle-info">
            {darkMode
              ? <Moon size={15} className="rc-dark-icon" />
              : <Sun  size={15} className="rc-dark-icon" />}
            <span className="rc-dark-label">{darkMode ? 'Dark Mode' : 'Light Mode'}</span>
          </div>
          <button
            className={`rc-toggle ${darkMode ? 'rc-toggle--on' : ''}`}
            onClick={toggleDarkMode}
            title="Toggle dark / light mode"
          />
        </div>

        <div className="rc-server-status">
          {serverStatus === 'ok'
            ? <><Wifi    size={13} className="rc-status-icon ok"  /><span>Server online</span></>
            : <><WifiOff size={13} className="rc-status-icon err" /><span>Server offline</span></>
          }
        </div>

        <div className="rc-sidebar-footer">
          {user && (
            <div className="rc-user-info">
              <img src={receptionist} alt="avatar" className="rc-avatar-sm" />
              <div>
                <p className="rc-user-name">{user.fullName || 'Receptionist'}</p>
                <span className="rc-role-badge">Receptionist</span>
              </div>
            </div>
          )}
          <button className="rc-logout-btn" onClick={handleLogout}>
            <LogOut size={18} /><span>Logout</span>
          </button>
        </div>
      </aside>

      {/* ── Page content ─────────────────────────────────────────── */}
      <div
        id="rc-content-area"
        className={`rc-content${darkMode ? ' rc-content--dark' : ''}`}
      >
        <Outlet />
      </div>
    </div>
  );
};

export default ReceptionistLayout;