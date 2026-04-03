// frontend/src/pages/admin/modals/AddRoomModal.jsx
//
// Endpoint: POST /api/rooms
// Required fields: roomNumber, roomType, floor, capacity, pricePerNight
// Valid roomTypes (lowercase): 'single' | 'double' | 'deluxe' | 'suite' | 'family'
//
// Added fields (schema-aligned):
//   assignedHousekeeper — ObjectId ref to a User with role=housekeeper (admin assigns)
//   isActive            — boolean, defaults true
//
// NOTE: maintenanceReason is intentionally excluded — it is set by housekeepers only
//       via PUT /api/rooms/:id, not during room creation.

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { X, BedDouble } from 'lucide-react';
import './Modal.css';

const API = process.env.REACT_APP_API_URL;

const getAuthHeaders = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
});

// Must match validRoomTypes in roomController.js
const ROOM_TYPES = ['single', 'double', 'deluxe', 'suite', 'family'];

// Must match amenities enum in roomSchema (values are sent as-is to the API)
const AMENITY_OPTIONS = ['wifi', 'pool', 'spa', 'restaurant', 'bar', 'gym', 'tv', 'ac'];

// Human-readable labels for each amenity key
const AMENITY_LABELS = {
  wifi:       'WiFi',
  pool:       'Pool',
  spa:        'Spa',
  restaurant: 'Restaurant',
  bar:        'Bar',
  gym:        'Gym',
  tv:         'TV',
  ac:         'AC',
};

