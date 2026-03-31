// frontend/src/pages/admin/modals/AddUserModal.jsx
//
// Endpoint: POST /api/auth/register
// Required fields: fullName, email, phoneNumber, password, role
// Valid roles: 'admin' | 'receptionist' | 'housekeeper'
//
// Props:
//   onClose(boolean) — call with true to trigger a refresh
//   staffList        — array of staff records from /api/staff

import React, { useState, useMemo } from 'react';
import axios from 'axios';
import {
  X, UserPlus, Eye, EyeOff,
  Search, User, Mail, Phone,
  Building2, Briefcase, Shield,
  CheckCircle2, AlertCircle, Loader2,
} from 'lucide-react';
import './AddUserModal.css';

const API = process.env.REACT_APP_API_URL;

const ROLES = [
  { value: 'receptionist', label: 'Receptionist' },
  { value: 'housekeeper',  label: 'Housekeeper'  },
  { value: 'admin',        label: 'Admin'         },
];

const EMPTY_FORM = {
  fullName: '', email: '', phoneNumber: '', password: '', role: 'receptionist',
};

export default function AddUserModal({ onClose, staffList = [] }) {
  const [query,    setQuery]    = useState('');          // search input
  const [picked,   setPicked]   = useState(null);        // selected staff record
  const [form,     setForm]     = useState(EMPTY_FORM);
  const [showPw,   setShowPw]   = useState(false);
  const [status,   setStatus]   = useState('idle');      // idle|loading|success|error
  const [errMsg,   setErrMsg]   = useState('');

  // ── Filter staff by name OR email ───────────────────────────
  const suggestions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return staffList
      .filter(s =>
        s.name?.toLowerCase().includes(q) ||
        s.email?.toLowerCase().includes(q)
      )
      .slice(0, 6);
  }, [query, staffList]);

  // ── Pick a staff member → pre-fill form ─────────────────────
  const handlePick = (s) => {
    setPicked(s);
    setQuery(s.name);          // show name in search box
    setForm(prev => ({
      ...prev,
      fullName:    s.name        || '',
      email:       s.email       || '',
      phoneNumber: s.phone       || '',
      // role stays as chosen by admin
    }));
  };

  // ── Clear staff selection ────────────────────────────────────
  const handleClearPick = () => {
    setPicked(null);
    setQuery('');
    setForm(EMPTY_FORM);
  };

  // ── Form field change ────────────────────────────────────────
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
    setErrMsg('');
  };

  // ── Validate ─────────────────────────────────────────────────
  const validate = () => {
    if (!form.fullName.trim())    return 'Full name is required.';
    if (!form.email.trim())       return 'Email is required.';
    if (!form.phoneNumber.trim()) return 'Phone number is required.';
    if (form.password.length < 6) return 'Password must be at least 6 characters.';
    return null;
  };

  // ── Submit ───────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    const err = validate();
    if (err) { setErrMsg(err); setStatus('error'); return; }

    setStatus('loading');
    setErrMsg('');
    try {
      await axios.post(`${API}/auth/register`, {
        fullName:    form.fullName.trim(),
        email:       form.email.trim().toLowerCase(),
        phoneNumber: form.phoneNumber.trim(),
        password:    form.password,
        role:        form.role,
      });
      setStatus('success');
      setTimeout(() => onClose(true), 1500);
    } catch (err) {
      setErrMsg(
        err.response?.data?.message ||
        err.response?.data?.error   ||
        'Registration failed. The email may already be in use.'
      );
      setStatus('error');
    }
  };

  // ────────────────────────────────────────────────────────────
  return (
    <div className="aum-overlay" onClick={e => e.target === e.currentTarget && onClose(false)}>
      <div className="aum-modal">

        {/* Header */}
        <div className="aum-header">
          <div className="aum-header-left">
            <div className="aum-header-icon"><UserPlus size={20}/></div>
            <div>
              <h2 className="aum-title">Add New User</h2>
              <p className="aum-subtitle">Create a system account for a staff member</p>
            </div>
          </div>
          <button className="aum-close" onClick={() => onClose(false)}><X size={18}/></button>
        </div>

        {/* Banners */}
        {status === 'success' && (
          <div className="aum-banner aum-banner--success">
            <CheckCircle2 size={15}/> User registered successfully!
          </div>
        )}
        {status === 'error' && errMsg && (
          <div className="aum-banner aum-banner--error">
            <AlertCircle size={15}/> {errMsg}
          </div>
        )}

        <form className="aum-form" onSubmit={handleSubmit} noValidate>

          {/* ── Step 1: Search staff ──────────────────────────── */}
          <div className="aum-section-label">
            Step 1 — Find Staff Member <span className="aum-optional">(optional)</span>
          </div>
          <p className="aum-hint">
            Search by name or email to auto-fill details from existing staff records.
          </p>

          <div className="aum-search-wrap">
            <Search size={14} className="aum-search-icon"/>
            <input
              className="aum-search"
              placeholder="Search staff name or email…"
              value={query}
              onChange={e => { setQuery(e.target.value); if (picked) setPicked(null); }}
              autoComplete="off"
              disabled={status === 'loading' || status === 'success'}
            />
            {(query || picked) && (
              <button type="button" className="aum-search-clear" onClick={handleClearPick}>
                <X size={13}/>
              </button>
            )}
          </div>

          {/* Suggestions dropdown */}
          {suggestions.length > 0 && !picked && (
            <ul className="aum-suggestions">
              {suggestions.map(s => (
                <li key={s._id} className="aum-suggestion-item" onClick={() => handlePick(s)}>
                  <div className="aum-sug-avatar">{(s.name || '?')[0].toUpperCase()}</div>
                  <div className="aum-sug-info">
                    <span className="aum-sug-name">{s.name}</span>
                    <span className="aum-sug-meta">
                      {s.email}
                      {s.department && <> · <Building2 size={10}/> {s.department}</>}
                      {s.position   && <> · <Briefcase size={10}/> {s.position}</>}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {/* Selected staff badge */}
          {picked && (
            <div className="aum-picked-badge">
              <div className="aum-picked-left">
                <div className="aum-picked-avatar">{(picked.name || '?')[0].toUpperCase()}</div>
                <div>
                  <p className="aum-picked-name">{picked.name}</p>
                  <p className="aum-picked-meta">
                    {picked.department && <><Building2 size={10}/>{picked.department}</>}
                    {picked.position   && <><Briefcase size={10}/>{picked.position}</>}
                  </p>
                </div>
              </div>
              <span className="aum-picked-tag">Pre-filled ✓</span>
            </div>
          )}

          {/* ── Step 2: Account details ───────────────────────── */}
          <div className="aum-section-label" style={{ marginTop: 20 }}>
            Step 2 — Account Details
          </div>

          <div className="aum-row">
            <div className="aum-field">
              <label className="aum-label">Full Name <span className="aum-req">*</span></label>
              <div className="aum-input-wrap">
                <User size={14} className="aum-icon"/>
                <input
                  name="fullName"
                  value={form.fullName}
                  onChange={handleChange}
                  placeholder="e.g. Kamal Perera"
                  disabled={status === 'loading' || status === 'success'}
                />
              </div>
            </div>
            <div className="aum-field">
              <label className="aum-label">Phone Number <span className="aum-req">*</span></label>
              <div className="aum-input-wrap">
                <Phone size={14} className="aum-icon"/>
                <input
                  name="phoneNumber"
                  value={form.phoneNumber}
                  onChange={handleChange}
                  placeholder="+94 77 123 4567"
                  disabled={status === 'loading' || status === 'success'}
                />
              </div>
            </div>
          </div>

          <div className="aum-field">
            <label className="aum-label">Email Address <span className="aum-req">*</span></label>
            <div className="aum-input-wrap">
              <Mail size={14} className="aum-icon"/>
              <input
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                placeholder="kamal@hotel.com"
                disabled={status === 'loading' || status === 'success'}
              />
            </div>
          </div>

          <div className="aum-row">
            <div className="aum-field">
              <label className="aum-label">Password <span className="aum-req">*</span></label>
              <div className="aum-input-wrap">
                <input
                  name="password"
                  type={showPw ? 'text' : 'password'}
                  value={form.password}
                  onChange={handleChange}
                  placeholder="Min. 6 characters"
                  disabled={status === 'loading' || status === 'success'}
                />
                <button
                  type="button"
                  className="aum-pw-toggle"
                  onClick={() => setShowPw(p => !p)}
                >
                  {showPw ? <EyeOff size={14}/> : <Eye size={14}/>}
                </button>
              </div>
            </div>
            <div className="aum-field">
              <label className="aum-label">Role <span className="aum-req">*</span></label>
              <div className="aum-input-wrap">
                <Shield size={14} className="aum-icon"/>
                <select
                  name="role"
                  value={form.role}
                  onChange={handleChange}
                  disabled={status === 'loading' || status === 'success'}
                >
                  {ROLES.map(r => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="aum-footer">
            <button
              type="button"
              className="aum-btn aum-btn--cancel"
              onClick={() => onClose(false)}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="aum-btn aum-btn--submit"
              disabled={status === 'loading' || status === 'success'}
            >
              {status === 'loading'
                ? <><Loader2 size={14} className="spin"/> Registering…</>
                : status === 'success'
                ? <><CheckCircle2 size={14}/> Registered!</>
                : 'Create User Account'
              }
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}