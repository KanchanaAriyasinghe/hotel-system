// frontend/src/components/GuestAuthModal.jsx

import React, { useState, useEffect } from 'react';
import {
  X, User, Mail, Phone, Lock, Eye, EyeOff, Loader, Check,
  LogIn, UserPlus, ArrowLeft, Send, ShieldCheck, CreditCard,
} from 'lucide-react';
import { useGuestAuth } from '../context/GuestAuthContext';
import './GuestAuthModal.css';

// ── ID proof options ────────────────────────────────────────────────────────
const ID_PROOF_OPTIONS = [
  { value: '',                 label: 'Select ID type (optional)' },
  { value: 'passport',         label: '🛂 Passport' },
  { value: 'national_id',      label: '🪪 National ID Card' },
  { value: 'drivers_license',  label: '🚗 Driver\'s License' },
  { value: 'voter_id',         label: '🗳️ Voter ID' },
  { value: 'residence_permit', label: '🏠 Residence Permit' },
  { value: 'military_id',      label: '⚔️ Military ID' },
  { value: 'other',            label: '📄 Other Government ID' },
];

// mode: 'login' | 'register' | 'forgot' | 'forgot-sent'
const GuestAuthModal = ({ onClose, onSuccess, initialMode = 'login' }) => {
  const { login, register, forgotPassword } = useGuestAuth();

  const [mode,     setMode]     = useState(initialMode);
  const [showPass, setShowPass] = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');
  const [success,  setSuccess]  = useState('');

  const [form, setForm] = useState({
    name: '', email: '', phone: '', password: '',
    address: '', city: '', country: '', idProof: '',
  });

  // Close on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const handleChange = (e) => {
    setError('');
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  // ── LOGIN ────────────────────────────────────────────────────────────────
  const handleLogin = async () => {
    if (!form.email || !form.password) {
      setError('Please enter your email and password');
      return;
    }
    setLoading(true);
    try {
      const result = await login({ email: form.email, password: form.password });
      if (result.success) {
        setSuccess('Welcome back!');
        setTimeout(() => { onSuccess && onSuccess(result.guest); onClose(); }, 800);
      } else {
        setError(result.message || 'Something went wrong. Please try again.');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ── REGISTER ─────────────────────────────────────────────────────────────
  const handleRegister = async () => {
    if (!form.name || !form.email || !form.phone || !form.password) {
      setError('Please fill in all required fields');
      return;
    }
    if (form.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    setLoading(true);
    try {
      const result = await register({
        name:     form.name,
        email:    form.email,
        phone:    form.phone,
        password: form.password,
        address:  form.address,
        city:     form.city,
        country:  form.country,
        idProof:  form.idProof,
      });
      if (result.success) {
        setSuccess('Account created!');
        setTimeout(() => { onSuccess && onSuccess(result.guest); onClose(); }, 800);
      } else {
        setError(result.message || 'Something went wrong. Please try again.');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ── FORGOT PASSWORD ───────────────────────────────────────────────────────
  const handleForgotPassword = async () => {
    if (!form.email) {
      setError('Please enter your email address');
      return;
    }
    setLoading(true);
    try {
      const result = await forgotPassword(form.email);
      if (result.success) {
        setMode('forgot-sent');
        setError('');
      } else {
        setError(result.message || 'Something went wrong. Please try again.');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = () => {
    if (mode === 'login')    return handleLogin();
    if (mode === 'register') return handleRegister();
    if (mode === 'forgot')   return handleForgotPassword();
  };

  const switchMode = (m) => {
    setMode(m);
    setError('');
    setSuccess('');
    setShowPass(false);
    setForm({ name: '', email: '', phone: '', password: '', address: '', city: '', country: '', idProof: '' });
  };

  // ── Header copy per mode ─────────────────────────────────────────────────
  const headerMap = {
    login:        { eyebrow: 'Guest Login',        title: <>Welcome <em>Back</em></>,  sub: 'Sign in to auto-fill your booking details and access your reservations.' },
    register:     { eyebrow: 'Create Account',     title: <>Join <em>Us</em></>,        sub: 'Create a guest account to manage your bookings and stay preferences.' },
    forgot:       { eyebrow: 'Password Recovery',  title: <>Reset <em>Password</em></>, sub: 'Enter the email linked to your guest account and we\'ll send a reset link.' },
    'forgot-sent':{ eyebrow: 'Check Your Inbox',   title: <>Link <em>Sent</em></>,      sub: 'A password reset link has been sent if that email is registered with us.' },
  };
  const { eyebrow, title, sub } = headerMap[mode] || headerMap.login;

  const isAuthMode = mode === 'login' || mode === 'register';

  return (
    <div className="gam-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="gam-modal">

        {/* ── Header ── */}
        <div className="gam-header">
          <div className="gam-header-deco" />
          <button className="gam-close" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
          <div className="gam-eyebrow">
            {mode === 'login'         && <LogIn      size={13} />}
            {mode === 'register'      && <UserPlus   size={13} />}
            {mode === 'forgot'        && <Send       size={13} />}
            {mode === 'forgot-sent'   && <ShieldCheck size={13} />}
            {eyebrow}
          </div>
          <h2 className="gam-title">{title}</h2>
          <p className="gam-subtitle">{sub}</p>
        </div>

        {/* ── Tab switcher (login / register only) ── */}
        {isAuthMode && (
          <div className="gam-tabs">
            <button
              className={`gam-tab ${mode === 'login' ? 'gam-tab--active' : ''}`}
              onClick={() => switchMode('login')}
            >
              <LogIn size={14} /> Sign In
            </button>
            <button
              className={`gam-tab ${mode === 'register' ? 'gam-tab--active' : ''}`}
              onClick={() => switchMode('register')}
            >
              <UserPlus size={14} /> Register
            </button>
          </div>
        )}

        {/* ── Back link (forgot / forgot-sent) ── */}
        {(mode === 'forgot' || mode === 'forgot-sent') && (
          <div className="gam-back-bar">
            <button className="gam-back-btn" onClick={() => switchMode('login')}>
              <ArrowLeft size={13} /> Back to Sign In
            </button>
          </div>
        )}

        {/* ── Body ── */}
        <div className="gam-body">

          {/* Success state */}
          {success && (
            <div className="gam-success">
              <div className="gam-success-icon"><Check size={20} /></div>
              <span>{success}</span>
            </div>
          )}

          {/* Error */}
          {error && <div className="gam-error">{error}</div>}

          {/* ══════════════════════════════════════════════════════
              LOGIN FIELDS
          ══════════════════════════════════════════════════════ */}
          {mode === 'login' && (
            <div className="gam-fields">
              <div className="gam-field">
                <label className="gam-label"><Mail size={12} /> Email Address</label>
                <input
                  className="gam-input"
                  type="email"
                  name="email"
                  placeholder="your@email.com"
                  value={form.email}
                  onChange={handleChange}
                  autoFocus
                />
              </div>
              <div className="gam-field">
                <label className="gam-label"><Lock size={12} /> Password</label>
                <div className="gam-input-wrap">
                  <input
                    className="gam-input gam-input--padded"
                    type={showPass ? 'text' : 'password'}
                    name="password"
                    placeholder="Enter your password"
                    value={form.password}
                    onChange={handleChange}
                    onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                  />
                  <button
                    className="gam-eye"
                    type="button"
                    onClick={() => setShowPass(p => !p)}
                    tabIndex={-1}
                  >
                    {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              {/* Forgot password link */}
              <div className="gam-forgot-row">
                <button
                  className="gam-forgot-link"
                  type="button"
                  onClick={() => switchMode('forgot')}
                >
                  Forgot your password?
                </button>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════
              REGISTER FIELDS
          ══════════════════════════════════════════════════════ */}
          {mode === 'register' && (
            <div className="gam-fields">
              <div className="gam-row-2">
                <div className="gam-field">
                  <label className="gam-label"><User size={12} /> Full Name <span className="gam-req">*</span></label>
                  <input
                    className="gam-input"
                    type="text"
                    name="name"
                    placeholder="Your full name"
                    value={form.name}
                    onChange={handleChange}
                    autoFocus
                  />
                </div>
                <div className="gam-field">
                  <label className="gam-label"><Phone size={12} /> Phone <span className="gam-req">*</span></label>
                  <input
                    className="gam-input"
                    type="tel"
                    name="phone"
                    placeholder="+1 (000) 000-0000"
                    value={form.phone}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div className="gam-field">
                <label className="gam-label"><Mail size={12} /> Email Address <span className="gam-req">*</span></label>
                <input
                  className="gam-input"
                  type="email"
                  name="email"
                  placeholder="your@email.com"
                  value={form.email}
                  onChange={handleChange}
                />
              </div>

              <div className="gam-field">
                <label className="gam-label"><Lock size={12} /> Password <span className="gam-req">*</span></label>
                <div className="gam-input-wrap">
                  <input
                    className="gam-input gam-input--padded"
                    type={showPass ? 'text' : 'password'}
                    name="password"
                    placeholder="Min. 6 characters"
                    value={form.password}
                    onChange={handleChange}
                  />
                  <button
                    className="gam-eye"
                    type="button"
                    onClick={() => setShowPass(p => !p)}
                    tabIndex={-1}
                  >
                    {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              {/* ID Proof */}
              <div className="gam-field">
                <label className="gam-label"><CreditCard size={12} /> ID Proof Type</label>
                <div className="gam-select-wrap">
                  <select
                    className="gam-input gam-select"
                    name="idProof"
                    value={form.idProof}
                    onChange={handleChange}
                  >
                    {ID_PROOF_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
                {form.idProof && (
                  <p className="gam-field-hint">
                    You may be asked to present this ID at check-in for verification.
                  </p>
                )}
              </div>

              <div className="gam-divider"><span>Optional details</span></div>

              <div className="gam-row-3">
                <div className="gam-field">
                  <label className="gam-label">Address</label>
                  <input
                    className="gam-input"
                    type="text"
                    name="address"
                    placeholder="Street address"
                    value={form.address}
                    onChange={handleChange}
                  />
                </div>
                <div className="gam-field">
                  <label className="gam-label">City</label>
                  <input
                    className="gam-input"
                    type="text"
                    name="city"
                    placeholder="City"
                    value={form.city}
                    onChange={handleChange}
                  />
                </div>
                <div className="gam-field">
                  <label className="gam-label">Country</label>
                  <input
                    className="gam-input"
                    type="text"
                    name="country"
                    placeholder="Country"
                    value={form.country}
                    onChange={handleChange}
                  />
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════
              FORGOT PASSWORD FIELDS
          ══════════════════════════════════════════════════════ */}
          {mode === 'forgot' && (
            <div className="gam-fields">
              <div className="gam-field">
                <label className="gam-label"><Mail size={12} /> Email Address</label>
                <input
                  className="gam-input"
                  type="email"
                  name="email"
                  placeholder="your@email.com"
                  value={form.email}
                  onChange={handleChange}
                  autoFocus
                  onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                />
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════
              FORGOT-SENT STATE
          ══════════════════════════════════════════════════════ */}
          {mode === 'forgot-sent' && (
            <div className="gam-sent-card">
              <div className="gam-sent-icon">
                <Send size={22} />
              </div>
              <p className="gam-sent-text">
                If <strong>{form.email || 'that email'}</strong> is registered with us, you'll receive a
                reset link shortly. Please also check your spam folder.
              </p>
              <p className="gam-sent-note">The link expires in 1 hour.</p>
            </div>
          )}

          {/* ── Submit (not shown on forgot-sent) ── */}
          {mode !== 'forgot-sent' && (
            <button
              className="gam-submit"
              onClick={handleSubmit}
              disabled={loading || !!success}
            >
              {loading ? (
                <>
                  <Loader size={16} className="gam-spinner" />
                  {mode === 'login'    && 'Signing in…'}
                  {mode === 'register' && 'Creating account…'}
                  {mode === 'forgot'   && 'Sending link…'}
                </>
              ) : success ? (
                <><Check size={16} /> Done!</>
              ) : (
                <>
                  {mode === 'login'    && <><LogIn    size={16} /> Sign In</>}
                  {mode === 'register' && <><UserPlus size={16} /> Create Account</>}
                  {mode === 'forgot'   && <><Send     size={16} /> Send Reset Link</>}
                </>
              )}
            </button>
          )}

          {/* ── Resend link (forgot-sent) ── */}
          {mode === 'forgot-sent' && (
            <button
              className="gam-submit"
              onClick={() => switchMode('forgot')}
            >
              <Send size={16} /> Send Another Link
            </button>
          )}

          {/* ── Skip option (login / register only) ── */}
          {isAuthMode && (
            <button className="gam-skip" onClick={onClose}>
              Continue as guest without account
            </button>
          )}

        </div>
      </div>
    </div>
  );
};

export default GuestAuthModal;