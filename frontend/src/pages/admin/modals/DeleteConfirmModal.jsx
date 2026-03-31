// frontend/src/pages/admin/modals/DeleteConfirmModal.jsx
//
// Endpoint: DELETE /api/users/:id  (deletes the auth/user record)
// Optional: DELETE /api/staff/:id  (deletes the staff record if staffId provided)
//
// Props:
//   staff   — staff record (may be null)
//   user    — user/auth record (may be null)
//   onClose(boolean) — call with true to trigger a refresh

import React, { useState } from 'react';
import axios from 'axios';
import { X, Trash2, AlertTriangle, Loader2, CheckCircle2 } from 'lucide-react';
import './DeleteConfirmModal.css';

const API = process.env.REACT_APP_API_URL;
const getAuthHeaders = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
});

export default function DeleteConfirmModal({ staff, user, onClose }) {
  const [status, setStatus] = useState('idle'); // idle | loading | success | error
  const [errMsg, setErrMsg] = useState('');

  const name = staff?.name || user?.fullName || 'this user';

  const handleDelete = async () => {
    setStatus('loading');
    setErrMsg('');
    try {
      const deletes = [];
      if (user?._id)  deletes.push(axios.delete(`${API}/users/${user._id}`,  getAuthHeaders()));
      if (staff?._id) deletes.push(axios.delete(`${API}/staff/${staff._id}`, getAuthHeaders()));
      await Promise.all(deletes);
      setStatus('success');
      setTimeout(() => onClose(true), 1200);
    } catch (err) {
      setErrMsg(
        err.response?.data?.message ||
        err.response?.data?.error   ||
        'Delete failed. Please try again.'
      );
      setStatus('error');
    }
  };

  return (
    <div className="dcm-overlay" onClick={e => e.target === e.currentTarget && onClose(false)}>
      <div className="dcm-modal">

        {/* Header */}
        <div className="dcm-header">
          <button className="dcm-close" onClick={() => onClose(false)}><X size={18}/></button>
        </div>

        {/* Body */}
        <div className="dcm-body">
          <div className="dcm-icon-wrap">
            <Trash2 size={28}/>
          </div>
          <h2 className="dcm-title">Delete User?</h2>
          <p className="dcm-desc">
            You're about to permanently delete <strong>{name}</strong>.
            This will remove their account{staff ? ' and staff record' : ''}. This action <strong>cannot be undone</strong>.
          </p>

          {status === 'error' && errMsg && (
            <div className="dcm-err">
              <AlertTriangle size={14}/> {errMsg}
            </div>
          )}

          {status === 'success' && (
            <div className="dcm-success">
              <CheckCircle2 size={14}/> Deleted successfully.
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="dcm-footer">
          <button className="dcm-btn dcm-btn--cancel" onClick={() => onClose(false)}
            disabled={status === 'loading' || status === 'success'}>
            Cancel
          </button>
          <button className="dcm-btn dcm-btn--delete" onClick={handleDelete}
            disabled={status === 'loading' || status === 'success'}>
            {status === 'loading'
              ? <><Loader2 size={14} className="spin"/> Deleting…</>
              : status === 'success'
              ? <><CheckCircle2 size={14}/> Deleted!</>
              : <><Trash2 size={14}/> Yes, Delete</>
            }
          </button>
        </div>
      </div>
    </div>
  );
}