const AddRoomModal = ({ onClose }) => {
  const [form, setForm] = useState({
    roomNumber:          '',
    roomType:            'single',   // lowercase — matches controller validation
    floor:               '',
    capacity:            '',
    pricePerNight:       '',
    description:         '',
    amenities:           [],
    status:              'available',
    images:              [],
    assignedHousekeeper: '',         // ObjectId string or '' (none)
    isActive:            true,       // boolean — schema default is true
  });

  const [imageInput, setImageInput]     = useState('');
  const [housekeepers, setHousekeepers] = useState([]);  // [{_id, fullName, email}]
  const [hkLoading, setHkLoading]       = useState(false);
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState('');
  const [success, setSuccess]           = useState('');

  // Fetch users with role=housekeeper for the assignedHousekeeper dropdown.
  // Only active housekeepers are shown (isActive: true).
  useEffect(() => {
    const fetchHousekeepers = async () => {
      setHkLoading(true);
      try {
        const res = await axios.get(`${API}/users`, getAuthHeaders());
        // Support both { data: [...] } and [...] response shapes
        const all = Array.isArray(res.data) ? res.data : (res.data?.data ?? []);
        // Filter client-side: only users whose role is exactly 'housekeeper'
        // and who are active — mirrors the User schema role enum
        const hks = all.filter(u => u.role === 'housekeeper' && u.isActive !== false);
        setHousekeepers(hks);
      } catch {
        // Non-fatal — dropdown will simply show "None" as the only option
        setHousekeepers([]);
      } finally {
        setHkLoading(false);
      }
    };
    fetchHousekeepers();
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm(p => ({
      ...p,
      [name]: type === 'checkbox' ? checked : value,
    }));
    setError('');
  };

  const toggleAmenity = (a) =>
    setForm(p => ({
      ...p,
      amenities: p.amenities.includes(a)
        ? p.amenities.filter(x => x !== a)
        : [...p.amenities, a],
    }));

  const addImage = () => {
    const url = imageInput.trim();
    if (!url) return;
    if (form.images.includes(url)) { setError('Image URL already added.'); return; }
    setForm(p => ({ ...p, images: [...p.images, url] }));
    setImageInput('');
    setError('');
  };

  const removeImage = (url) =>
    setForm(p => ({ ...p, images: p.images.filter(i => i !== url) }));

  const validate = () => {
    if (!form.roomNumber.trim())                 return 'Room number is required.';
    if (!form.floor || isNaN(+form.floor))       return 'Floor is required.';
    if (!form.capacity || isNaN(+form.capacity)) return 'Capacity is required.';
    if (!form.pricePerNight || isNaN(+form.pricePerNight)) return 'Price per night is required.';
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const err = validate();
    if (err) { setError(err); return; }

    setLoading(true);
    setError('');
    try {
      // POST /api/rooms — roomType must be lowercase
      const payload = {
        roomNumber:    form.roomNumber.trim(),
        roomType:      form.roomType,             // already lowercase from select
        floor:         Number(form.floor),
        capacity:      Number(form.capacity),
        pricePerNight: Number(form.pricePerNight),
        description:   form.description.trim(),
        amenities:     form.amenities,            // already lowercase enum values
        status:        form.status,
        images:        form.images,
        isActive:      form.isActive,
        // Only include assignedHousekeeper when a value is selected
        ...(form.assignedHousekeeper
          ? { assignedHousekeeper: form.assignedHousekeeper }
          : {}),
      };

      await axios.post(`${API}/rooms`, payload, getAuthHeaders());
      setSuccess(`✓ Room #${form.roomNumber} created successfully!`);
      setTimeout(() => onClose(true), 1400);
    } catch (err) {
      setError(
        err.response?.data?.message ||
        err.response?.data?.error   ||
        'Failed to create room. Room number may already exist.'
      );
    } finally {
      setLoading(false);
    }
  };

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

          {/* ── Row 1: Room Number + Floor ───────────────────────────────────── */}
          <div className="form-row">
            <div className="form-group">
              <label>Room Number <span className="req">*</span></label>
              <input
                name="roomNumber"
                value={form.roomNumber}
                onChange={handleChange}
                placeholder="e.g. 101"
                autoFocus
              />
            </div>
            <div className="form-group">
              <label>Floor <span className="req">*</span></label>
              <input
                name="floor"
                type="number"
                min="0"
                max="50"
                value={form.floor}
                onChange={handleChange}
                placeholder="e.g. 1"
              />
            </div>
          </div>

          {/* ── Row 2: Room Type + Capacity ──────────────────────────────────── */}
          <div className="form-row">
            <div className="form-group">
              <label>Room Type <span className="req">*</span></label>
              <select name="roomType" value={form.roomType} onChange={handleChange}>
                {ROOM_TYPES.map(t => (
                  <option key={t} value={t}>
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </option>
                ))}
              </select>
              <p className="field-hint">Accepted: single · double · deluxe · suite · family</p>
            </div>
            <div className="form-group">
              <label>Capacity (guests) <span className="req">*</span></label>
              <input
                name="capacity"
                type="number"
                min="1"
                max="10"
                value={form.capacity}
                onChange={handleChange}
                placeholder="e.g. 2"
              />
            </div>
          </div>

          {/* ── Row 3: Price + Status ────────────────────────────────────────── */}
          <div className="form-row">
            <div className="form-group">
              <label>Price Per Night (USD) <span className="req">*</span></label>
              <input
                name="pricePerNight"
                type="number"
                min="0"
                step="0.01"
                value={form.pricePerNight}
                onChange={handleChange}
                placeholder="e.g. 120.00"
              />
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

          {/* ── Row 4: Assigned Housekeeper + isActive ───────────────────────── */}
          <div className="form-row">
            <div className="form-group">
              <label>Assigned Housekeeper</label>
              <select
                name="assignedHousekeeper"
                value={form.assignedHousekeeper}
                onChange={handleChange}
                disabled={hkLoading}
              >
                <option value="">— None —</option>
                {housekeepers.map(hk => (
                  <option key={hk._id} value={hk._id}>
                    {hk.fullName} {hk.email ? `(${hk.email})` : ''}
                  </option>
                ))}
              </select>
              {hkLoading && <p className="field-hint">Loading housekeepers…</p>}
              {!hkLoading && housekeepers.length === 0 && (
                <p className="field-hint">No housekeepers found.</p>
              )}
            </div>

            <div className="form-group" style={{ justifyContent: 'flex-end' }}>
              <label>Room Active</label>
              {/* Toggle rendered as a labelled checkbox for clarity */}
              <label
                style={{
                  display:    'flex',
                  alignItems: 'center',
                  gap:        '8px',
                  cursor:     'pointer',
                  fontWeight: 'normal',
                  marginTop:  '6px',
                }}
              >
                <input
                  type="checkbox"
                  name="isActive"
                  checked={form.isActive}
                  onChange={handleChange}
                  style={{ width: '16px', height: '16px', accentColor: '#8b5cf6', cursor: 'pointer' }}
                />
                {form.isActive ? 'Active (visible to guests)' : 'Inactive (hidden from guests)'}
              </label>
              <p className="field-hint">Defaults to active. Inactive rooms won't appear in booking.</p>
            </div>
          </div>

          {/* ── Description ──────────────────────────────────────────────────── */}
          <div className="form-group">
            <label>Description</label>
            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              rows={2}
              placeholder="Brief description of the room…"
            />
          </div>

          {/* ── Amenities ────────────────────────────────────────────────────── */}
          <div className="form-group">
            <label>Amenities</label>
            <div className="chip-grid">
              {AMENITY_OPTIONS.map(a => (
                <button
                  key={a}
                  type="button"
                  className={`chip ${form.amenities.includes(a) ? 'chip--active' : ''}`}
                  onClick={() => toggleAmenity(a)}
                >
                  {AMENITY_LABELS[a]}
                </button>
              ))}
            </div>
            <p className="field-hint">Accepted: wifi · pool · spa · restaurant · bar · gym · tv · ac</p>
          </div>

          {/* ── Images ───────────────────────────────────────────────────────── */}
          <div className="form-group">
            <label>Images (URLs)</label>
            <div className="input-with-btn">
              <input
                value={imageInput}
                onChange={e => setImageInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addImage())}
                placeholder="https://example.com/room.jpg"
              />
              <button type="button" className="btn-add" onClick={addImage}>
                Add
              </button>
            </div>
            {form.images.length > 0 && (
              <ul className="image-list">
                {form.images.map(url => (
                  <li key={url} className="image-list__item">
                    <img src={url} alt="" className="image-list__thumb" onError={e => e.target.style.display='none'} />
                    <span className="image-list__url">{url}</span>
                    <button type="button" className="image-list__remove" onClick={() => removeImage(url)}>
                      <X size={14} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {error   && <p className="form-error">{error}</p>}
          {success && <p className="form-success">{success}</p>}

          <div className="modal-footer">
            <button type="button" className="btn-cancel" onClick={() => onClose(false)}>Cancel</button>
            <button
              type="submit"
              className="btn-submit"
              style={{ '--btn-color': '#8b5cf6' }}
              disabled={loading}
            >
              {loading ? 'Creating…' : 'Create Room'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};

export default AddRoomModal;