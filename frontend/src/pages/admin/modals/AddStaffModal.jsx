// frontend/src/pages/admin/modals/AddStaffModal.jsx
import React, { useState } from 'react';
import axios from 'axios';
import {
  X, User, Mail, Phone, Building2,
  Briefcase, DollarSign, Calendar,
  Clock, Loader2, CheckCircle2, AlertCircle,
} from 'lucide-react';
import './AddStaffModal.css';

const API = process.env.REACT_APP_API_URL;

const getAuthHeaders = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
});

const departmentPositions = {
  "Front Office": [
    "Receptionist", "Front Desk Executive", "Guest Service Agent",
    "Concierge", "Reservation Agent", "Front Office Supervisor", "Front Office Manager",
  ],
  "Housekeeping": [
    "Room Attendant", "Cleaner", "Housekeeper", "Laundry Staff",
    "Public Area Cleaner", "Housekeeping Supervisor", "Housekeeping Manager",
  ],
  "Food & Beverage": [
    "Waiter", "Waitress", "Steward", "Chef", "Sous Chef", "Commis Chef",
    "Kitchen Staff", "Bartender", "Restaurant Supervisor", "F&B Manager", "Banquet Staff",
  ],
  "Maintenance": [
    "Technician", "Electrician", "Plumber", "HVAC Technician",
    "Maintenance Staff", "Engineering Supervisor", "Chief Engineer",
  ],
  "Administration": [
    "Admin Officer", "HR Officer", "Accountant", "IT Officer",
    "Assistant Manager", "General Manager",
  ],
  "Security": [
    "Security Guard", "Security Officer", "CCTV Operator", "Security Supervisor",
  ],
  "Transport": [
    "Driver", "Bellboy", "Porter", "Valet", "Transport Supervisor",
  ],
};

const SHIFT_OPTIONS = [
  "Morning (6 AM – 2 PM)",
  "Afternoon (2 PM – 10 PM)",
  "Night (10 PM – 6 AM)",
  "Day (9 AM – 5 PM)",
  "Split Shift",
  "Flexible",
];

const INITIAL_FORM = {
  name: '', email: '', phone: '',
  department: '', position: '',
  salary: '', joinDate: '', shiftTiming: '',
};

