// frontend/src/pages/receptionist/ReceptionistSettings.jsx

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Eye, EyeOff, Lock, User, Mail, Phone, Shield, Bell } from 'lucide-react';
import './ReceptionistSettings.css';

const API = process.env.REACT_APP_API_URL;

const ReceptionistSettings = () => {
  const [user, setUser]           = useState(null);
  const [pwForm, setPwForm]       = useState({ current: '', newPw: '', confirm: '' });
  const [showPw, setShowPw]       = useState({ current: false, newPw: false, confirm: false });
  const [pwLoading, setPwLoading] = useState(false);
  const [alert, setAlert]         = useState(null);

  // Dark mode pref from localStorage
  const [darkMode, setDarkMode] = useState(() => {
    try { return JSON.parse(localStorage.getItem('rc_prefs') || '{}').darkMode ?? false; }
    catch { return false; }
  });

  const [notifPref, setNotifPref] = useState(() => {
    try { return JSON.parse(localStorage.getItem('rc_prefs') || '{}').notifications ?? true; }
    catch { return true; }
  });

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (stored) setUser(JSON.parse(stored));
  }, []);

  const toggleDark = () => {
    const next = !darkMode;
    setDarkMode(next);
    try {
      const prefs = JSON.parse(localStorage.getItem('rc_prefs') || '{}');
      localStorage.setItem('rc_prefs', JSON.stringify({ ...prefs, darkMode: next }));
    } catch {}
    // The layout watches rc_prefs via its own state — trigger a storage event
    window.dispatchEvent(new Event('storage'));
    // Direct DOM fallback
    const el = document.getElementById('rc-content-area');
    if (el) el.classList.toggle('rc-content--dark', next);
  };

  const toggleNotif = () => {
    const next = !notifPref;
    setNotifPref(next);
    try {
      const prefs = JSON.parse(localStorage.getItem('rc_prefs') || '{}');
      localStorage.setItem('rc_prefs', JSON.stringify({ ...prefs, notifications: next }));
    } catch {}
  };

  const showAlert = (type, msg) => {
    setAlert({ type, msg });
    setTimeout(() => setAlert(null), 3500);
  };

  const pwStrength = (pw) => {
    let score = 0;
    if (pw.length >= 8)          score++;
    if (/[A-Z]/.test(pw))        score++;
    if (/[0-9]/.test(pw))        score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;
    return score;
  };
  const strength     = pwStrength(pwForm.newPw);
  const strengthInfo = [
    { label: '',         color: '#e5e7eb' },
    { label: 'Weak',     color: '#ef4444' },
    { label: 'Fair',     color: '#f97316' },
    { label: 'Good',     color: '#eab308' },
    { label: 'Strong',   color: '#22c55e' },
  ][strength] || { label: '', color: '#e5e7eb' };

  const handlePasswordSave = async () => {
    if (!pwForm.current || !pwForm.newPw || !pwForm.confirm) {
      showAlert('error', 'Please fill all password fields.'); return;
    }
    if (pwForm.newPw !== pwForm.confirm) {
      showAlert('error', 'New passwords do not match.'); return;
    }
    if (pwForm.newPw.length < 6) {
      showAlert('error', 'Password must be at least 6 characters.'); return;
    }
    setPwLoading(true);
    try {
      const token = localStorage.getItem('token');
      await axios.put(`${API}/users/me/password`,
        { currentPassword: pwForm.current, newPassword: pwForm.newPw },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      showAlert('success', 'Password updated successfully!');
      setPwForm({ current: '', newPw: '', confirm: '' });
    } catch (e) {
      showAlert('error', e.response?.data?.message || 'Failed to update password.');
    } finally {
      setPwLoading(false);
    }
  };

  const today = new Date().toLocaleDateString('en-US', { weekday:'long', year:'numeric', month:'long', day:'numeric' });

  return (
    <div className="rcs-page">
      {/* ── Page header ─────────────────────────────────────────── */}
      <div className="rcs-page-header">
        <div>
          <h1 className="rcs-greeting">Profile Settings</h1>
          <p className="rcs-date">{today}</p>
        </div>
        <span className="rcs-role-pill">🛎️ Receptionist</span>
      </div>

      {alert && (
        <div className={`rcs-alert rcs-alert--${alert.type}`}>{alert.msg}</div>
      )}

      <div className="rcs-layout">
        {/* ── Profile Card ───────────────────────────────────────── */}
        <div className="rcs-card">
          <div className="rcs-card-header">
            <User size={15} className="rcs-card-icon"/>
            <span className="rcs-section-title">Profile Information</span>
            <span className="rcs-readonly-badge">Read-only</span>
          </div>
          <div className="rcs-card-body">
            <div className="rcs-profile-row">
              <div className="rcs-avatar-circle">
                {user?.fullName?.charAt(0)?.toUpperCase() || 'R'}
              </div>
              <div>
                <p className="rcs-profile-name">{user?.fullName || '—'}</p>
                <p className="rcs-profile-role">Receptionist</p>
              </div>
            </div>
            <div className="rcs-divider"/>
            <div className="rcs-fields">
              {[
                { Icon: User,  label: 'Full Name', val: user?.fullName  },
                { Icon: Mail,  label: 'Email',     val: user?.email     },
                { Icon: Phone, label: 'Phone',     val: user?.phone || '—' },
                { Icon: Shield,label: 'Role',      val: 'Receptionist'  },
              ].map(({ Icon, label, val }) => (
                <div key={label} className="rcs-field-row">
                  <span className="rcs-label"><Icon size={12}/>{label}</span>
                  <span className="rcs-value">{val || '—'}</span>
                </div>
              ))}
            </div>
            <div className="rcs-edit-note">
              <span>ℹ️</span>
              <span>To update profile details, please contact your administrator.</span>
            </div>
          </div>
        </div>

        {/* ── Password Card ──────────────────────────────────────── */}
        <div className="rcs-card">
          <div className="rcs-card-header">
            <Lock size={15} className="rcs-card-icon"/>
            <span className="rcs-section-title">Change Password</span>
          </div>
          <div className="rcs-card-body">
            {[
              { key: 'current', label: 'Current Password',  placeholder: 'Enter current password' },
              { key: 'newPw',   label: 'New Password',       placeholder: 'Min. 6 characters'      },
              { key: 'confirm', label: 'Confirm New Password', placeholder: 'Repeat new password'  },
            ].map(({ key, label, placeholder }) => (
              <div key={key} className="rcs-pw-field">
                <label>{label}</label>
                <div className="rcs-pw-wrap">
                  <input
                    type={showPw[key] ? 'text' : 'password'}
                    placeholder={placeholder}
                    value={pwForm[key]}
                    onChange={e => setPwForm(p => ({...p, [key]: e.target.value}))}
                  />
                  <button className="rcs-pw-eye" onClick={() => setShowPw(p => ({...p, [key]: !p[key]}))}>
                    {showPw[key] ? <EyeOff size={15}/> : <Eye size={15}/>}
                  </button>
                </div>
              </div>
            ))}

            {pwForm.newPw && (
              <div className="rcs-strength">
                <div className="rcs-strength-bars">
                  {[1,2,3,4].map(i => (
                    <div key={i} className="rcs-strength-bar"
                      style={{ background: i <= strength ? strengthInfo.color : '#e5e7eb' }}
                    />
                  ))}
                </div>
                <span className="rcs-strength-label" style={{ color: strengthInfo.color }}>
                  {strengthInfo.label}
                </span>
              </div>
            )}

            <button className="rcs-pw-save-btn" onClick={handlePasswordSave} disabled={pwLoading}>
              {pwLoading ? 'Saving…' : 'Update Password'}
            </button>
          </div>
        </div>

        {/* ── Preferences Card ───────────────────────────────────── */}
        <div className="rcs-card">
          <div className="rcs-card-header">
            <Bell size={15} className="rcs-card-icon"/>
            <span className="rcs-section-title">Preferences</span>
          </div>
          <div className="rcs-card-body">
            {[
              {
                key: 'dark',
                label: 'Dark Mode',
                desc: 'Toggle dark/light theme for the interface',
                val: darkMode, toggle: toggleDark,
              },
              {
                key: 'notif',
                label: 'Notifications',
                desc: 'Enable in-app notifications',
                val: notifPref, toggle: toggleNotif,
              },
            ].map(({ key, label, desc, val, toggle }) => (
              <div key={key} className="rcs-pref-row">
                <div>
                  <p className="rcs-pref-label">{label}</p>
                  <p className="rcs-pref-desc">{desc}</p>
                </div>
                <button className={`rcs-toggle ${val ? 'rcs-toggle--on' : ''}`} onClick={toggle}/>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReceptionistSettings;