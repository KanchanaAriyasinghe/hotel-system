// frontend/src/pages/admin/modals/ManageRolesModal.jsx
//
// Endpoints:
//   GET /api/users          → { success, count, data: User[] }
//   PUT /api/users/:id      → update user (role, isActive, etc.)
//
// Valid roles: 'admin' | 'receptionist' | 'housekeeper'

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { X, Shield, Search, Check, Loader } from 'lucide-react';
import './Modal.css';

const API = process.env.REACT_APP_API_URL;

const getAuthHeaders = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
});

// Must match validRoles in authController.js
const VALID_ROLES = ['admin', 'receptionist', 'housekeeper'];

const ROLE_STYLE = {
  admin:        { bg: '#fef2f2', color: '#ef4444' },
  receptionist: { bg: '#f0f9ff', color: '#0ea5e9' },
  housekeeper:  { bg: '#f0fdf4', color: '#10b981' },
};

const ManageRolesModal = ({ onClose, users: initialUsers = [] }) => {
  // Use the users passed from parent (already fetched from GET /api/users)
  const [users, setUsers]   = useState(initialUsers);
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState({}); // { [userId]: bool }
  const [saved,  setSaved]  = useState({}); // { [userId]: bool } — tick flash
  const [error,  setError]  = useState('');

  // If no users passed, fetch directly
  useEffect(() => {
    if (initialUsers.length === 0) {
      axios.get(`${API}/users`, getAuthHeaders())
        .then(res => setUsers(res.data?.data ?? []))
        .catch(() => {}); // silently fail — parent already fetched
    }
  }, []);

  const handleRoleChange = async (userId, newRole) => {
    setSaving(p => ({ ...p, [userId]: true }));
    setError('');
    try {
      // PUT /api/users/:id  — sends { role }
      await axios.put(`${API}/users/${userId}`, { role: newRole }, getAuthHeaders());

      // Update local state immediately
      setUsers(p => p.map(u => u._id === userId ? { ...u, role: newRole } : u));

      // Flash tick then clear
      setSaved(p => ({ ...p, [userId]: true }));
      setTimeout(() => setSaved(p => ({ ...p, [userId]: false })), 1500);
    } catch (err) {
      setError(
        err.response?.data?.message ||
        err.response?.data?.error   ||
        'Failed to update role. Please try again.'
      );
    } finally {
      setSaving(p => ({ ...p, [userId]: false }));
    }
  };

  const handleToggleActive = async (userId, currentActive) => {
    setSaving(p => ({ ...p, [`active_${userId}`]: true }));
    try {
      await axios.put(`${API}/users/${userId}`, { isActive: !currentActive }, getAuthHeaders());
      setUsers(p => p.map(u => u._id === userId ? { ...u, isActive: !currentActive } : u));
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update user status.');
    } finally {
      setSaving(p => ({ ...p, [`active_${userId}`]: false }));
    }
  };

  const filtered = users.filter(u =>
    u.fullName?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase()) ||
    u.role?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="modal-overlay" onClick={() => onClose(false)}>
      <div className="modal-box modal-box--wide" onClick={e => e.stopPropagation()}>

        <div className="modal-header">
          <div className="modal-title-row">
            <span className="modal-icon" style={{ background: '#fdf2f8', color: '#ec4899' }}>
              <Shield size={20} />
            </span>
            <div>
              <h2>Manage Roles</h2>
              <p className="modal-subtitle">GET /api/users · PUT /api/users/:id</p>
            </div>
          </div>
          <button className="modal-close" onClick={() => onClose(false)}><X size={20} /></button>
        </div>

        <div className="modal-form" style={{ paddingBottom: 0 }}>

          {/* Search */}
          <div className="search-row">
            <Search size={15} />
            <input
              className="search-input"
              placeholder="Search by name, email or role…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            <span className="search-count">{filtered.length} user{filtered.length !== 1 ? 's' : ''}</span>
          </div>

          {error && <p className="form-error">{error}</p>}

          {/* Users list */}
          <div className="roles-list">
            {filtered.length === 0 && (
              <p className="roles-empty">No users found.</p>
            )}

            {filtered.map(u => {
              const rs = ROLE_STYLE[u.role] || ROLE_STYLE.receptionist;
              const isSavingRole   = saving[u._id];
              const isSavingActive = saving[`active_${u._id}`];
              const justSaved      = saved[u._id];

              return (
                <div className="role-row" key={u._id}>
                  {/* Avatar + info */}
                  <div className="role-user-info">
                    <div
                      className="role-avatar"
                      style={{ background: rs.bg, color: rs.color }}
                    >
                      {u.fullName?.charAt(0)?.toUpperCase() || '?'}
                    </div>
                    <div>
                      <p className="role-name">{u.fullName}</p>
                      <p className="role-email">{u.email}</p>
                      {u.phoneNumber && <p className="role-email">{u.phoneNumber}</p>}
                    </div>
                  </div>

                  {/* Controls */}
                  <div className="role-controls">
                    {/* Active toggle */}
                    <button
                      className={`role-active-btn ${u.isActive ? 'active' : 'inactive'}`}
                      title={u.isActive ? 'Deactivate user' : 'Activate user'}
                      disabled={isSavingActive}
                      onClick={() => handleToggleActive(u._id, u.isActive)}
                    >
                      {isSavingActive
                        ? <Loader size={12} className="spinning-inline" />
                        : u.isActive ? 'Active' : 'Inactive'
                      }
                    </button>

                    {/* Role select */}
                    <div className="role-select-wrap">
                      <select
                        value={u.role}
                        disabled={isSavingRole}
                        onChange={e => handleRoleChange(u._id, e.target.value)}
                        className="role-select"
                        style={{ borderColor: rs.color, color: rs.color }}
                      >
                        {VALID_ROLES.map(r => (
                          <option key={r} value={r}>
                            {r.charAt(0).toUpperCase() + r.slice(1)}
                          </option>
                        ))}
                      </select>
                      {isSavingRole
                        ? <Loader size={14} className="spinning-inline" style={{ color: '#9ca3af' }} />
                        : justSaved
                        ? <Check size={14} style={{ color: '#10b981' }} />
                        : null
                      }
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="modal-footer">
          <button type="button" className="btn-cancel" onClick={() => onClose(true)}>Done</button>
        </div>
      </div>
    </div>
  );
};

export default ManageRolesModal;