export default function AddStaffModal({ onClose }) {
  const [form, setForm]       = useState(INITIAL_FORM);
  const [errors, setErrors]   = useState({});
  const [status, setStatus]   = useState('idle'); // idle | loading | success | error
  const [errMsg, setErrMsg]   = useState('');

  const positions = form.department ? departmentPositions[form.department] : [];

  // ── Validation ──────────────────────────────────────────────
  const validate = () => {
    const e = {};
    if (!form.name.trim())       e.name       = 'Full name is required';
    if (!form.email.trim())      e.email      = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = 'Invalid email';
    if (!form.phone.trim())      e.phone      = 'Phone number is required';
    if (!form.department)        e.department = 'Select a department';
    if (!form.position)          e.position   = 'Select a position';
    return e;
  };

  // ── Field change ────────────────────────────────────────────
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: value,
      // reset position when department changes
      ...(name === 'department' ? { position: '' } : {}),
    }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
  };

  // ── Submit ──────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setStatus('loading');
    try {
      const payload = {
        name:        form.name.trim(),
        email:       form.email.trim().toLowerCase(),
        phone:       form.phone.trim(),
        department:  form.department,
        position:    form.position,
        salary:      form.salary      ? Number(form.salary)    : undefined,
        joinDate:    form.joinDate    ? form.joinDate           : undefined,
        shiftTiming: form.shiftTiming || undefined,
      };
      await axios.post(`${API}/staff`, payload, getAuthHeaders());
      setStatus('success');
      setTimeout(() => onClose(true), 1600);
    } catch (err) {
      setErrMsg(err.response?.data?.message || 'Failed to add staff member');
      setStatus('error');
    }
  };

  // ── Render ──────────────────────────────────────────────────
  return (
    <div className="astaff-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="astaff-modal">

        {/* Header */}
        <div className="astaff-header">
          <div className="astaff-header-left">
            <div className="astaff-header-icon">
              <Briefcase size={20} />
            </div>
            <div>
              <h2 className="astaff-title">Add Staff Member</h2>
              <p className="astaff-subtitle">Create a new hotel staff record</p>
            </div>
          </div>
          <button className="astaff-close" onClick={() => onClose()}>
            <X size={18} />
          </button>
        </div>

        {/* Success / Error banners */}
        {status === 'success' && (
          <div className="astaff-banner astaff-banner--success">
            <CheckCircle2 size={16} />
            Staff member added successfully!
          </div>
        )}
        {status === 'error' && (
          <div className="astaff-banner astaff-banner--error">
            <AlertCircle size={16} />
            {errMsg}
          </div>
        )}

        {/* Form */}
        <form className="astaff-form" onSubmit={handleSubmit} noValidate>

          {/* Section: Personal Info */}
          <div className="astaff-section-label">Personal Information</div>
          <div className="astaff-row">
            <Field label="Full Name" error={errors.name}>
              <div className="astaff-input-wrap">
                <User size={15} className="astaff-icon" />
                <input
                  name="name" value={form.name} onChange={handleChange}
                  placeholder="e.g. Kamal Perera"
                  className={errors.name ? 'err' : ''}
                />
              </div>
            </Field>
            <Field label="Email Address" error={errors.email}>
              <div className="astaff-input-wrap">
                <Mail size={15} className="astaff-icon" />
                <input
                  type="email" name="email" value={form.email} onChange={handleChange}
                  placeholder="kamal@hotel.com"
                  className={errors.email ? 'err' : ''}
                />
              </div>
            </Field>
          </div>

          <div className="astaff-row">
            <Field label="Phone Number" error={errors.phone}>
              <div className="astaff-input-wrap">
                <Phone size={15} className="astaff-icon" />
                <input
                  name="phone" value={form.phone} onChange={handleChange}
                  placeholder="+94 77 123 4567"
                  className={errors.phone ? 'err' : ''}
                />
              </div>
            </Field>
          </div>

          {/* Section: Role */}
          <div className="astaff-section-label" style={{ marginTop: '16px' }}>Department & Role</div>
          <div className="astaff-row">
            <Field label="Department" error={errors.department}>
              <div className="astaff-input-wrap">
                <Building2 size={15} className="astaff-icon" />
                <select
                  name="department" value={form.department} onChange={handleChange}
                  className={errors.department ? 'err' : ''}
                >
                  <option value="">Select department…</option>
                  {Object.keys(departmentPositions).map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>
            </Field>
            <Field label="Position" error={errors.position}>
              <div className="astaff-input-wrap">
                <Briefcase size={15} className="astaff-icon" />
                <select
                  name="position" value={form.position} onChange={handleChange}
                  disabled={!form.department}
                  className={errors.position ? 'err' : ''}
                >
                  <option value="">{form.department ? 'Select position…' : 'Choose department first'}</option>
                  {positions.map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>
            </Field>
          </div>

          {/* Section: Employment Details */}
          <div className="astaff-section-label" style={{ marginTop: '16px' }}>Employment Details</div>
          <div className="astaff-row">
            <Field label="Salary (optional)">
              <div className="astaff-input-wrap">
                <DollarSign size={15} className="astaff-icon" />
                <input
                  type="number" name="salary" value={form.salary} onChange={handleChange}
                  placeholder="e.g. 45000" min="0"
                />
              </div>
            </Field>
            <Field label="Join Date (optional)">
              <div className="astaff-input-wrap">
                <Calendar size={15} className="astaff-icon" />
                <input
                  type="date" name="joinDate" value={form.joinDate} onChange={handleChange}
                />
              </div>
            </Field>
          </div>

          <div className="astaff-row">
            <Field label="Shift Timing (optional)">
              <div className="astaff-input-wrap">
                <Clock size={15} className="astaff-icon" />
                <select name="shiftTiming" value={form.shiftTiming} onChange={handleChange}>
                  <option value="">Select shift…</option>
                  {SHIFT_OPTIONS.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            </Field>
          </div>

          {/* Footer */}
          <div className="astaff-footer">
            <button type="button" className="astaff-btn astaff-btn--cancel" onClick={() => onClose()}>
              Cancel
            </button>
            <button
              type="submit"
              className="astaff-btn astaff-btn--submit"
              disabled={status === 'loading' || status === 'success'}
            >
              {status === 'loading'
                ? <><Loader2 size={15} className="spin" /> Adding…</>
                : status === 'success'
                ? <><CheckCircle2 size={15} /> Added!</>
                : 'Add Staff Member'
              }
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}

// ── tiny helper ─────────────────────────────────────────────
function Field({ label, error, children }) {
  return (
    <div className="astaff-field">
      <label className="astaff-label">{label}</label>
      {children}
      {error && <span className="astaff-error">{error}</span>}
    </div>
  );
}