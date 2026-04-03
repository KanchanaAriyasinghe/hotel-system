// frontend/src/pages/housekeeper/HousekeeperLayout.jsx

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import axios from 'axios';
import {
  LogOut, Settings, BedDouble, ChevronRight,
  Wifi, WifiOff, Moon, Sun, LayoutList,
} from 'lucide-react';
import housekeeper from '../../assets/housekeeper.jpeg';
import './HousekeeperLayout.css';

const API = process.env.REACT_APP_API_URL;

const NAV_ITEMS = [
  { id: 'rooms',    label: 'Room Management', Icon: BedDouble,   path: '/housekeeper/rooms'     },
  { id: 'allrooms', label: 'All Rooms',       Icon: LayoutList,  path: '/housekeeper/all-rooms' },
  { id: 'settings', label: 'Profile Settings', Icon: Settings,   path: '/housekeeper/settings'  },
];

const HousekeeperLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser]                 = useState(null);
  const [serverStatus, setServerStatus] = useState(null);

  // ── Dark mode — persisted, shared with child pages via CSS class ──
  const [darkMode, setDarkMode] = useState(() => {
    try {
      const saved = localStorage.getItem('hs_prefs');
      return saved ? JSON.parse(saved).darkMode ?? false : false;
    } catch { return false; }
  });

  // Apply/remove dark class on the content wrapper whenever darkMode changes
  // Also sync back to hs_prefs so HousekeeperSettings toggle stays in sync
  useEffect(() => {
    const content = document.getElementById('hk-content-area');
    if (content) content.classList.toggle('hk-content--dark', darkMode);

    // Keep hs_prefs in sync
    try {
      const saved = localStorage.getItem('hs_prefs');
      const prefs = saved ? JSON.parse(saved) : {};
      localStorage.setItem('hs_prefs', JSON.stringify({ ...prefs, darkMode }));
    } catch {}
  }, [darkMode]);

  const toggleDarkMode = () => setDarkMode(d => !d);

  // ── Auth guard ──────────────────────────────────────────────
  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (!stored) { navigate('/'); return; }
    const u = JSON.parse(stored);
    if (u.role !== 'housekeeper') { navigate('/'); return; }
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
  )?.id ?? 'rooms';

  return (
    <div className="hk-layout">
      {/* ── Sidebar ─────────────────────────────────────────── */}
      <aside className="hk-sidebar">
        <div className="hk-sidebar-brand">
          <span className="hk-brand-icon">🧹</span>
          <span className="hk-brand-text">Housekeeper</span>
        </div>

        <nav className="hk-nav">
          {NAV_ITEMS.map(({ id, label, Icon, path }) => (
            <button
              key={id}
              className={`hk-nav-item ${activeId === id ? 'active' : ''}`}
              onClick={() => navigate(path)}
            >
              <Icon size={18} />
              <span>{label}</span>
              {activeId === id && <ChevronRight size={14} className="hk-nav-arrow" />}
            </button>
          ))}
        </nav>

        {/* ── Dark Mode Toggle ─────────────────────────────── */}
        <div className="hk-dark-toggle-row">
          <div className="hk-dark-toggle-info">
            {darkMode
              ? <Moon size={15} className="hk-dark-icon" />
              : <Sun  size={15} className="hk-dark-icon" />}
            <span className="hk-dark-label">{darkMode ? 'Dark Mode' : 'Light Mode'}</span>
          </div>
          <button
            className={`hk-toggle ${darkMode ? 'hk-toggle--on' : ''}`}
            onClick={toggleDarkMode}
            title="Toggle dark / light mode"
          />
        </div>

        <div className="hk-server-status">
          {serverStatus === 'ok'
            ? <><Wifi    size={13} className="hk-status-icon ok"  /><span>Server online</span></>
            : <><WifiOff size={13} className="hk-status-icon err" /><span>Server offline</span></>
          }
        </div>

        <div className="hk-sidebar-footer">
          {user && (
            <div className="hk-user-info">
              <img src={housekeeper} alt="avatar" className="hk-avatar-sm" />
              <div>
                <p className="hk-user-name">{user.fullName || 'Housekeeper'}</p>
                <span className="hk-role-badge">Housekeeper</span>
              </div>
            </div>
          )}
          <button className="hk-logout-btn" onClick={handleLogout}>
            <LogOut size={18} /><span>Logout</span>
          </button>
        </div>
      </aside>

      {/* ── Page content — dark class toggled here ───────────── */}
      <div
        id="hk-content-area"
        className={`hk-content${darkMode ? ' hk-content--dark' : ''}`}
      >
        <Outlet />
      </div>
    </div>
  );
};

export default HousekeeperLayout;