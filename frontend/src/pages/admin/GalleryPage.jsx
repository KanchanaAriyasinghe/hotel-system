// frontend/src/pages/admin/GalleryPage.jsx
//
// Full admin gallery management:
//   • View all images grouped by category (tabs)
//   • Add images via URL (single or bulk paste)
//   • Edit caption / category / order / active status
//   • Toggle active/inactive
//   • Delete single or bulk
//   • Live stats bar

import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import {
  Plus, Trash2, Edit3, Eye, EyeOff, RefreshCw,
  Image, BarChart2, X, Check, Upload, AlertCircle,
  ChevronDown, Layers, CheckSquare, Square,
} from 'lucide-react';
import './GalleryPage.css';

const API = process.env.REACT_APP_API_URL;

// ── Constants ─────────────────────────────────────────────────────
const CATEGORIES = [
  { id: 'all',        label: 'All',                  sub: 'Every image' },
  { id: 'rooms',      label: 'Luxury Rooms',          sub: 'Suites & Bedrooms' },
  { id: 'pool',       label: 'Swimming Pool',         sub: 'Aqua & Wellness' },
  { id: 'restaurant', label: 'Restaurant',            sub: 'Fine Dining' },
  { id: 'spa',        label: 'Spa Center',            sub: 'Relax & Rejuvenate' },
  { id: 'food',       label: 'Foods & Dining',        sub: 'Taste Luxury Cuisine' },
  { id: 'exclusive',  label: 'Exclusive Features',    sub: 'Luxury Redefined' },
  { id: 'services',   label: 'Experiences & Services',sub: 'Personalized Luxury' },
];

const CAT_OPTIONS = CATEGORIES.filter(c => c.id !== 'all');

const authHeader = () => {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

// ── Toast ─────────────────────────────────────────────────────────
const Toast = ({ toast, onClose }) => {
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(onClose, 3500);
    return () => clearTimeout(t);
  }, [toast, onClose]);

  if (!toast) return null;
  return (
    <div className={`gal-toast gal-toast--${toast.type}`}>
      {toast.type === 'success' ? <Check size={15} /> : <AlertCircle size={15} />}
      {toast.message}
    </div>
  );
};

