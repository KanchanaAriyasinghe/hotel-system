// frontend/src/pages/admin/AmenitiesPage.jsx

import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import {
  Plus, Pencil, Trash2, ToggleLeft, ToggleRight,
  Sparkles, AlertCircle, X, Check, Loader2,
} from 'lucide-react';
import './AmenitiesPage.css';

const API = process.env.REACT_APP_API_URL;

const ICON_OPTIONS = [
  '🛜', '🏊', '💆', '🍽️', '🍸', '🏋️', '📺', '❄️',
  '🚗', '🧹', '🛎️', '🔒', '🌿', '☕', '🛁', '🌅',
  '🎮', '📚', '🎵', '🔥', '✦', '⚡', '💎', '🌊',
];

const EMPTY_FORM = { name: '', label: '', icon: '✦', price: '', description: '' };

// ── Confirmation modal ────────────────────────────────────────────────────────
const ConfirmModal = ({ message, onConfirm, onCancel }) => (
  <div className="am-overlay" onClick={onCancel}>
    <div className="am-confirm-box" onClick={e => e.stopPropagation()}>
      <AlertCircle size={32} className="am-confirm-icon" />
      <p>{message}</p>
      <div className="am-confirm-actions">
        <button className="am-btn am-btn--ghost" onClick={onCancel}>Cancel</button>
        <button className="am-btn am-btn--danger" onClick={onConfirm}>Delete</button>
      </div>
    </div>
  </div>
);

