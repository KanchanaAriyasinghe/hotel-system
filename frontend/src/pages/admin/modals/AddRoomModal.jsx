// frontend/src/pages/admin/modals/AddRoomModal.jsx

import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { X, BedDouble, Upload, Loader } from 'lucide-react';
import './Modal.css';
import UploadMedia from '../../../utils/mediaUpload';

const API = process.env.REACT_APP_API_URL;

const getAuthHeaders = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
});

const ROOM_TYPES = ['single', 'double', 'deluxe', 'suite', 'family'];

// Safe string helper — never pass raw object to JSX
const str = (val) => (val == null ? '' : String(val));

const AddRoomModal = ({ onClose }) => {
  const [form, setForm] = useState({
    roomNumber:          '',
    roomType:            'single',
    floor:               '',
    capacity:            '',
    pricePerNight:       '',
    description:         '',
    amenities:           [],   // array of _id strings
    status:              'available',
    images:              [],
    assignedHousekeeper: '',
    isActive:            true,
  });

  const [imageFiles, setImageFiles]             = useState([]);
  const [housekeepers, setHousekeepers]         = useState([]);
  const [hkLoading, setHkLoading]               = useState(false);
  const [amenitiesList, setAmenitiesList]       = useState([]);
  const [amenitiesLoading, setAmenitiesLoading] = useState(false);
  const [loading, setLoading]                   = useState(false);
  const [error, setError]                       = useState('');
  const [success, setSuccess]                   = useState('');
  const fileInputRef = useRef(null);

  // ── Fetch active amenities ──────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      setAmenitiesLoading(true);
      try {
        const res  = await axios.get(`${API}/amenities?active=true`, getAuthHeaders());
        const list = Array.isArray(res.data?.data) ? res.data.data : [];
        setAmenitiesList(list);
      } catch {
        setAmenitiesList([]);
      } finally {
        setAmenitiesLoading(false);
      }
    })();
  }, []);

  // ── Fetch housekeepers ──────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      setHkLoading(true);
      try {
        const res = await axios.get(`${API}/users`, getAuthHeaders());
        const all = Array.isArray(res.data) ? res.data : (res.data?.data ?? []);
        setHousekeepers(all.filter(u => u.role === 'housekeeper' && u.isActive !== false));
      } catch {
        setHousekeepers([]);
      } finally {
        setHkLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    return () => imageFiles.forEach(img => img.previewUrl && URL.revokeObjectURL(img.previewUrl));
  }, [imageFiles]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm(p => ({ ...p, [name]: type === 'checkbox' ? checked : value }));
    setError('');
  };

  const toggleAmenity = (id) =>
    setForm(p => ({
      ...p,
      amenities: p.amenities.includes(id)
        ? p.amenities.filter(x => x !== id)
        : [...p.amenities, id],
    }));

  // ── Image upload ────────────────────────────────────────────────────────────
  const handleFileSelect = async (e) => {
    const selected = Array.from(e.target.files);
    if (!selected.length) return;
    const newEntries = selected.map(file => ({
      file, previewUrl: URL.createObjectURL(file),
      supabaseUrl: null, uploading: true, error: null,
    }));
    setImageFiles(prev => [...prev, ...newEntries]);
    if (fileInputRef.current) fileInputRef.current.value = '';
    const startIndex = imageFiles.length;
    await Promise.all(newEntries.map(async (entry, i) => {
      const idx = startIndex + i;
      try {
        const url = await UploadMedia(entry.file);
        setImageFiles(prev => { const u = [...prev]; u[idx] = { ...u[idx], supabaseUrl: url, uploading: false }; return u; });
      } catch {
        setImageFiles(prev => { const u = [...prev]; u[idx] = { ...u[idx], uploading: false, error: 'Upload failed' }; return u; });
      }
    }));
  };

  const removeImage = (idx) => {
    setImageFiles(prev => {
      const e = prev[idx];
      if (e?.previewUrl) URL.revokeObjectURL(e.previewUrl);
      return prev.filter((_, i) => i !== idx);
    });
  };

  const validate = () => {
    if (!form.roomNumber.trim())                           return 'Room number is required.';
    if (!form.floor || isNaN(+form.floor))                 return 'Floor is required.';
    if (!form.capacity || isNaN(+form.capacity))           return 'Capacity is required.';
    if (!form.pricePerNight || isNaN(+form.pricePerNight)) return 'Price per night is required.';
    if (imageFiles.some(img => img.uploading))             return 'Please wait — images are still uploading.';
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const err = validate();
    if (err) { setError(err); return; }
    setLoading(true); setError('');
    try {
      const payload = {
        roomNumber:    form.roomNumber.trim(),
        roomType:      form.roomType,
        floor:         Number(form.floor),
        capacity:      Number(form.capacity),
        pricePerNight: Number(form.pricePerNight),
        description:   form.description.trim(),
        amenities:     form.amenities,
        status:        form.status,
        images:        imageFiles.filter(img => img.supabaseUrl && !img.error).map(img => img.supabaseUrl),
        isActive:      form.isActive,
        ...(form.assignedHousekeeper ? { assignedHousekeeper: form.assignedHousekeeper } : {}),
      };
      await axios.post(`${API}/rooms`, payload, getAuthHeaders());
      setSuccess(`✓ Room #${form.roomNumber} created successfully!`);
      setTimeout(() => onClose(true), 1400);
    } catch (err) {
      setError(err.response?.data?.message || err.response?.data?.error || 'Failed to create room.');
    } finally {
      setLoading(false);
    }
  };

  const uploadingCount = imageFiles.filter(i => i.uploading).length;
  const failedCount    = imageFiles.filter(i => i.error).length;

  return (
    <div className="modal-overlay" onClick={() => onClose(false)}>
      <div className="modal-box modal-box--wide" onClick={e => e.stopPropagation()}>

        <div className="modal-header">
          <div className="modal-title-row">
            <span className="modal-icon" style={{ background: '#f5f3ff', color: '#8b5cf6' }}>
              <BedDouble size={20} />
            </span>
            <div>
              <h2>Add New Room</h2>
              <p className="modal-subtitle">POST /api/rooms</p>
            </div>
          </div>
          <button className="modal-close" onClick={() => onClose(false)}><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">

          <div className="form-row">
            <div className="form-group">
              <label>Room Number <span className="req">*</span></label>
              <input name="roomNumber" value={form.roomNumber} onChange={handleChange} placeholder="e.g. 101" autoFocus />
            </div>
            <div className="form-group">
              <label>Floor <span className="req">*</span></label>
              <input name="floor" type="number" min="0" max="50" value={form.floor} onChange={handleChange} placeholder="e.g. 1" />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Room Type <span className="req">*</span></label>
              <select name="roomType" value={form.roomType} onChange={handleChange}>
                {ROOM_TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
              </select>
              <p className="field-hint">Accepted: single · double · deluxe · suite · family</p>
            </div>
            <div className="form-group">
              <label>Capacity (guests) <span className="req">*</span></label>
              <input name="capacity" type="number" min="1" max="10" value={form.capacity} onChange={handleChange} placeholder="e.g. 2" />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Price Per Night (USD) <span className="req">*</span></label>
              <input name="pricePerNight" type="number" min="0" step="0.01" value={form.pricePerNight} onChange={handleChange} placeholder="e.g. 120.00" />
            </div>
            <div className="form-group">
              <label>Initial Status</label>
              <select name="status" value={form.status} onChange={handleChange}>
                <option value="available">Available</option>
                <option value="occupied">Occupied</option>
                <option value="maintenance">Maintenance</option>
                <option value="cleaning">Cleaning</option>
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Assigned Housekeeper</label>
              <select name="assignedHousekeeper" value={form.assignedHousekeeper} onChange={handleChange} disabled={hkLoading}>
                <option value="">— None —</option>
                {housekeepers.map(hk => (
                  <option key={str(hk._id)} value={str(hk._id)}>
                    {str(hk.fullName)}{hk.email ? ` (${str(hk.email)})` : ''}
                  </option>
                ))}
              </select>
              {hkLoading && <p className="field-hint">Loading housekeepers…</p>}
              {!hkLoading && housekeepers.length === 0 && <p className="field-hint">No housekeepers found.</p>}
            </div>
            <div className="form-group" style={{ justifyContent: 'flex-end' }}>
              <label>Room Active</label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 'normal', marginTop: '6px' }}>
                <input type="checkbox" name="isActive" checked={form.isActive} onChange={handleChange} style={{ width: '16px', height: '16px', accentColor: '#8b5cf6', cursor: 'pointer' }} />
                {form.isActive ? 'Active (visible to guests)' : 'Inactive (hidden from guests)'}
              </label>
              <p className="field-hint">Defaults to active. Inactive rooms won't appear in booking.</p>
            </div>
          </div>

          <div className="form-group">
            <label>Description</label>
            <textarea name="description" value={form.description} onChange={handleChange} rows={2} placeholder="Brief description of the room…" />
          </div>

          {/* ── Amenities (dynamic from Amenity schema) ── */}
          <div className="form-group">
            <label>Amenities</label>
            {amenitiesLoading ? (
              <p className="field-hint">Loading amenities…</p>
            ) : amenitiesList.length === 0 ? (
              <p className="field-hint">No active amenities found. Add amenities in the Amenities section first.</p>
            ) : (
              <div className="chip-grid">
                {amenitiesList.map(amenity => {
                  const id       = str(amenity._id);
                  const label    = str(amenity.label || amenity.name);
                  const icon     = str(amenity.icon);
                  const price    = Number(amenity.price) || 0;
                  const isActive = form.amenities.includes(id);
                  return (
                    <button
                      key={id}
                      type="button"
                      className={`chip${isActive ? ' chip--active' : ''}`}
                      onClick={() => toggleAmenity(id)}
                      title={str(amenity.description) || label}
                    >
                      {icon && <span style={{ marginRight: 4 }}>{icon}</span>}
                      {label}
                      {price > 0 && (
                        <span style={{ marginLeft: 4, opacity: 0.7, fontSize: '0.68rem' }}>
                          {'$' + price}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
            {form.amenities.length > 0 && (
              <p className="field-hint">
                {form.amenities.length} {form.amenities.length === 1 ? 'amenity' : 'amenities'} selected
              </p>
            )}
          </div>

          {/* ── Images ── */}
          <div className="form-group">
            <label>Images</label>
            <div
              className="img-upload-zone"
              onClick={() => fileInputRef.current?.click()}
              onDragOver={e => { e.preventDefault(); e.currentTarget.classList.add('img-upload-zone--drag'); }}
              onDragLeave={e => e.currentTarget.classList.remove('img-upload-zone--drag')}
              onDrop={e => {
                e.preventDefault();
                e.currentTarget.classList.remove('img-upload-zone--drag');
                if (e.dataTransfer.files.length) handleFileSelect({ target: { files: e.dataTransfer.files } });
              }}
            >
              <Upload size={18} />
              <span>Click or drag images here</span>
              <span className="img-upload-hint">JPG, PNG, WEBP — multiple allowed</span>
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={handleFileSelect} />

            {imageFiles.length > 0 && (
              <div style={{ display: 'flex', gap: '10px', marginTop: '6px', flexWrap: 'wrap' }}>
                {uploadingCount > 0 && <p className="field-hint" style={{ color: '#8b5cf6' }}>{'⏳ ' + uploadingCount + ' image' + (uploadingCount > 1 ? 's' : '') + ' uploading…'}</p>}
                {failedCount > 0 && <p className="field-hint" style={{ color: '#9a3020' }}>{'✗ ' + failedCount + ' upload' + (failedCount > 1 ? 's' : '') + ' failed'}</p>}
                {uploadingCount === 0 && failedCount === 0 && <p className="field-hint" style={{ color: '#2d7a4f' }}>{'✓ ' + imageFiles.length + ' image' + (imageFiles.length > 1 ? 's' : '') + ' ready'}</p>}
              </div>
            )}

            {imageFiles.length > 0 && (
              <div className="img-preview-grid">
                {imageFiles.map((img, idx) => (
                  <div key={idx} className={`img-preview-item${img.uploading ? ' img-preview-item--loading' : ''}${img.error ? ' img-preview-item--error' : ''}`}>
                    <img src={img.previewUrl} alt={`Preview ${idx + 1}`} className="img-preview-thumb" />
                    {img.uploading && <div className="img-preview-overlay"><Loader size={16} className="img-upload-spinner" /></div>}
                    {img.error && <div className="img-preview-overlay img-preview-overlay--error"><span style={{ fontSize: '10px', textAlign: 'center', padding: '0 4px' }}>Failed</span></div>}
                    {img.supabaseUrl && !img.uploading && !img.error && <div className="img-preview-badge">✓</div>}
                    <button type="button" className="img-preview-remove" onClick={() => removeImage(idx)} title="Remove"><X size={12} /></button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {error   && <p className="form-error">{error}</p>}
          {success && <p className="form-success">{success}</p>}

          <div className="modal-footer">
            <button type="button" className="btn-cancel" onClick={() => onClose(false)}>Cancel</button>
            <button type="submit" className="btn-submit" style={{ '--btn-color': '#8b5cf6' }} disabled={loading || uploadingCount > 0}>
              {loading ? 'Creating…' : uploadingCount > 0 ? 'Uploading…' : 'Create Room'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddRoomModal;