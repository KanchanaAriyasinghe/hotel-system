// frontend/src/pages/housekeeper/HousekeeperSettings.jsx

import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import {
  User, Mail, Phone, Clock, Lock, Eye, EyeOff,
  CheckCircle, AlertCircle,
  Shield, Bell, Moon, Sun, Smartphone,
  ChevronRight, Info, Briefcase, Building2,
  Calendar, DollarSign, Activity,
} from 'lucide-react';
import housekeeper from '../../assets/housekeeper.jpeg';
import './HousekeeperSettings.css';

const API = process.env.REACT_APP_API_URL;
const getAuthHeaders = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
});

const HousekeeperSettings = () => {

  // ── Auth user ──────────────────────────────────────────────
  const [authUser, setAuthUser] = useState({});
  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (stored) setAuthUser(JSON.parse(stored));
  }, []);

  // ── Staff profile state ────────────────────────────────────
  const [staff, setStaff]                   = useState(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileError, setProfileError]     = useState('');

  // ── Password state ─────────────────────────────────────────
  const [pwForm, setPwForm] = useState({
    currentPassword: '', newPassword: '', confirmPassword: '',
  });
  const [showPw, setShowPw]       = useState({ current: false, new: false, confirm: false });
  const [pwSaving, setPwSaving]   = useState(false);
  const [pwSuccess, setPwSuccess] = useState('');
  const [pwError, setPwError]     = useState('');

  // ── Preferences — persisted to localStorage ────────────────
  const [prefs, setPrefs] = useState(() => {
    try {
      const saved = localStorage.getItem('hs_prefs');
      return saved ? JSON.parse(saved) : {
        darkMode: false,
        notifications: false,
        shiftReminder: true,
        soundAlerts: false,
      };
    } catch {
      return { darkMode: false, notifications: false, shiftReminder: true, soundAlerts: false };
    }
  });

  // Persist whenever prefs change
  useEffect(() => {
    localStorage.setItem('hs_prefs', JSON.stringify(prefs));
  }, [prefs]);

  // ── Dark Mode — syncs with layout sidebar toggle ───────────
  // Layout (HousekeeperLayout) owns the actual class on #hk-content-area.
  // This just keeps the prefs toggle in sync visually.
  const toggleDarkMode = () => {
    const next = !prefs.darkMode;
    setPrefs(p => ({ ...p, darkMode: next }));
    const content = document.getElementById('hk-content-area');
    if (content) content.classList.toggle('hk-content--dark', next);
  };

  // ── Push Notifications ─────────────────────────────────────
  const toggleNotifications = async () => {
    if (prefs.notifications) {
      setPrefs(p => ({ ...p, notifications: false }));
      return;
    }
    if (!('Notification' in window)) {
      alert('Your browser does not support push notifications.');
      return;
    }
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      setPrefs(p => ({ ...p, notifications: true }));
      new Notification('Notifications Enabled', {
        body: 'You will now receive task and room alerts.',
        icon: '/favicon.ico',
      });
    } else {
      alert('Notification permission was denied. Please allow it in your browser settings and try again.');
    }
  };

  // ── Shift Reminder ─────────────────────────────────────────
  const shiftReminderRef = useRef(null);

  useEffect(() => {
    if (shiftReminderRef.current) clearTimeout(shiftReminderRef.current);
    if (!prefs.shiftReminder || !staff?.shiftTiming || Notification.permission !== 'granted') return;

    const raw    = staff.shiftTiming.split(/[–\-]/)[0].trim();
    const parsed = new Date(`${new Date().toDateString()} ${raw}`);
    if (isNaN(parsed)) return;

    const msUntil = parsed.getTime() - 30 * 60 * 1000 - Date.now();

    if (msUntil > 0 && msUntil < 24 * 60 * 60 * 1000) {
      shiftReminderRef.current = setTimeout(() => {
        new Notification('Shift Reminder', {
          body: `Your shift starts in 30 minutes (${staff.shiftTiming}).`,
          icon: '/favicon.ico',
        });
      }, msUntil);
    }

    return () => clearTimeout(shiftReminderRef.current);
  }, [prefs.shiftReminder, staff?.shiftTiming]);

  const toggleShiftReminder = () => {
    if (!prefs.notifications && !prefs.shiftReminder) {
      alert('Please enable Push Notifications first so reminders can be delivered.');
      return;
    }
    setPrefs(p => ({ ...p, shiftReminder: !p.shiftReminder }));
  };

  // ── Sound Alerts ───────────────────────────────────────────
  const playBeep = () => {
    try {
      const ctx  = new (window.AudioContext || window.webkitAudioContext)();
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type            = 'sine';
      osc.frequency.value = 520;
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.5);
    } catch (e) { console.warn('Web Audio not supported', e); }
  };

  const toggleSoundAlerts = () => {
    const next = !prefs.soundAlerts;
    setPrefs(p => ({ ...p, soundAlerts: next }));
    if (next) playBeep();
  };

  // ── Fetch staff record ─────────────────────────────────────
  const fetchStaff = useCallback(async () => {
    const userId = authUser._id || authUser.id;
    if (!userId) return;
    try {
      const res  = await axios.get(`${API}/staff?userId=${userId}`, getAuthHeaders());
      const list = res.data?.data ?? [];
      const s    = list[0] ?? null;
      setStaff(s);
      if (!s) setProfileError('No staff record linked to your account. Contact admin.');
    } catch {
      setProfileError('Could not load your staff profile.');
    } finally {
      setProfileLoading(false);
    }
  }, [authUser._id, authUser.id]);

  useEffect(() => { fetchStaff(); }, [fetchStaff]);

  // ── Password save ──────────────────────────────────────────
  const handlePasswordSave = async () => {
    if (!pwForm.currentPassword)                        { setPwError('Enter your current password.');                return; }
    if (pwForm.newPassword.length < 6)                  { setPwError('New password must be at least 6 characters.'); return; }
    if (pwForm.newPassword !== pwForm.confirmPassword)  { setPwError('Passwords do not match.');                     return; }

    const userId = authUser._id || authUser.id;
    setPwSaving(true);
    setPwError('');
    try {
      await axios.put(
        `${API}/users/${userId}/password`,
        { currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword },
        getAuthHeaders(),
      );
      setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setPwSuccess('Password changed successfully!');
      setTimeout(() => setPwSuccess(''), 3000);
    } catch (err) {
      setPwError(err.response?.data?.message || 'Failed to change password.');
    } finally {
      setPwSaving(false);
    }
  };

  // ── Helpers ────────────────────────────────────────────────
  const fmtDate     = (d) => d ? new Date(d).toLocaleDateString('en-US', { dateStyle: 'medium' }) : '—';
  const fmtDateTime = (d) => d ? new Date(d).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }) : '—';

  // ── Render ─────────────────────────────────────────────────
  return (
    <div className="hs-root">

      {/* ── Page Header ── */}
      <div className="hs-page-header">
        <div>
          <h2 className="hs-greeting">
            Welcome back, <strong>{authUser?.fullName || 'Housekeeper'}</strong>
          </h2>
          <p className="hs-date">
            {new Date().toLocaleDateString('en-US', {
              weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
            })}
          </p>
        </div>
        <div className="hs-header-right">
          <span className="hs-role-pill">Housekeeper</span>
          <img src={housekeeper} alt="avatar" className="hs-header-avatar" />
        </div>
      </div>

      <div className="hs-body">

        {/* ══════════ LEFT COLUMN ══════════ */}
        <div className="hs-left">

          {/* ── Profile Card ── */}
          <div className="hs-card">
            <div className="hs-card-header">
              <div className="hs-card-title">
                <User size={16} />
                <span>My Profile</span>
              </div>
              <span className="hs-readonly-badge">
                <Info size={11} /> Read Only
              </span>
            </div>

            {profileLoading ? (
              <div className="hs-loading">
                <div className="hs-spinner" />
                <p>Loading…</p>
              </div>
            ) : (
              <>
                {profileError && (
                  <div className="hs-alert hs-alert--error">
                    <AlertCircle size={13} />{profileError}
                  </div>
                )}

                <div className="hs-avatar-row">
                  <img src={housekeeper} alt="profile" className="hs-profile-avatar" />
                  <div>
                    <p className="hs-profile-name">{authUser.fullName || staff?.name || '—'}</p>
                    <span className="hs-profile-badge">{staff?.position || 'Housekeeper'}</span>
                    <p className="hs-profile-dept">{staff?.department || '—'}</p>
                  </div>
                </div>

                {/* Account Info — User schema */}
                <div className="hs-section-divider"><span>Account Information</span></div>
                <div className="hs-fields">
                  <div className="hs-field">
                    <label><User size={12} /> Full Name</label>
                    <span>{authUser.fullName || '—'}</span>
                  </div>
                  <div className="hs-field">
                    <label><Mail size={12} /> Email</label>
                    <span>{authUser.email || '—'}</span>
                  </div>
                  <div className="hs-field">
                    <label><Phone size={12} /> Phone Number</label>
                    <span>{authUser.phoneNumber || '—'}</span>
                  </div>
                  <div className="hs-field">
                    <label><Shield size={12} /> Role</label>
                    <span className="hs-capitalize">{authUser.role || '—'}</span>
                  </div>
                  <div className="hs-field">
                    <label><Activity size={12} /> Account Status</label>
                    <span className={authUser.isActive ? 'hs-active' : 'hs-inactive'}>
                      {authUser.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <div className="hs-field">
                    <label><Clock size={12} /> Last Login</label>
                    <span>{fmtDateTime(authUser.lastLogin)}</span>
                  </div>
                  <div className="hs-field">
                    <label><Calendar size={12} /> Member Since</label>
                    <span>{fmtDate(authUser.createdAt)}</span>
                  </div>
                </div>

                {/* Staff Details — Staff schema */}
                <div className="hs-section-divider" style={{ marginTop: '20px' }}>
                  <span>Staff Details</span>
                </div>

                {!staff ? (
                  <div className="hs-no-staff">
                    <Info size={18} />
                    <p>No staff record linked to your account. Contact admin.</p>
                  </div>
                ) : (
                  <div className="hs-fields">
                    <div className="hs-field">
                      <label><User size={12} /> Staff Name</label>
                      <span>{staff.name || '—'}</span>
                    </div>
                    <div className="hs-field">
                      <label><Phone size={12} /> Staff Phone</label>
                      <span>{staff.phone || '—'}</span>
                    </div>
                    <div className="hs-field">
                      <label><Building2 size={12} /> Department</label>
                      <span className="hs-readonly-val">{staff.department || '—'}</span>
                    </div>
                    <div className="hs-field">
                      <label><Briefcase size={12} /> Position</label>
                      <span className="hs-readonly-val">{staff.position || '—'}</span>
                    </div>
                    <div className="hs-field">
                      <label><Clock size={12} /> Shift Timing</label>
                      <span>{staff.shiftTiming || <em className="hs-empty">Not set</em>}</span>
                    </div>
                    <div className="hs-field">
                      <label><Calendar size={12} /> Join Date</label>
                      <span>{fmtDate(staff.joinDate)}</span>
                    </div>
                    <div className="hs-field">
                      <label><DollarSign size={12} /> Salary</label>
                      <span>
                        {staff.salary != null ? `LKR ${Number(staff.salary).toLocaleString()}` : '—'}
                      </span>
                    </div>
                    <div className="hs-field">
                      <label><Activity size={12} /> Staff Status</label>
                      <span className={staff.isActive ? 'hs-active' : 'hs-inactive'}>
                        {staff.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>
                )}

                <p className="hs-edit-note">
                  <Info size={11} /> Profile information can only be updated by an admin.
                </p>
              </>
            )}
          </div>

          {/* ── Change Password Card ── */}
          <div className="hs-card">
            <div className="hs-card-header">
              <div className="hs-card-title">
                <Lock size={16} />
                <span>Change Password</span>
              </div>
            </div>

            {pwSuccess && <div className="hs-alert hs-alert--success"><CheckCircle size={13} />{pwSuccess}</div>}
            {pwError   && <div className="hs-alert hs-alert--error"><AlertCircle size={13} />{pwError}</div>}

            <div className="hs-fields">
              <div className="hs-field hs-field--full">
                <label><Lock size={12} /> Current Password</label>
                <div className="hs-pw-wrap">
                  <input
                    type={showPw.current ? 'text' : 'password'}
                    value={pwForm.currentPassword}
                    onChange={e => setPwForm(p => ({ ...p, currentPassword: e.target.value }))}
                    placeholder="Enter current password"
                  />
                  <button className="hs-pw-toggle" onClick={() => setShowPw(p => ({ ...p, current: !p.current }))}>
                    {showPw.current ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>

              <div className="hs-field">
                <label>New Password</label>
                <div className="hs-pw-wrap">
                  <input
                    type={showPw.new ? 'text' : 'password'}
                    value={pwForm.newPassword}
                    onChange={e => setPwForm(p => ({ ...p, newPassword: e.target.value }))}
                    placeholder="Min. 6 characters"
                  />
                  <button className="hs-pw-toggle" onClick={() => setShowPw(p => ({ ...p, new: !p.new }))}>
                    {showPw.new ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>

              <div className="hs-field">
                <label>Confirm New Password</label>
                <div className="hs-pw-wrap">
                  <input
                    type={showPw.confirm ? 'text' : 'password'}
                    value={pwForm.confirmPassword}
                    onChange={e => setPwForm(p => ({ ...p, confirmPassword: e.target.value }))}
                    placeholder="Repeat new password"
                  />
                  <button className="hs-pw-toggle" onClick={() => setShowPw(p => ({ ...p, confirm: !p.confirm }))}>
                    {showPw.confirm ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>

              {pwForm.newPassword && (
                <div className="hs-field hs-field--full">
                  <div className="hs-pw-strength">
                    {['Weak', 'Fair', 'Good', 'Strong'].map((label, i) => (
                      <div
                        key={label}
                        className={`hs-pw-bar ${pwForm.newPassword.length > i * 3 ? 'hs-pw-bar--filled' : ''}`}
                        style={{ '--bar-color': ['#ef4444', '#f59e0b', '#3b82f6', '#10b981'][i] }}
                      />
                    ))}
                    <span className="hs-pw-strength-label">
                      {pwForm.newPassword.length < 4  ? 'Weak'  :
                       pwForm.newPassword.length < 7  ? 'Fair'  :
                       pwForm.newPassword.length < 10 ? 'Good'  : 'Strong'}
                    </span>
                  </div>
                </div>
              )}
            </div>

            <button className="hs-pw-save-btn" onClick={handlePasswordSave} disabled={pwSaving}>
              <Shield size={14} /> {pwSaving ? 'Updating…' : 'Update Password'}
            </button>
          </div>
        </div>

        {/* ══════════ RIGHT COLUMN ══════════ */}
        <div className="hs-right">

          {/* ── Preferences Card ── */}
          <div className="hs-card">
            <div className="hs-card-header">
              <div className="hs-card-title">
                <Bell size={16} />
                <span>Preferences</span>
              </div>
            </div>
            <div className="hs-pref-list">

              {/* Push Notifications */}
              <div className="hs-pref-item">
                <div className="hs-pref-info">
                  <Bell size={15} className="hs-pref-icon" />
                  <div>
                    <p className="hs-pref-label">Push Notifications</p>
                    <p className="hs-pref-desc">
                      {prefs.notifications ? 'Enabled — browser will show alerts' : 'Click to request permission'}
                    </p>
                  </div>
                </div>
                <button
                  className={`hs-toggle ${prefs.notifications ? 'hs-toggle--on' : ''}`}
                  onClick={toggleNotifications}
                />
              </div>

              {/* Shift Reminders */}
              <div className="hs-pref-item">
                <div className="hs-pref-info">
                  <Clock size={15} className="hs-pref-icon" />
                  <div>
                    <p className="hs-pref-label">Shift Reminders</p>
                    <p className="hs-pref-desc">
                      {staff?.shiftTiming
                        ? `30 min before ${staff.shiftTiming.split(/[–\-]/)[0].trim()}`
                        : 'No shift timing set'}
                    </p>
                  </div>
                </div>
                <button
                  className={`hs-toggle ${prefs.shiftReminder ? 'hs-toggle--on' : ''}`}
                  onClick={toggleShiftReminder}
                  disabled={!staff?.shiftTiming}
                  style={{
                    opacity: !staff?.shiftTiming ? 0.4 : 1,
                    cursor:  !staff?.shiftTiming ? 'not-allowed' : 'pointer',
                  }}
                />
              </div>

              {/* Dark Mode */}
              <div className="hs-pref-item">
                <div className="hs-pref-info">
                  {prefs.darkMode
                    ? <Moon size={15} className="hs-pref-icon" />
                    : <Sun  size={15} className="hs-pref-icon" />}
                  <div>
                    <p className="hs-pref-label">Dark Mode</p>
                    <p className="hs-pref-desc">
                      {prefs.darkMode ? 'Dark theme active' : 'Light theme active'}
                    </p>
                  </div>
                </div>
                <button
                  className={`hs-toggle ${prefs.darkMode ? 'hs-toggle--on' : ''}`}
                  onClick={toggleDarkMode}
                />
              </div>

              {/* Sound Alerts */}
              <div className="hs-pref-item">
                <div className="hs-pref-info">
                  <Smartphone size={15} className="hs-pref-icon" />
                  <div>
                    <p className="hs-pref-label">Sound Alerts</p>
                    <p className="hs-pref-desc">
                      {prefs.soundAlerts ? 'Sound on — plays on new alerts' : 'Sound off'}
                    </p>
                  </div>
                </div>
                <button
                  className={`hs-toggle ${prefs.soundAlerts ? 'hs-toggle--on' : ''}`}
                  onClick={toggleSoundAlerts}
                />
              </div>

            </div>
          </div>

          {/* ── Quick Tips Card ── */}
          <div className="hs-card hs-tips-card">
            <div className="hs-card-header">
              <div className="hs-card-title">
                <Info size={16} />
                <span>Housekeeping Tips</span>
              </div>
            </div>
            <ul className="hs-tips-list">
              <li><ChevronRight size={12} /> Mark rooms as <strong>Cleaning</strong> before you start.</li>
              <li><ChevronRight size={12} /> Set back to <strong>Available</strong> once finished.</li>
              <li><ChevronRight size={12} /> Report damage using <strong>Maintenance</strong> status.</li>
              <li><ChevronRight size={12} /> Contact admin to update your shift timing.</li>
              <li><ChevronRight size={12} /> Keep your phone number current for alerts.</li>
            </ul>
          </div>

        </div>
      </div>
    </div>
  );
};

export default HousekeeperSettings;