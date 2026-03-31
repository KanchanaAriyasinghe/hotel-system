// frontend/src/pages/admin/modals/EditUserModal.jsx
//
// Endpoint: PUT /api/users/:id   (updates the auth/user record)
// Optional: PUT /api/staff/:id   (updates the staff record if staffId provided)
//
// Props:
//   staff   — staff record (may be null)
//   user    — user/auth record (may be null)
//   onClose(boolean) — call with true to trigger a refresh

import React, { useState } from 'react';
import axios from 'axios';
import {
  X, Pencil, Eye, EyeOff,
  User, Mail, Phone, Shield,
  Building2, Briefcase, DollarSign,
  Clock, CheckCircle2, AlertCircle, Loader2,
} from 'lucide-react';
import './EditUserModal.css';

const API = process.env.REACT_APP_API_URL;
const getAuthHeaders = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
});

const ROLES = [
  { value: 'receptionist', label: 'Receptionist' },
  { value: 'housekeeper',  label: 'Housekeeper'  },
  { value: 'admin',        label: 'Admin'         },
];

export default function EditUserModal({ staff, user, onClose }) {
  const [showPw,  setShowPw]  = useState(false);
  const [status,  setStatus]  = useState('idle');
  const [errMsg,  setErrMsg]  = useState('');

  // Pre-fill from existing data
  const [form, setForm] = useState({
    fullName:    user?.fullName    || staff?.name     || '',
    email:       user?.email       || staff?.email    || '',
    phoneNumber: user?.phoneNumber || staff?.phone    || '',
    role:        (user?.role || 'receptionist').toLowerCase(),
    password:    '',                                      // leave blank = no change
    // staff-specific fields
    department:  staff?.department  || '',
    position:    staff?.position    || '',
    salary:      staff?.salary      || '',
    shiftTiming: staff?.shiftTiming || '',
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
    setErrMsg('');
  };

  const validate = () => {
    if (!form.fullName.trim())    return 'Full name is required.';
    if (!form.email.trim())       return 'Email is required.';
    if (!form.phoneNumber.trim()) return 'Phone number is required.';
    if (form.password && form.password.length < 6)
      return 'New password must be at least 6 characters.';
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const err = validate();
    if (err) { setErrMsg(err); setStatus('error'); return; }

    setStatus('loading');
    setErrMsg('');

    try {
      const updates = [];

      // 1) Update user/auth record if we have a user _id
      if (user?._id) {
        const payload = {
          fullName:    form.fullName.trim(),
          email:       form.email.trim().toLowerCase(),
          phoneNumber: form.phoneNumber.trim(),
          role:        form.role.toLowerCase(),
        };
        if (form.password) payload.password = form.password;
        updates.push(axios.put(`${API}/users/${user._id}`, payload, getAuthHeaders()));
      }

      // 2) Update staff record if we have a staff _id
      if (staff?._id) {
        const staffPayload = {
          name:        form.fullName.trim(),
          email:       form.email.trim().toLowerCase(),
          phone:       form.phoneNumber.trim(),
          department:  form.department,
          position:    form.position,
          salary:      form.salary,
          shiftTiming: form.shiftTiming,
        };
        updates.push(axios.put(`${API}/staff/${staff._id}`, staffPayload, getAuthHeaders()));
      }

      await Promise.all(updates);
      setStatus('success');
      setTimeout(() => onClose(true), 1400);
    } catch (err) {
      setErrMsg(
        err.response?.data?.message ||
        err.response?.data?.error   ||
        'Update failed. Please try again.'
      );
      setStatus('error');
    }
  };

  const hasStaff = !!staff;

  return (
    <div className="eum-overlay" onClick={e => e.target === e.currentTarget && onClose(false)}>
      <div className="eum-modal">

        {/* Header */}
        <div className="eum-header">
          <div className="eum-header-left">
            <div className="eum-header-icon"><Pencil size={19}/></div>
            <div>
              <h2 className="eum-title">Edit User</h2>
              <p className="eum-subtitle">{user?.fullName || staff?.name || 'Update account details'}</p>
            </div>
          </div>
          <button className="eum-close" onClick={() => onClose(false)}><X size={18}/></button>
        </div>

        {/* Banners */}
        {status === 'success' && (
          <div className="eum-banner eum-banner--success">
            <CheckCircle2 size={15}/> User updated successfully!
          </div>
        )}
        {status === 'error' && errMsg && (
          <div className="eum-banner eum-banner--error">
            <AlertCircle size={15}/> {errMsg}
          </div>
        )}

        <form className="eum-form" onSubmit={handleSubmit} noValidate>

          {/* ── Account Details ── */}
          <div className="eum-section-label">Account Details</div>

          <div className="eum-row">
            <div className="eum-field">
              <label className="eum-label">Full Name <span className="eum-req">*</span></label>
              <div className="eum-input-wrap">
                <User size={14} className="eum-icon"/>
                <input name="fullName" value={form.fullName} onChange={handleChange}
                  placeholder="Full name" disabled={status === 'loading' || status === 'success'}/>
              </div>
            </div>
            <div className="eum-field">
              <label className="eum-label">Phone <span className="eum-req">*</span></label>
              <div className="eum-input-wrap">
                <Phone size={14} className="eum-icon"/>
                <input name="phoneNumber" value={form.phoneNumber} onChange={handleChange}
                  placeholder="+94 77 123 4567" disabled={status === 'loading' || status === 'success'}/>
              </div>
            </div>
          </div>

          <div className="eum-field">
            <label className="eum-label">Email Address <span className="eum-req">*</span></label>
            <div className="eum-input-wrap">
              <Mail size={14} className="eum-icon"/>
              <input name="email" type="email" value={form.email} onChange={handleChange}
                placeholder="email@hotel.com" disabled={status === 'loading' || status === 'success'}/>
            </div>
          </div>

          <div className="eum-row">
            <div className="eum-field">
              <label className="eum-label">Role <span className="eum-req">*</span></label>
              <div className="eum-input-wrap">
                <Shield size={14} className="eum-icon"/>
                <select name="role" value={form.role} onChange={handleChange}
                  disabled={status === 'loading' || status === 'success'}>
                  {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </div>
            </div>
            <div className="eum-field">
              <label className="eum-label">New Password <span className="eum-optional">(leave blank to keep)</span></label>
              <div className="eum-input-wrap">
                <input name="password" type={showPw ? 'text' : 'password'} value={form.password}
                  onChange={handleChange} placeholder="Min. 6 characters"
                  disabled={status === 'loading' || status === 'success'}/>
                <button type="button" className="eum-pw-toggle" onClick={() => setShowPw(p => !p)}>
                  {showPw ? <EyeOff size={14}/> : <Eye size={14}/>}
                </button>
              </div>
            </div>
          </div>

          {/* ── Staff Details (only if staff record exists) ── */}
          {hasStaff && (
            <>
              <div className="eum-divider"/>
              <div className="eum-section-label">Staff Details</div>

              <div className="eum-row">
                <div className="eum-field">
                  <label className="eum-label">Department</label>
                  <div className="eum-input-wrap">
                    <Building2 size={14} className="eum-icon"/>
                    <input name="department" value={form.department} onChange={handleChange}
                      placeholder="e.g. Front Desk" disabled={status === 'loading' || status === 'success'}/>
                  </div>
                </div>
                <div className="eum-field">
                  <label className="eum-label">Position</label>
                  <div className="eum-input-wrap">
                    <Briefcase size={14} className="eum-icon"/>
                    <input name="position" value={form.position} onChange={handleChange}
                      placeholder="e.g. Senior Receptionist" disabled={status === 'loading' || status === 'success'}/>
                  </div>
                </div>
              </div>

              <div className="eum-row">
                <div className="eum-field">
                  <label className="eum-label">Salary</label>
                  <div className="eum-input-wrap">
                    <DollarSign size={14} className="eum-icon"/>
                    <input name="salary" type="number" value={form.salary} onChange={handleChange}
                      placeholder="e.g. 45000" disabled={status === 'loading' || status === 'success'}/>
                  </div>
                </div>
                <div className="eum-field">
                  <label className="eum-label">Shift Timing</label>
                  <div className="eum-input-wrap">
                    <Clock size={14} className="eum-icon"/>
                    <input name="shiftTiming" value={form.shiftTiming} onChange={handleChange}
                      placeholder="e.g. 08:00 – 16:00" disabled={status === 'loading' || status === 'success'}/>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Footer */}
          <div className="eum-footer">
            <button type="button" className="eum-btn eum-btn--cancel" onClick={() => onClose(false)}>
              Cancel
            </button>
            <button type="submit" className="eum-btn eum-btn--submit"
              disabled={status === 'loading' || status === 'success'}>
              {status === 'loading'
                ? <><Loader2 size={14} className="spin"/> Saving…</>
                : status === 'success'
                ? <><CheckCircle2 size={14}/> Saved!</>
                : 'Save Changes'
              }
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}