// ── Form modal ────────────────────────────────────────────────────────────────
const AmenityModal = ({ initial, onSave, onClose, saving }) => {
  const [form, setForm]     = useState(initial || EMPTY_FORM);
  const [errors, setErrors] = useState({});

  const set = (k, v) => {
    setForm(f => ({ ...f, [k]: v }));
    setErrors(e => ({ ...e, [k]: undefined }));
  };

  const validate = () => {
    const e = {};
    if (!form.name.trim())    e.name  = 'Name is required';
    if (!form.label.trim())   e.label = 'Label is required';
    if (form.price === '' || isNaN(Number(form.price)) || Number(form.price) < 0)
      e.price = 'Valid price required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    onSave({ ...form, price: Number(form.price) });
  };

  return (
    <div className="am-overlay" onClick={onClose}>
      <div className="am-modal" onClick={e => e.stopPropagation()}>
        <div className="am-modal-header">
          <h2>{initial?._id ? 'Edit Amenity' : 'New Amenity'}</h2>
          <button className="am-icon-btn" onClick={onClose}><X size={18} /></button>
        </div>

        <div className="am-modal-body">
          {/* Icon picker */}
          <div className="am-field">
            <label>Icon</label>
            <div className="am-icon-grid">
              {ICON_OPTIONS.map(ic => (
                <button
                  key={ic}
                  type="button"
                  className={`am-icon-opt ${form.icon === ic ? 'selected' : ''}`}
                  onClick={() => set('icon', ic)}
                >{ic}</button>
              ))}
            </div>
          </div>

          <div className="am-row">
            <div className={`am-field ${errors.name ? 'has-error' : ''}`}>
              <label>Internal Name <span>*</span></label>
              <input
                value={form.name}
                onChange={e => set('name', e.target.value)}
                placeholder="e.g. wifi"
              />
              {errors.name && <span className="am-err">{errors.name}</span>}
            </div>

            <div className={`am-field ${errors.label ? 'has-error' : ''}`}>
              <label>Display Label <span>*</span></label>
              <input
                value={form.label}
                onChange={e => set('label', e.target.value)}
                placeholder="e.g. High-Speed Wi-Fi"
              />
              {errors.label && <span className="am-err">{errors.label}</span>}
            </div>
          </div>

          <div className={`am-field ${errors.price ? 'has-error' : ''}`}>
            <label>Price per Night (USD) <span>*</span></label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.price}
              onChange={e => set('price', e.target.value)}
              placeholder="0.00"
            />
            {errors.price && <span className="am-err">{errors.price}</span>}
          </div>

          <div className="am-field">
            <label>Description</label>
            <textarea
              value={form.description}
              onChange={e => set('description', e.target.value)}
              placeholder="Brief description shown to guests…"
              rows={3}
            />
          </div>
        </div>

        <div className="am-modal-footer">
          <button className="am-btn am-btn--ghost" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button className="am-btn am-btn--gold" onClick={handleSubmit} disabled={saving}>
            {saving
              ? <><Loader2 size={14} className="am-spin" /> Saving…</>
              : <><Check size={14} /> {initial?._id ? 'Save Changes' : 'Create Amenity'}</>
            }
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Main page ─────────────────────────────────────────────────────────────────
const AmenitiesPage = () => {
  const [amenities, setAmenities] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);
  const [toast, setToast]         = useState(null);
  const [modal, setModal]         = useState(null); // null | { mode: 'add'|'edit', data }
  const [confirm, setConfirm]     = useState(null); // null | amenity to delete
  const [search, setSearch]       = useState('');
  const [filter, setFilter]       = useState('all'); // all | active | inactive

  const token = localStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}` };

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3200);
  };

  const fetchAmenities = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await axios.get(`${API}/amenities`, { headers });
      setAmenities(data.data || []);
    } catch {
      showToast('Failed to load amenities', 'error');
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { fetchAmenities(); }, [fetchAmenities]);

  const handleSave = async (form) => {
    setSaving(true);
    try {
      if (modal.data?._id) {
        await axios.put(`${API}/amenities/${modal.data._id}`, form, { headers });
        showToast('Amenity updated');
      } else {
        await axios.post(`${API}/amenities`, form, { headers });
        showToast('Amenity created');
      }
      setModal(null);
      fetchAmenities();
    } catch (err) {
      showToast(err.response?.data?.message || 'Save failed', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm) return;
    try {
      await axios.delete(`${API}/amenities/${confirm._id}`, { headers });
      showToast('Amenity deleted and removed from all rooms');
      setConfirm(null);
      fetchAmenities();
    } catch (err) {
      showToast(err.response?.data?.message || 'Delete failed', 'error');
    }
  };

  const handleToggle = async (amenity) => {
    try {
      await axios.patch(`${API}/amenities/${amenity._id}/toggle`, {}, { headers });
      showToast(`Amenity ${amenity.isActive ? 'deactivated' : 'activated'}`);
      fetchAmenities();
    } catch {
      showToast('Toggle failed', 'error');
    }
  };

  const displayed = amenities
    .filter(a => {
      if (filter === 'active')   return a.isActive;
      if (filter === 'inactive') return !a.isActive;
      return true;
    })
    .filter(a =>
      !search ||
      a.label.toLowerCase().includes(search.toLowerCase()) ||
      a.name.toLowerCase().includes(search.toLowerCase())
    );

  const stats = {
    total:    amenities.length,
    active:   amenities.filter(a => a.isActive).length,
    inactive: amenities.filter(a => !a.isActive).length,
  };

  return (
    <div className="am-page">

      {/* Toast */}
      {toast && (
        <div className={`am-toast am-toast--${toast.type}`}>
          {toast.type === 'success' ? <Check size={14} /> : <AlertCircle size={14} />}
          {toast.msg}
        </div>
      )}

      {/* Confirm delete modal */}
      {confirm && (
        <ConfirmModal
          message={`Delete "${confirm.label}"? It will be removed from all rooms.`}
          onConfirm={handleDelete}
          onCancel={() => setConfirm(null)}
        />
      )}

      {/* Add / edit modal */}
      {modal && (
        <AmenityModal
          initial={modal.data}
          onSave={handleSave}
          onClose={() => setModal(null)}
          saving={saving}
        />
      )}

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="am-header">
        <div className="am-header-left">
          <div className="am-header-icon"><Sparkles size={20} /></div>
          <div>
            <h1>Amenities</h1>
            <p>Manage hotel amenities — name, icon, and nightly price</p>
          </div>
        </div>
        <button
          className="am-btn am-btn--gold"
          onClick={() => setModal({ data: null })}
        >
          <Plus size={16} /> Add Amenity
        </button>
      </div>

      {/* ── Stats ──────────────────────────────────────────────────────────── */}
      <div className="am-stats">
        {[
          { label: 'Total',    value: stats.total    },
          { label: 'Active',   value: stats.active   },
          { label: 'Inactive', value: stats.inactive },
        ].map(s => (
          <div className="am-stat-card" key={s.label}>
            <span className="am-stat-value">{s.value}</span>
            <span className="am-stat-label">{s.label}</span>
          </div>
        ))}
      </div>

      {/* ── Toolbar ────────────────────────────────────────────────────────── */}
      <div className="am-toolbar">
        <input
          className="am-search"
          placeholder="Search amenities…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <div className="am-filter-tabs">
          {['all', 'active', 'inactive'].map(f => (
            <button
              key={f}
              className={`am-filter-tab ${filter === f ? 'active' : ''}`}
              onClick={() => setFilter(f)}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* ── Table ──────────────────────────────────────────────────────────── */}
      {loading ? (
        <div className="am-loading">
          <Loader2 size={28} className="am-spin" />
          <span>Loading amenities…</span>
        </div>
      ) : displayed.length === 0 ? (
        <div className="am-empty">
          <Sparkles size={40} className="am-empty-icon" />
          <p>No amenities found</p>
          <button
            className="am-btn am-btn--gold"
            onClick={() => setModal({ data: null })}
          >
            <Plus size={14} /> Create your first amenity
          </button>
        </div>
      ) : (
        <div className="am-table-wrap">
          <table className="am-table">
            <thead>
              <tr>
                <th>Icon</th>
                <th>Name</th>
                <th>Label</th>
                <th>Price / Night</th>
                <th>Description</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {displayed.map(a => (
                <tr key={a._id} className={!a.isActive ? 'am-row--inactive' : ''}>
                  <td>
                    <span className="am-row-icon">{a.icon || '✦'}</span>
                  </td>
                  <td>
                    <code className="am-name-tag">{a.name}</code>
                  </td>
                  <td className="am-label-cell">{a.label}</td>
                  <td>
                    <span className="am-price">
                      {a.price === 0
                        ? <span className="am-free">Free</span>
                        : `$${Number(a.price).toFixed(2)}`
                      }
                    </span>
                  </td>
                  <td className="am-desc-cell">
                    {a.description || <span className="am-muted">—</span>}
                  </td>
                  <td>
                    <span className={`am-badge ${a.isActive ? 'am-badge--active' : 'am-badge--inactive'}`}>
                      {a.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td>
                    <div className="am-actions">
                      <button
                        className="am-icon-btn am-icon-btn--edit"
                        title="Edit"
                        onClick={() => setModal({ data: a })}
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        className="am-icon-btn am-icon-btn--toggle"
                        title={a.isActive ? 'Deactivate' : 'Activate'}
                        onClick={() => handleToggle(a)}
                      >
                        {a.isActive
                          ? <ToggleRight size={17} />
                          : <ToggleLeft  size={17} />
                        }
                      </button>
                      <button
                        className="am-icon-btn am-icon-btn--delete"
                        title="Delete"
                        onClick={() => setConfirm(a)}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default AmenitiesPage;