// ── Edit Modal ────────────────────────────────────────────────────
const EditModal = ({ image, onClose, onSave, darkMode }) => {
  const [form, setForm] = useState({
    url:      image?.url      || '',
    caption:  image?.caption  || '',
    category: image?.category || 'rooms',
    order:    image?.order    ?? 0,
    active:   image?.active   ?? true,
  });
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState('');

  const handleSubmit = async () => {
    if (!form.url.trim())     return setError('URL is required');
    if (!form.caption.trim()) return setError('Caption is required');
    setError('');
    setSaving(true);
    try {
      await onSave(form);
      onClose();
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="gal-modal-overlay" onClick={onClose}>
      <div
        className={`gal-modal-box${darkMode ? ' gal-modal-box--dark' : ''}`}
        onClick={e => e.stopPropagation()}
      >
        <div className="gal-modal-header">
          <h3>{image._id ? 'Edit Image' : 'Add Image'}</h3>
          <button className="gal-modal-close" onClick={onClose}><X size={18} /></button>
        </div>

        {error && <div className="gal-modal-error"><AlertCircle size={14} />{error}</div>}

        {/* Preview */}
        {form.url && (
          <div className="gal-modal-preview">
            <img src={form.url} alt="preview" onError={e => { e.target.style.display = 'none'; }} />
          </div>
        )}

        <div className="gal-modal-fields">
          <label>Image URL *
            <input
              type="url"
              value={form.url}
              onChange={e => setForm(f => ({ ...f, url: e.target.value }))}
              placeholder="https://example.com/image.jpg"
            />
          </label>

          <label>Caption *
            <input
              type="text"
              value={form.caption}
              onChange={e => setForm(f => ({ ...f, caption: e.target.value }))}
              placeholder="Describe this image"
              maxLength={200}
            />
          </label>

          <div className="gal-modal-row">
            <label>Category *
              <select
                value={form.category}
                onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
              >
                {CAT_OPTIONS.map(c => (
                  <option key={c.id} value={c.id}>{c.label}</option>
                ))}
              </select>
            </label>

            <label>Display Order
              <input
                type="number"
                value={form.order}
                onChange={e => setForm(f => ({ ...f, order: Number(e.target.value) }))}
                min={0}
              />
            </label>
          </div>

          <label className="gal-modal-check">
            <input
              type="checkbox"
              checked={form.active}
              onChange={e => setForm(f => ({ ...f, active: e.target.checked }))}
            />
            Active (visible on the public gallery)
          </label>
        </div>

        <div className="gal-modal-footer">
          <button className="gal-btn gal-btn--ghost" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button className="gal-btn gal-btn--gold" onClick={handleSubmit} disabled={saving}>
            {saving ? 'Saving…' : 'Save Image'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Bulk Add Modal ────────────────────────────────────────────────
const BulkAddModal = ({ onClose, onSave, darkMode }) => {
  const defaultCat = 'rooms';
  const [lines,    setLines]    = useState('');
  const [category, setCategory] = useState(defaultCat);
  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState('');
  const [preview,  setPreview]  = useState([]);

  // Parse pasted lines: "url | caption" or just "url"
  const parseLines = (raw) => {
    return raw
      .split('\n')
      .map(l => l.trim())
      .filter(Boolean)
      .map((l, i) => {
        const parts = l.split('|').map(p => p.trim());
        return { url: parts[0] || '', caption: parts[1] || `Image ${i + 1}`, category, order: i };
      })
      .filter(item => item.url);
  };

  useEffect(() => {
    setPreview(parseLines(lines));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lines, category]);

  const handleSave = async () => {
    const items = parseLines(lines);
    if (!items.length) return setError('No valid image URLs found');
    setError('');
    setSaving(true);
    try {
      await onSave(items);
      onClose();
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to add images');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="gal-modal-overlay" onClick={onClose}>
      <div
        className={`gal-modal-box gal-modal-box--wide${darkMode ? ' gal-modal-box--dark' : ''}`}
        onClick={e => e.stopPropagation()}
      >
        <div className="gal-modal-header">
          <h3><Upload size={16} /> Bulk Add Images</h3>
          <button className="gal-modal-close" onClick={onClose}><X size={18} /></button>
        </div>

        {error && <div className="gal-modal-error"><AlertCircle size={14} />{error}</div>}

        <div className="gal-modal-bulk-hint">
          Paste one image per line. Format: <code>URL</code> or <code>URL | Caption</code>
        </div>

        <div className="gal-modal-fields">
          <label>Category for all images
            <select value={category} onChange={e => setCategory(e.target.value)}>
              {CAT_OPTIONS.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
          </label>

          <label>Image URLs
            <textarea
              rows={8}
              value={lines}
              onChange={e => setLines(e.target.value)}
              placeholder={`https://example.com/img1.jpg | Luxury Suite\nhttps://example.com/img2.jpg | Pool View`}
            />
          </label>
        </div>

        {preview.length > 0 && (
          <div className="gal-bulk-preview">
            <div className="gal-bulk-preview-title">
              Preview — {preview.length} image{preview.length > 1 ? 's' : ''}
            </div>
            <div className="gal-bulk-preview-grid">
              {preview.slice(0, 6).map((item, i) => (
                <div key={i} className="gal-bulk-preview-item">
                  <img src={item.url} alt={item.caption}
                    onError={e => { e.target.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg"/>'; }}
                  />
                  <span>{item.caption}</span>
                </div>
              ))}
              {preview.length > 6 && (
                <div className="gal-bulk-preview-more">+{preview.length - 6} more</div>
              )}
            </div>
          </div>
        )}

        <div className="gal-modal-footer">
          <button className="gal-btn gal-btn--ghost" onClick={onClose} disabled={saving}>Cancel</button>
          <button className="gal-btn gal-btn--gold" onClick={handleSave} disabled={saving || !preview.length}>
            {saving ? 'Adding…' : `Add ${preview.length} Image${preview.length !== 1 ? 's' : ''}`}
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Image Card ────────────────────────────────────────────────────
const ImageCard = ({ image, selected, onSelect, onEdit, onDelete, onToggle }) => {
  const [imgError, setImgError] = useState(false);

  return (
    <div className={`gal-card${!image.active ? ' gal-card--inactive' : ''}${selected ? ' gal-card--selected' : ''}`}>
      {/* Select checkbox */}
      <button className="gal-card-check" onClick={() => onSelect(image._id)}>
        {selected ? <CheckSquare size={18} /> : <Square size={18} />}
      </button>

      {/* Status badge */}
      <div className={`gal-card-status ${image.active ? 'gal-card-status--active' : 'gal-card-status--inactive'}`}>
        {image.active ? 'Active' : 'Hidden'}
      </div>

      {/* Image */}
      <div className="gal-card-img-wrap">
        {imgError ? (
          <div className="gal-card-img-error"><Image size={28} /><span>Image failed to load</span></div>
        ) : (
          <img
            src={image.url}
            alt={image.caption}
            loading="lazy"
            onError={() => setImgError(true)}
          />
        )}
      </div>

      {/* Info */}
      <div className="gal-card-body">
        <p className="gal-card-caption" title={image.caption}>{image.caption}</p>
        <div className="gal-card-meta">
          <span className="gal-card-cat">{image.category}</span>
          <span className="gal-card-order">#{image.order}</span>
        </div>
      </div>

      {/* Actions */}
      <div className="gal-card-actions">
        <button
          className="gal-card-btn gal-card-btn--toggle"
          onClick={() => onToggle(image)}
          title={image.active ? 'Hide image' : 'Show image'}
        >
          {image.active ? <EyeOff size={14} /> : <Eye size={14} />}
        </button>
        <button
          className="gal-card-btn gal-card-btn--edit"
          onClick={() => onEdit(image)}
          title="Edit image"
        >
          <Edit3 size={14} />
        </button>
        <button
          className="gal-card-btn gal-card-btn--delete"
          onClick={() => onDelete(image)}
          title="Delete image"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
};

// ── Main Component ────────────────────────────────────────────────
const AdminGalleryPage = () => {
  const darkMode = (() => {
    try { return JSON.parse(localStorage.getItem('admin_prefs') || '{}').darkMode ?? false; }
    catch { return false; }
  })();

  const [images,      setImages]      = useState([]);
  const [stats,       setStats]       = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [activeTab,   setActiveTab]   = useState('all');
  const [selected,    setSelected]    = useState(new Set());
  const [editImage,   setEditImage]   = useState(null);   // null | image object
  const [showBulk,    setShowBulk]    = useState(false);
  const [toast,       setToast]       = useState(null);
  const [deleteConf,  setDeleteConf]  = useState(null);   // null | image | 'bulk'
  const [searchTerm,  setSearchTerm]  = useState('');

  const showToast = (message, type = 'success') => setToast({ message, type });
  const clearToast = useCallback(() => setToast(null), []);

  // ── Fetch ───────────────────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [imgRes, statRes] = await Promise.all([
        axios.get(`${API}/gallery`,       { headers: authHeader() }),
        axios.get(`${API}/gallery/stats`, { headers: authHeader() }),
      ]);
      setImages(imgRes.data?.data   || []);
      setStats(statRes.data?.data   || null);
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to load gallery', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ── Filtered images ─────────────────────────────────────────────
  const displayed = images.filter(img => {
    const matchCat  = activeTab === 'all' || img.category === activeTab;
    const matchSrch = !searchTerm ||
      img.caption.toLowerCase().includes(searchTerm.toLowerCase()) ||
      img.url.toLowerCase().includes(searchTerm.toLowerCase());
    return matchCat && matchSrch;
  });

  // ── Selection helpers ───────────────────────────────────────────
  const toggleSelect = (id) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selected.size === displayed.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(displayed.map(i => i._id)));
    }
  };

  // ── CRUD ────────────────────────────────────────────────────────
  const handleAdd = async (form) => {
    const res = await axios.post(`${API}/gallery`, form, { headers: authHeader() });
    showToast('Image added');
    await fetchAll();
    return res;
  };

  const handleBulkAdd = async (items) => {
    const res = await axios.post(`${API}/gallery`, items, { headers: authHeader() });
    showToast(`${res.data?.data?.length || items.length} images added`);
    await fetchAll();
    return res;
  };

  const handleEdit = async (form) => {
    await axios.put(`${API}/gallery/${editImage._id}`, form, { headers: authHeader() });
    showToast('Image updated');
    await fetchAll();
  };

  const handleToggle = async (image) => {
    try {
      await axios.patch(`${API}/gallery/${image._id}/toggle`, {}, { headers: authHeader() });
      showToast(`Image ${image.active ? 'hidden' : 'shown'}`);
      await fetchAll();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to toggle', 'error');
    }
  };

  const handleDelete = async () => {
    if (!deleteConf) return;
    try {
      if (deleteConf === 'bulk') {
        await axios.delete(`${API}/gallery/bulk`, {
          headers: authHeader(),
          data: { ids: [...selected] },
        });
        showToast(`${selected.size} image(s) deleted`);
        setSelected(new Set());
      } else {
        await axios.delete(`${API}/gallery/${deleteConf._id}`, { headers: authHeader() });
        showToast('Image deleted');
      }
      setDeleteConf(null);
      await fetchAll();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to delete', 'error');
    }
  };

  // ── Stats summary ───────────────────────────────────────────────
  const totalImages  = stats?.totalAll    ?? images.length;
  const activeImages = stats?.totalActive ?? images.filter(i => i.active).length;

  return (
    <div className="gal-page">
      <Toast toast={toast} onClose={clearToast} />

      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="gal-page-header">
        <div className="gal-page-title">
          <h1><Image size={22} />Gallery Management</h1>
          <p className="gal-page-sub">Add, edit, and manage all gallery images shown on the public site</p>
        </div>
        <div className="gal-page-actions">
          <button className="gal-btn gal-btn--ghost" onClick={fetchAll} title="Refresh">
            <RefreshCw size={15} />
          </button>
          <button className="gal-btn gal-btn--outline" onClick={() => setShowBulk(true)}>
            <Layers size={15} /> Bulk Add
          </button>
          <button
            className="gal-btn gal-btn--gold"
            onClick={() => setEditImage({ url: '', caption: '', category: 'rooms', order: 0, active: true })}
          >
            <Plus size={15} /> Add Image
          </button>
        </div>
      </div>

      {/* ── Stats Bar ───────────────────────────────────────────── */}
      <div className="gal-stats-bar">
        <div className="gal-stat">
          <span className="gal-stat-val">{totalImages}</span>
          <span className="gal-stat-lbl">Total Images</span>
        </div>
        <div className="gal-stat">
          <span className="gal-stat-val gal-stat-val--green">{activeImages}</span>
          <span className="gal-stat-lbl">Active</span>
        </div>
        <div className="gal-stat">
          <span className="gal-stat-val gal-stat-val--muted">{totalImages - activeImages}</span>
          <span className="gal-stat-lbl">Hidden</span>
        </div>
        {stats?.categories?.map(cat => (
          <div key={cat._id} className="gal-stat gal-stat--cat">
            <span className="gal-stat-val">{cat.total}</span>
            <span className="gal-stat-lbl">{cat._id}</span>
          </div>
        ))}
      </div>

      {/* ── Toolbar ─────────────────────────────────────────────── */}
      <div className="gal-toolbar">
        <div className="gal-search-wrap">
          <input
            className="gal-search"
            type="text"
            placeholder="Search images…"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button className="gal-search-clear" onClick={() => setSearchTerm('')}>
              <X size={14} />
            </button>
          )}
        </div>

        {selected.size > 0 && (
          <div className="gal-bulk-bar">
            <span>{selected.size} selected</span>
            <button
              className="gal-btn gal-btn--danger-sm"
              onClick={() => setDeleteConf('bulk')}
            >
              <Trash2 size={13} /> Delete Selected
            </button>
            <button className="gal-btn gal-btn--ghost-sm" onClick={() => setSelected(new Set())}>
              <X size={13} /> Clear
            </button>
          </div>
        )}
      </div>

      {/* ── Category Tabs ────────────────────────────────────────── */}
      <div className="gal-tabs-wrap">
        <div className="gal-tabs">
          {CATEGORIES.map(cat => {
            const count = cat.id === 'all'
              ? images.length
              : images.filter(i => i.category === cat.id).length;
            return (
              <button
                key={cat.id}
                className={`gal-tab${activeTab === cat.id ? ' gal-tab--active' : ''}`}
                onClick={() => { setActiveTab(cat.id); setSelected(new Set()); }}
              >
                {cat.label}
                <span className="gal-tab-count">{count}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Select All Row ───────────────────────────────────────── */}
      {displayed.length > 0 && (
        <div className="gal-select-row">
          <button className="gal-select-all-btn" onClick={toggleSelectAll}>
            {selected.size === displayed.length && displayed.length > 0
              ? <CheckSquare size={15} /> : <Square size={15} />}
            {selected.size === displayed.length && displayed.length > 0
              ? 'Deselect All' : `Select All (${displayed.length})`}
          </button>
          <span className="gal-display-count">{displayed.length} image{displayed.length !== 1 ? 's' : ''}</span>
        </div>
      )}

      {/* ── Grid ────────────────────────────────────────────────── */}
      {loading ? (
        <div className="gal-loading">
          <div className="gal-spinner" />
          <p>Loading gallery…</p>
        </div>
      ) : displayed.length === 0 ? (
        <div className="gal-empty">
          <Image size={40} />
          <h3>No images found</h3>
          <p>{searchTerm ? 'Try a different search term.' : 'Add your first image to get started.'}</p>
          <button className="gal-btn gal-btn--gold" onClick={() => setEditImage({ url: '', caption: '', category: activeTab === 'all' ? 'rooms' : activeTab, order: 0, active: true })}>
            <Plus size={14} /> Add Image
          </button>
        </div>
      ) : (
        <div className="gal-grid">
          {displayed.map(img => (
            <ImageCard
              key={img._id}
              image={img}
              selected={selected.has(img._id)}
              onSelect={toggleSelect}
              onEdit={setEditImage}
              onDelete={img => setDeleteConf(img)}
              onToggle={handleToggle}
            />
          ))}
        </div>
      )}

      {/* ── Edit / Add Modal ─────────────────────────────────────── */}
      {editImage !== null && (
        <EditModal
          image={editImage}
          darkMode={darkMode}
          onClose={() => setEditImage(null)}
          onSave={editImage._id ? handleEdit : handleAdd}
        />
      )}

      {/* ── Bulk Add Modal ───────────────────────────────────────── */}
      {showBulk && (
        <BulkAddModal
          darkMode={darkMode}
          onClose={() => setShowBulk(false)}
          onSave={handleBulkAdd}
        />
      )}

      {/* ── Delete Confirm ───────────────────────────────────────── */}
      {deleteConf && (
        <div className="gal-modal-overlay" onClick={() => setDeleteConf(null)}>
          <div
            className={`gal-confirm-box${darkMode ? ' gal-confirm-box--dark' : ''}`}
            onClick={e => e.stopPropagation()}
          >
            <div className="gal-confirm-icon"><Trash2 size={24} /></div>
            <h3>Delete {deleteConf === 'bulk' ? `${selected.size} Images` : 'Image'}</h3>
            <p>
              {deleteConf === 'bulk'
                ? `Are you sure you want to delete ${selected.size} selected image(s)? This cannot be undone.`
                : `Are you sure you want to delete "${deleteConf.caption}"? This cannot be undone.`}
            </p>
            <div className="gal-confirm-btns">
              <button className="gal-btn gal-btn--ghost" onClick={() => setDeleteConf(null)}>
                Cancel
              </button>
              <button className="gal-btn gal-btn--danger" onClick={handleDelete}>
                <Trash2 size={14} /> Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminGalleryPage;