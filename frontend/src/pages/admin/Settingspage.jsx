import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Settings, Hotel, User, Moon, Sun, Monitor,
  Bell, Shield, Key, Globe, Clock, DollarSign,
  Mail, Phone, MapPin, Image, Plus, X, Save,
  CheckCircle, AlertCircle, Eye, EyeOff,
  Wifi, Coffee, Dumbbell, Car, Utensils, Waves,
  Loader, LogOut, Trash2, Download,
  MessageSquare, Smartphone, Lock,
} from 'lucide-react';
import './SettingsPage.css';

const API = process.env.REACT_APP_API_URL;

const getAuthHeaders = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
});

const Toast = ({ toasts }) => (
  <div className="sp-toast-stack">
    {toasts.map(t => (
      <div key={t.id} className={`sp-toast sp-toast--${t.type}`}>
        {t.type === 'success' ? <CheckCircle size={15}/> : <AlertCircle size={15}/>}
        {t.msg}
      </div>
    ))}
  </div>
);

const Field = ({ label, hint, children }) => (
  <div className="sp-field">
    <label className="sp-label">
      {label}
      {hint && <span className="sp-hint">{hint}</span>}
    </label>
    {children}
  </div>
);

const Input = ({ icon: Icon, ...props }) => (
  <div className="sp-input-wrap">
    {Icon && <Icon size={14} className="sp-input-icon"/>}
    <input className="sp-input" {...props}/>
  </div>
);

const Textarea = (props) => <textarea className="sp-textarea" {...props}/>;

const AMENITY_ICONS = {
  wifi: Wifi, pool: Waves, spa: Coffee, restaurant: Utensils,
  bar: Coffee, gym: Dumbbell, parking: Car, breakfast: Utensils,
};
const AMENITY_OPTIONS = [
  'wifi','pool','spa','restaurant','bar','gym',
  'parking','breakfast','concierge','laundry','rooftop','lounge',
];
const CURRENCY_OPTIONS = ['USD','EUR','GBP','LKR','AUD','CAD','SGD','JPY','INR','AED'];
const TIMEZONE_OPTIONS = [
  'UTC','Asia/Colombo','America/New_York','Europe/London',
  'Asia/Dubai','Asia/Singapore','Australia/Sydney',
];

const HOTEL_DEFAULTS = {
  name: '', description: '', email: '', phone: '', whatsapp: '',
  address: '', city: '', latitude: '', longitude: '',
  checkInTime: '14:00', checkOutTime: '12:00',
  currency: 'USD', amenities: [], images: [],
};

const normalizeHotel = (h) => ({
  name:         h.name         ?? '',
  description:  h.description  ?? '',
  email:        h.email        ?? '',
  phone:        h.phone        ?? '',
  whatsapp:     h.whatsapp     ?? '',
  address:      h.address      ?? '',
  city:         h.city         ?? '',
  latitude:     h.latitude  != null ? String(h.latitude)  : '',
  longitude:    h.longitude != null ? String(h.longitude) : '',
  checkInTime:  h.checkInTime  ?? '14:00',
  checkOutTime: h.checkOutTime ?? '12:00',
  currency:     h.currency     ?? 'USD',
  amenities:    Array.isArray(h.amenities) ? [...h.amenities] : [],
  images:       Array.isArray(h.images)    ? [...h.images]    : [],
});

const SettingsPage = () => {
  const [activeSection, setActiveSection] = useState('hotel');
  const [toasts,  setToasts]  = useState([]);
  const [saving,  setSaving]  = useState('');

  const [theme, setTheme] = useState(() => localStorage.getItem('sp-theme') || 'light');
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('sp-theme', theme);
  }, [theme]);

  const [hotel,       setHotel]       = useState(null);
  const [hotelForm,   setHotelForm]   = useState(HOTEL_DEFAULTS);
  const [hotelStatus, setHotelStatus] = useState('loading');
  const [hotelMsg,    setHotelMsg]    = useState('');
  const [newImage,    setNewImage]    = useState('');

  useEffect(() => {
    let cancelled = false;
    const fetchHotel = async () => {
      setHotelStatus('loading');
      try {
        const res     = await axios.get(`${API}/hotel`, getAuthHeaders());
        if (cancelled) return;
        const payload = res.data?.data ?? res.data;
        const h       = Array.isArray(payload) ? payload[0] : payload;
        if (h && h._id) {
          setHotel(h);
          setHotelForm(normalizeHotel(h));
          setHotelStatus('loaded');
        } else {
          setHotelStatus('new');
          setHotelMsg('No hotel record found — fill in the form to create one.');
        }
      } catch (err) {
        if (cancelled) return;
        const status = err.response?.status;
        if (status === 404) {
          setHotelStatus('new');
          setHotelMsg('No hotel record found — fill in the form to create one.');
        } else if (status === 401 || status === 403) {
          setHotelStatus('error');
          setHotelMsg('Unauthorized — please log in again.');
        } else {
          setHotelStatus('error');
          setHotelMsg(err.response?.data?.message || 'Could not connect to the server.');
        }
      }
    };
    fetchHotel();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [profile, setProfile] = useState(() => {
    try { return JSON.parse(localStorage.getItem('user')) || {}; } catch { return {}; }
  });
  const [profileForm, setProfileForm] = useState({
    fullName:    profile.fullName    || '',
    email:       profile.email       || '',
    phoneNumber: profile.phoneNumber || '',
  });

  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [showPw,    setShowPw]    = useState({ cur: false, new: false, con: false });
  const [pwError,   setPwError]   = useState('');
  const [pwSuccess, setPwSuccess] = useState('');

  // ── Notifications — seeded from localStorage, then overwritten from DB ──
  const [notifs, setNotifs] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('sp-notifs')) || {
        newReservation: true, checkIn: true, checkOut: false,
        cancellation: true, payment: true, systemAlerts: true,
        emailNotifs: true, smsNotifs: false,
      };
    } catch { return {}; }
  });

  // ── Load notification prefs from DB on mount ───────────────────────────
  useEffect(() => {
    const userId = profile._id || profile.id;
    if (!userId) return;

    axios.get(`${API}/users/${userId}`, getAuthHeaders())
      .then(res => {
        const prefs = res.data?.data?.notificationPrefs;
        if (prefs) {
          setNotifs(prev => ({ ...prev, ...prefs }));
        }
      })
      .catch(() => {}); // silently fall back to localStorage defaults
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [sysSettings, setSysSettings] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('sp-sys')) || {
        timezone: 'UTC', dateFormat: 'MM/DD/YYYY',
        sessionTimeout: '60', twoFA: false, auditLog: true,
      };
    } catch { return {}; }
  });

  const toast = (msg, type = 'success') => {
    const id = Date.now();
    setToasts(t => [...t, { id, msg, type }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3500);
  };

  const saveHotel = async () => {
    if (!hotelForm.name.trim()) { toast('Hotel name is required', 'error'); return; }
    setSaving('hotel');
    try {
      const payload = {
        ...hotelForm,
        latitude:  hotelForm.latitude  !== '' ? Number(hotelForm.latitude)  : undefined,
        longitude: hotelForm.longitude !== '' ? Number(hotelForm.longitude) : undefined,
      };
      let res;
      if (hotel?._id) {
        res = await axios.put(`${API}/hotel/${hotel._id}`, payload, getAuthHeaders());
      } else {
        res = await axios.post(`${API}/hotel`, payload, getAuthHeaders());
      }
      const saved = res.data?.data ?? res.data;
      const h     = Array.isArray(saved) ? saved[0] : saved;
      if (h && h._id) {
        setHotel(h);
        setHotelForm(normalizeHotel(h));
        setHotelStatus('loaded');
      }
      toast('Hotel information saved successfully');
    } catch (err) {
      toast(err.response?.data?.message || 'Failed to save hotel info', 'error');
    }
    setSaving('');
  };

  const saveProfile = async () => {
    const userId = profile._id || profile.id;
    if (!userId) { toast('Session error — please log out and log back in', 'error'); return; }
    setSaving('profile');
    try {
      const res     = await axios.put(`${API}/users/${userId}`, profileForm, getAuthHeaders());
      const updated = res.data?.data ?? res.data;
      const merged  = { ...profile, ...updated, ...profileForm };
      localStorage.setItem('user', JSON.stringify(merged));
      setProfile(merged);
      setProfileForm({ fullName: merged.fullName || '', email: merged.email || '', phoneNumber: merged.phoneNumber || '' });
      toast('Profile updated successfully');
    } catch (err) {
      toast(err.response?.data?.message || 'Failed to update profile', 'error');
    }
    setSaving('');
  };

  const changePassword = async () => {
    setPwError('');
    setPwSuccess('');

    if (!pwForm.currentPassword) { setPwError('Enter your current password.'); return; }
    if (pwForm.newPassword.length < 6) { setPwError('New password must be at least 6 characters.'); return; }
    if (pwForm.newPassword !== pwForm.confirmPassword) { setPwError('Passwords do not match.'); return; }

    const userId = profile._id || profile.id;
    setSaving('password');
    try {
      await axios.put(
        `${API}/users/${userId}/password`,
        { currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword },
        getAuthHeaders(),
      );
      setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setPwSuccess('Password changed successfully!');
      setTimeout(() => setPwSuccess(''), 3500);
      toast('Password changed successfully');
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to change password.';
      setPwError(msg);
      toast(msg, 'error');
    }
    setSaving('');
  };

  // ── Save notifications to DB + localStorage ────────────────────────────
  const saveNotifications = async () => {
    const userId = profile._id || profile.id;
    if (!userId) { toast('Session error — please log out and back in', 'error'); return; }

    setSaving('notifs');
    try {
      await axios.put(
        `${API}/users/${userId}/notification-prefs`,
        {
          newReservation: notifs.newReservation,
          checkIn:        notifs.checkIn,
          checkOut:       notifs.checkOut,
          cancellation:   notifs.cancellation,
          payment:        notifs.payment,
          systemAlerts:   notifs.systemAlerts,
        },
        getAuthHeaders(),
      );
      localStorage.setItem('sp-notifs', JSON.stringify(notifs));
      toast('Notification preferences saved');
    } catch (err) {
      toast(err.response?.data?.message || 'Failed to save preferences', 'error');
    }
    setSaving('');
  };

  const saveSystem = () => {
    localStorage.setItem('sp-sys', JSON.stringify(sysSettings));
    toast('System settings saved');
  };

  const toggleAmenity = (a) =>
    setHotelForm(f => ({
      ...f,
      amenities: f.amenities.includes(a)
        ? f.amenities.filter(x => x !== a)
        : [...f.amenities, a],
    }));

  const addImage = () => {
    if (!newImage.trim()) return;
    setHotelForm(f => ({ ...f, images: [...f.images, newImage.trim()] }));
    setNewImage('');
  };

  const removeImage = (idx) =>
    setHotelForm(f => ({ ...f, images: f.images.filter((_, i) => i !== idx) }));

  return (
    <div className="sp-page">
      <Toast toasts={toasts}/>

      <header className="sp-header">
        <div>
          <h1 className="sp-title">Settings</h1>
          <p className="sp-subtitle">Manage hotel, account & system preferences</p>
        </div>
        <div className="sp-theme-switcher">
          {[
            { val: 'light',  Icon: Sun,     label: 'Light'  },
            { val: 'system', Icon: Monitor, label: 'System' },
            { val: 'dark',   Icon: Moon,    label: 'Dark'   },
          ].map(({ val, Icon, label }) => (
            <button
              key={val}
              className={`sp-theme-btn ${theme === val ? 'active' : ''}`}
              onClick={() => setTheme(val)}
              title={label}
            >
              <Icon size={15}/>
              <span>{label}</span>
            </button>
          ))}
        </div>
      </header>

      <div className="sp-layout">
        <nav className="sp-nav">
          {[
            { id: 'hotel',    label: 'Hotel Info',    Icon: Hotel    },
            { id: 'profile',  label: 'My Profile',    Icon: User     },
            { id: 'security', label: 'Security',       Icon: Shield   },
            { id: 'notifs',   label: 'Notifications', Icon: Bell     },
            { id: 'system',   label: 'System',         Icon: Settings },
            { id: 'danger',   label: 'Danger Zone',    Icon: Trash2   },
          ].map(({ id, label, Icon }) => (
            <button
              key={id}
              className={`sp-nav-item ${activeSection === id ? 'active' : ''} ${id === 'danger' ? 'sp-nav-item--danger' : ''}`}
              onClick={() => setActiveSection(id)}
            >
              <Icon size={16}/><span>{label}</span>
            </button>
          ))}
        </nav>

        <div className="sp-content">

          {/* ══ Hotel Info ══════════════════════════════════ */}
          {activeSection === 'hotel' && (
            <Panel title="Hotel Information" subtitle="Public-facing hotel details shown to guests">
              {hotelStatus === 'loading' && (
                <div className="sp-skeleton-wrap">
                  {[...Array(6)].map((_, i) => <div key={i} className="sp-skeleton"/>)}
                </div>
              )}
              {hotelStatus === 'error' && (
                <div className="sp-hotel-status sp-hotel-status--error">
                  <AlertCircle size={14}/> {hotelMsg}
                </div>
              )}
              {(hotelStatus === 'loaded' || hotelStatus === 'new') && (
                <>
                  <div className={`sp-hotel-status ${hotelStatus === 'loaded' ? 'sp-hotel-status--loaded' : 'sp-hotel-status--new'}`}>
                    {hotelStatus === 'loaded' ? (
                      <><CheckCircle size={14}/> Editing: <strong>{hotel.name || 'Unnamed Hotel'}</strong> &nbsp;·&nbsp; ID: <code>{hotel._id}</code></>
                    ) : (
                      <><AlertCircle size={14}/> {hotelMsg}</>
                    )}
                  </div>

                  <div className="sp-grid-2">
                    <Field label="Hotel Name">
                      <Input icon={Hotel} value={hotelForm.name} onChange={e => setHotelForm(f => ({ ...f, name: e.target.value }))} placeholder="Grand Royal Hotel"/>
                    </Field>
                    <Field label="City">
                      <Input icon={MapPin} value={hotelForm.city} onChange={e => setHotelForm(f => ({ ...f, city: e.target.value }))} placeholder="Colombo"/>
                    </Field>
                  </div>

                  <Field label="Description">
                    <Textarea value={hotelForm.description} onChange={e => setHotelForm(f => ({ ...f, description: e.target.value }))} placeholder="Describe your hotel…" rows={3}/>
                  </Field>

                  <Field label="Address">
                    <Input icon={MapPin} value={hotelForm.address} onChange={e => setHotelForm(f => ({ ...f, address: e.target.value }))} placeholder="123 Main Street"/>
                  </Field>

                  <div className="sp-grid-2">
                    <Field label="Email">
                      <Input icon={Mail} type="email" value={hotelForm.email} onChange={e => setHotelForm(f => ({ ...f, email: e.target.value }))} placeholder="info@hotel.com"/>
                    </Field>
                    <Field label="Phone">
                      <Input icon={Phone} value={hotelForm.phone} onChange={e => setHotelForm(f => ({ ...f, phone: e.target.value }))} placeholder="+94 11 234 5678"/>
                    </Field>
                  </div>

                  <div className="sp-grid-2">
                    <Field label="WhatsApp">
                      <Input icon={MessageSquare} value={hotelForm.whatsapp} onChange={e => setHotelForm(f => ({ ...f, whatsapp: e.target.value }))} placeholder="+94 77 123 4567"/>
                    </Field>
                    <Field label="Currency">
                      <select className="sp-select" value={hotelForm.currency} onChange={e => setHotelForm(f => ({ ...f, currency: e.target.value }))}>
                        {CURRENCY_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </Field>
                  </div>

                  <div className="sp-grid-4">
                    <Field label="Check-in Time">
                      <Input icon={Clock} type="time" value={hotelForm.checkInTime} onChange={e => setHotelForm(f => ({ ...f, checkInTime: e.target.value }))}/>
                    </Field>
                    <Field label="Check-out Time">
                      <Input icon={Clock} type="time" value={hotelForm.checkOutTime} onChange={e => setHotelForm(f => ({ ...f, checkOutTime: e.target.value }))}/>
                    </Field>
                    <Field label="Latitude">
                      <Input icon={Globe} type="number" value={hotelForm.latitude} onChange={e => setHotelForm(f => ({ ...f, latitude: e.target.value }))} placeholder="6.9271"/>
                    </Field>
                    <Field label="Longitude">
                      <Input icon={Globe} type="number" value={hotelForm.longitude} onChange={e => setHotelForm(f => ({ ...f, longitude: e.target.value }))} placeholder="79.8612"/>
                    </Field>
                  </div>

                  <Field label="Amenities" hint="Click to toggle">
                    <div className="sp-amenity-grid">
                      {AMENITY_OPTIONS.map(a => {
                        const AIcon = AMENITY_ICONS[a] || Coffee;
                        const on    = hotelForm.amenities.includes(a);
                        return (
                          <button key={a} type="button" className={`sp-amenity-btn ${on ? 'sp-amenity-btn--on' : ''}`} onClick={() => toggleAmenity(a)}>
                            <AIcon size={14}/>{a}
                          </button>
                        );
                      })}
                    </div>
                  </Field>

                  <Field label="Image URLs">
                    <div className="sp-image-add">
                      <input
                        className="sp-input"
                        value={newImage}
                        onChange={e => setNewImage(e.target.value)}
                        placeholder="https://example.com/image.jpg"
                        onKeyDown={e => e.key === 'Enter' && addImage()}
                      />
                      <button className="sp-add-btn" onClick={addImage} type="button">
                        <Plus size={14}/> Add
                      </button>
                    </div>
                    {hotelForm.images.length > 0 && (
                      <div className="sp-image-list">
                        {hotelForm.images.map((img, i) => (
                          <div key={i} className="sp-image-row">
                            <Image size={13}/>
                            <span className="sp-image-url">{img}</span>
                            <button className="sp-remove-btn" onClick={() => removeImage(i)}><X size={12}/></button>
                          </div>
                        ))}
                      </div>
                    )}
                  </Field>

                  <SaveBar saving={saving === 'hotel'} onSave={saveHotel}/>
                </>
              )}
            </Panel>
          )}

          {/* ══ Profile ══════════════════════════════════════ */}
          {activeSection === 'profile' && (
            <Panel title="My Profile" subtitle="Update your personal account information">
              <div className="sp-profile-hero">
                <div className="sp-profile-avatar">
                  {(profile.fullName || 'A')[0].toUpperCase()}
                </div>
                <div>
                  <p className="sp-profile-name">{profile.fullName}</p>
                  <span className="sp-profile-role">{profile.role}</span>
                </div>
              </div>

              <div className="sp-grid-2">
                <Field label="Full Name">
                  <Input icon={User} value={profileForm.fullName} onChange={e => setProfileForm(f => ({ ...f, fullName: e.target.value }))} placeholder="John Admin"/>
                </Field>
                <Field label="Email Address">
                  <Input icon={Mail} type="email" value={profileForm.email} onChange={e => setProfileForm(f => ({ ...f, email: e.target.value }))} placeholder="admin@hotel.com"/>
                </Field>
              </div>
              <Field label="Phone Number">
                <Input icon={Phone} value={profileForm.phoneNumber} onChange={e => setProfileForm(f => ({ ...f, phoneNumber: e.target.value }))} placeholder="+94 77 123 4567"/>
              </Field>

              <div className="sp-read-only-card">
                <div className="sp-ro-item"><span>Role</span><strong className="capitalize">{profile.role || '—'}</strong></div>
                <div className="sp-ro-item"><span>Last Login</span><strong>{profile.lastLogin ? new Date(profile.lastLogin).toLocaleString() : '—'}</strong></div>
                <div className="sp-ro-item"><span>Account ID</span><strong className="mono">{profile._id?.slice(-8) || '—'}</strong></div>
              </div>

              <SaveBar saving={saving === 'profile'} onSave={saveProfile}/>
            </Panel>
          )}

          {/* ══ Security ═════════════════════════════════════ */}
          {activeSection === 'security' && (
            <Panel title="Security" subtitle="Manage your password and account security">
              <h4 className="sp-sub-heading">Change Password</h4>

              {pwSuccess && (
                <div className="sp-alert sp-alert--success">
                  <CheckCircle size={13}/> {pwSuccess}
                </div>
              )}
              {pwError && (
                <div className="sp-alert sp-alert--error">
                  <AlertCircle size={13}/> {pwError}
                </div>
              )}

              <Field label="Current Password">
                <div className="sp-pw-wrap">
                  <Input icon={Lock} type={showPw.cur ? 'text' : 'password'} value={pwForm.currentPassword}
                    onChange={e => { setPwError(''); setPwForm(f => ({ ...f, currentPassword: e.target.value })); }}
                    placeholder="••••••••"/>
                  <button className="sp-pw-eye" onClick={() => setShowPw(s => ({ ...s, cur: !s.cur }))}>
                    {showPw.cur ? <EyeOff size={14}/> : <Eye size={14}/>}
                  </button>
                </div>
              </Field>

              <div className="sp-grid-2">
                <Field label="New Password">
                  <div className="sp-pw-wrap">
                    <Input icon={Key} type={showPw.new ? 'text' : 'password'} value={pwForm.newPassword}
                      onChange={e => { setPwError(''); setPwForm(f => ({ ...f, newPassword: e.target.value })); }}
                      placeholder="Min. 6 characters"/>
                    <button className="sp-pw-eye" onClick={() => setShowPw(s => ({ ...s, new: !s.new }))}>
                      {showPw.new ? <EyeOff size={14}/> : <Eye size={14}/>}
                    </button>
                  </div>
                </Field>
                <Field label="Confirm New Password">
                  <div className="sp-pw-wrap">
                    <Input icon={Key} type={showPw.con ? 'text' : 'password'} value={pwForm.confirmPassword}
                      onChange={e => { setPwError(''); setPwForm(f => ({ ...f, confirmPassword: e.target.value })); }}
                      placeholder="Repeat password"/>
                    <button className="sp-pw-eye" onClick={() => setShowPw(s => ({ ...s, con: !s.con }))}>
                      {showPw.con ? <EyeOff size={14}/> : <Eye size={14}/>}
                    </button>
                  </div>
                </Field>
              </div>

              {pwForm.newPassword && (
                <div className="sp-pw-strength">
                  {['Weak','Fair','Good','Strong'].map((l, i) => (
                    <div key={l} className={`sp-pw-bar ${pwForm.newPassword.length > i * 3 + 2 ? `sp-pw-bar--${l.toLowerCase()}` : ''}`}/>
                  ))}
                  <span className="sp-pw-label">
                    {pwForm.newPassword.length < 6 ? 'Too short' : pwForm.newPassword.length < 9 ? 'Fair' : pwForm.newPassword.length < 12 ? 'Good' : 'Strong'}
                  </span>
                </div>
              )}

              <SaveBar saving={saving === 'password'} onSave={changePassword} label="Change Password"/>

              <div className="sp-divider"/>
              <h4 className="sp-sub-heading">Security Options</h4>

              <div className="sp-toggle-list">
                <ToggleRow Icon={Smartphone} label="Two-Factor Authentication" desc="Require a code from your authenticator app on login"
                  checked={sysSettings.twoFA} onChange={v => setSysSettings(s => ({ ...s, twoFA: v }))}/>
                <ToggleRow Icon={Shield} label="Audit Log" desc="Keep a record of all admin actions"
                  checked={sysSettings.auditLog} onChange={v => setSysSettings(s => ({ ...s, auditLog: v }))}/>
              </div>

              <div className="sp-session-card">
                <div>
                  <p className="sp-session-title">Session Timeout</p>
                  <p className="sp-session-sub">Auto-logout after inactivity</p>
                </div>
                <select className="sp-select sp-select--sm" value={sysSettings.sessionTimeout}
                  onChange={e => setSysSettings(s => ({ ...s, sessionTimeout: e.target.value }))}>
                  <option value="15">15 minutes</option>
                  <option value="30">30 minutes</option>
                  <option value="60">1 hour</option>
                  <option value="120">2 hours</option>
                  <option value="480">8 hours</option>
                </select>
              </div>
            </Panel>
          )}

          {/* ══ Notifications ════════════════════════════════ */}
          {activeSection === 'notifs' && (
            <Panel title="Notifications" subtitle="Choose which events trigger email alerts">
              <h4 className="sp-sub-heading">Reservation Events</h4>
              <div className="sp-toggle-list">
                <ToggleRow Icon={Bell}        label="New Reservation"  desc="Notify when a new booking is made"   checked={notifs.newReservation} onChange={v => setNotifs(n => ({ ...n, newReservation: v }))}/>
                <ToggleRow Icon={Bell}        label="Check-in Alert"   desc="Notify on guest check-in"            checked={notifs.checkIn}        onChange={v => setNotifs(n => ({ ...n, checkIn: v }))}/>
                <ToggleRow Icon={Bell}        label="Check-out Alert"  desc="Notify on guest check-out"           checked={notifs.checkOut}       onChange={v => setNotifs(n => ({ ...n, checkOut: v }))}/>
                <ToggleRow Icon={Bell}        label="Cancellation"     desc="Notify when a booking is cancelled"  checked={notifs.cancellation}   onChange={v => setNotifs(n => ({ ...n, cancellation: v }))}/>
                <ToggleRow Icon={DollarSign}  label="Payment Updates"  desc="Notify on payment events"            checked={notifs.payment}        onChange={v => setNotifs(n => ({ ...n, payment: v }))}/>
                <ToggleRow Icon={AlertCircle} label="System Alerts"    desc="Critical system notifications"       checked={notifs.systemAlerts}   onChange={v => setNotifs(n => ({ ...n, systemAlerts: v }))}/>
              </div>

              <div className="sp-divider"/>
              <h4 className="sp-sub-heading">Delivery Channels</h4>
              <div className="sp-toggle-list">
                <ToggleRow Icon={Mail}       label="Email Notifications" desc="Send alerts to your email" checked={notifs.emailNotifs} onChange={v => setNotifs(n => ({ ...n, emailNotifs: v }))}/>
                <ToggleRow Icon={Smartphone} label="SMS Notifications"   desc="Send alerts via SMS"       checked={notifs.smsNotifs}   onChange={v => setNotifs(n => ({ ...n, smsNotifs: v }))}/>
              </div>

              <SaveBar saving={saving === 'notifs'} onSave={saveNotifications} label="Save Preferences"/>
            </Panel>
          )}

          {/* ══ System ═══════════════════════════════════════ */}
          {activeSection === 'system' && (
            <Panel title="System" subtitle="Regional, display and operational settings">
              <div className="sp-grid-2">
                <Field label="Timezone">
                  <select className="sp-select" value={sysSettings.timezone} onChange={e => setSysSettings(s => ({ ...s, timezone: e.target.value }))}>
                    {TIMEZONE_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </Field>
                <Field label="Date Format">
                  <select className="sp-select" value={sysSettings.dateFormat} onChange={e => setSysSettings(s => ({ ...s, dateFormat: e.target.value }))}>
                    <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                    <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                    <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                  </select>
                </Field>
              </div>

              <div className="sp-divider"/>
              <h4 className="sp-sub-heading">Appearance</h4>
              <div className="sp-theme-cards">
                {[
                  { val: 'light',  label: 'Light Mode', Icon: Sun,     desc: 'Clean white interface' },
                  { val: 'dark',   label: 'Dark Mode',  Icon: Moon,    desc: 'Easy on the eyes'      },
                  { val: 'system', label: 'System',     Icon: Monitor, desc: 'Follow OS preference'  },
                ].map(({ val, label, Icon, desc }) => (
                  <button key={val} className={`sp-theme-card ${theme === val ? 'sp-theme-card--active' : ''}`} onClick={() => setTheme(val)}>
                    <Icon size={22}/><p>{label}</p><span>{desc}</span>
                    {theme === val && <CheckCircle size={14} className="sp-theme-card-check"/>}
                  </button>
                ))}
              </div>

              <div className="sp-divider"/>
              <h4 className="sp-sub-heading">Data Management</h4>
              <div className="sp-action-cards">
                <div className="sp-action-card">
                  <div className="sp-action-card-info">
                    <Download size={16}/>
                    <div><p>Export Data</p><span>Download all reservations as CSV</span></div>
                  </div>
                  <button className="sp-btn sp-btn--outline" onClick={() => toast('Export started — check your downloads')}>
                    Export CSV
                  </button>
                </div>
                <div className="sp-action-card">
                  <div className="sp-action-card-info">
                    <Shield size={16}/>
                    <div><p>Backup Settings</p><span>Save current config to JSON</span></div>
                  </div>
                  <button className="sp-btn sp-btn--outline" onClick={() => {
                    const blob = new Blob([JSON.stringify({ notifs, sysSettings }, null, 2)], { type: 'application/json' });
                    const url  = URL.createObjectURL(blob);
                    const a    = document.createElement('a');
                    a.href = url; a.download = 'settings-backup.json'; a.click();
                    toast('Settings backup downloaded');
                  }}>
                    Download
                  </button>
                </div>
              </div>

              <SaveBar saving={false} onSave={saveSystem} label="Save System Settings"/>
            </Panel>
          )}

          {/* ══ Danger Zone ══════════════════════════════════ */}
          {activeSection === 'danger' && (
            <Panel title="Danger Zone" subtitle="Irreversible actions — proceed with caution" danger>
              <div className="sp-danger-list">
                <DangerRow Icon={LogOut} title="Sign Out All Sessions"
                  desc="Immediately invalidates all active login sessions across all devices."
                  btnLabel="Sign Out All" onConfirm={() => toast('All sessions terminated')}/>
                <DangerRow Icon={Trash2} title="Clear All Cache"
                  desc="Removes all cached data. Pages will reload fresh on next visit."
                  btnLabel="Clear Cache"
                  onConfirm={() => {
                    localStorage.removeItem('sp-notifs');
                    localStorage.removeItem('sp-sys');
                    toast('Cache cleared');
                  }}/>
                <DangerRow Icon={Trash2} title="Reset All Settings"
                  desc="Restores all settings to factory defaults. This cannot be undone."
                  btnLabel="Reset Settings" destructive
                  onConfirm={() => {
                    localStorage.removeItem('sp-notifs');
                    localStorage.removeItem('sp-sys');
                    localStorage.removeItem('sp-theme');
                    setTheme('light');
                    toast('All settings reset to defaults');
                  }}/>
              </div>
            </Panel>
          )}

        </div>
      </div>
    </div>
  );
};

// ── Sub-components ────────────────────────────────────────────────
const Panel = ({ title, subtitle, danger, children }) => (
  <div className={`sp-panel ${danger ? 'sp-panel--danger' : ''}`}>
    <div className="sp-panel-header">
      <h2 className="sp-panel-title">{title}</h2>
      {subtitle && <p className="sp-panel-subtitle">{subtitle}</p>}
    </div>
    <div className="sp-panel-body">{children}</div>
  </div>
);

const SaveBar = ({ saving, onSave, label = 'Save Changes' }) => (
  <div className="sp-save-bar">
    <button className="sp-btn sp-btn--primary" onClick={onSave} disabled={saving}>
      {saving
        ? <><Loader size={14} className="spin"/> Saving…</>
        : <><Save size={14}/>{label}</>}
    </button>
  </div>
);

const ToggleRow = ({ Icon, label, desc, checked, onChange }) => (
  <div className="sp-toggle-row">
    <div className="sp-toggle-row-icon"><Icon size={15}/></div>
    <div className="sp-toggle-row-text"><p>{label}</p><span>{desc}</span></div>
    <button className={`sp-switch ${checked ? 'sp-switch--on' : ''}`} onClick={() => onChange(!checked)} type="button">
      <span className="sp-switch-knob"/>
    </button>
  </div>
);

const DangerRow = ({ Icon, title, desc, btnLabel, onConfirm, destructive }) => {
  const [confirming, setConfirming] = useState(false);
  return (
    <div className={`sp-danger-row ${destructive ? 'sp-danger-row--destructive' : ''}`}>
      <div className="sp-danger-row-info">
        <div className="sp-danger-row-icon"><Icon size={16}/></div>
        <div>
          <p className="sp-danger-row-title">{title}</p>
          <p className="sp-danger-row-desc">{desc}</p>
        </div>
      </div>
      {confirming ? (
        <div className="sp-danger-confirm">
          <span>Are you sure?</span>
          <button className="sp-btn sp-btn--danger-sm" onClick={() => { onConfirm(); setConfirming(false); }}>Yes</button>
          <button className="sp-btn sp-btn--ghost" onClick={() => setConfirming(false)}>No</button>
        </div>
      ) : (
        <button className={`sp-btn ${destructive ? 'sp-btn--danger' : 'sp-btn--danger-outline'}`} onClick={() => setConfirming(true)}>
          {btnLabel}
        </button>
      )}
    </div>
  );
};

export default SettingsPage;