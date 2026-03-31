// frontend/src/pages/admin/RoomDetailPage.jsx
//
// Endpoints:
//   GET   /api/rooms/:id   → { success, data: Room }
//   PUT   /api/rooms/:id   → { success, data: Room }

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  ArrowLeft, Edit3, Save, X, BedDouble,
  DollarSign, Users, Layers, Tag, FileText,
  Wifi, Tv, Wind, Wine, Sunrise, Droplets,
  Eye, Shield, Zap, CheckCircle, Wrench, Sparkles,
  AlertCircle, ImageIcon, Trash2,
} from 'lucide-react';
import './RoomDetailPage.css';

const API = process.env.REACT_APP_API_URL;
const getAuthHeaders = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
});

const ROOM_TYPES   = ['single', 'double', 'deluxe', 'suite', 'family'];
const AMENITY_OPTIONS = ['wifi', 'pool', 'spa', 'restaurant', 'bar', 'gym', 'tv', 'ac'];
const AMENITY_LABELS  = { wifi: 'WiFi', pool: 'Pool', spa: 'Spa', restaurant: 'Restaurant', bar: 'Bar', gym: 'Gym', tv: 'TV', ac: 'AC' };
const AMENITY_ICONS   = { wifi: Wifi, pool: Droplets, spa: Sparkles, restaurant: Zap, bar: Wine, gym: Shield, tv: Tv, ac: Wind };

const TYPE_COLORS = {
  single: '#6366f1', double: '#0ea5e9',
  deluxe: '#f59e0b', suite: '#ec4899', family: '#10b981',
};
const STATUS_META = {
  available:   { label: 'Available',   cls: 'rdp-pill--green',  Icon: CheckCircle },
  occupied:    { label: 'Occupied',    cls: 'rdp-pill--blue',   Icon: BedDouble   },
  maintenance: { label: 'Maintenance', cls: 'rdp-pill--amber',  Icon: Wrench      },
  cleaning:    { label: 'Cleaning',    cls: 'rdp-pill--purple', Icon: Sparkles    },
};

const RoomDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [room, setRoom]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState('');
  const [success, setSuccess] = useState('');
  const [imgInput, setImgInput] = useState('');

  const [form, setForm] = useState({
    roomNumber: '', roomType: 'single', floor: '',
    capacity: '', pricePerNight: '', description: '',
    amenities: [], status: 'available', images: [],
  });

  const fetchRoom = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/rooms/${id}`, getAuthHeaders());
      const r   = res.data?.data ?? res.data;
      setRoom(r);
      setForm({
        roomNumber:    r.roomNumber    || '',
        roomType:      r.roomType      || 'single',
        floor:         r.floor         ?? '',
        capacity:      r.capacity      ?? '',
        pricePerNight: r.pricePerNight ?? '',
        description:   r.description   || '',
        amenities:     r.amenities     || [],
        status:        r.status        || 'available',
        images:        r.images        || [],
      });
    } catch {
      setError('Failed to load room details.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchRoom(); }, [fetchRoom]);

  const handleChange = (e) => {
    setForm(p => ({ ...p, [e.target.name]: e.target.value }));
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
    const url = imgInput.trim();
    if (!url || form.images.includes(url)) return;
    setForm(p => ({ ...p, images: [...p.images, url] }));
    setImgInput('');
  };
  const removeImage = (url) =>
    setForm(p => ({ ...p, images: p.images.filter(i => i !== url) }));

  const handleSave = async () => {
    if (!form.roomNumber.trim()) { setError('Room number is required.'); return; }
    if (isNaN(+form.floor))      { setError('Floor must be a number.');  return; }
    if (isNaN(+form.capacity))   { setError('Capacity must be a number.'); return; }
    if (isNaN(+form.pricePerNight)) { setError('Price must be a number.'); return; }

    setSaving(true);
    setError('');
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
        images:        form.images,
      };
      const res = await axios.put(`${API}/rooms/${id}`, payload, getAuthHeaders());
      const updated = res.data?.data ?? res.data;
      setRoom(updated);
      setEditing(false);
      setSuccess('Room updated successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || err.response?.data?.error || 'Failed to update room.');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    // Reset form to current room data
    setForm({
      roomNumber:    room.roomNumber    || '',
      roomType:      room.roomType      || 'single',
      floor:         room.floor         ?? '',
      capacity:      room.capacity      ?? '',
      pricePerNight: room.pricePerNight ?? '',
      description:   room.description   || '',
      amenities:     room.amenities     || [],
      status:        room.status        || 'available',
      images:        room.images        || [],
    });
    setEditing(false);
    setError('');
    setImgInput('');
  };

  if (loading) {
    return (
      <div className="rdp-loading">
        <div className="rdp-spinner" />
        <p>Loading room…</p>
      </div>
    );
  }
  if (!room && !loading) {
    return (
      <div className="rdp-not-found">
        <AlertCircle size={40} />
        <p>Room not found.</p>
        <button onClick={() => navigate('/admin/rooms')}>← Back to Rooms</button>
      </div>
    );
  }

  const sm = STATUS_META[room.status] || STATUS_META.available;

  return (
    <div className="rdp-root">

      {/* ── Top Bar ── */}
      <div className="rdp-topbar">
        <button className="rdp-back-btn" onClick={() => navigate('/admin/rooms')}>
          <ArrowLeft size={16} /> Rooms
        </button>
        <div className="rdp-topbar-actions">
          {editing ? (
            <>
              <button className="rdp-btn-cancel" onClick={handleCancel}>
                <X size={15} /> Cancel
              </button>
              <button className="rdp-btn-save" onClick={handleSave} disabled={saving}>
                <Save size={15} /> {saving ? 'Saving…' : 'Save Changes'}
              </button>
            </>
          ) : (
            <button className="rdp-btn-edit" onClick={() => setEditing(true)}>
              <Edit3 size={15} /> Edit Room
            </button>
          )}
        </div>
      </div>

      {/* Alerts */}
      {error   && <div className="rdp-alert rdp-alert--error"><AlertCircle size={15}/>{error}</div>}
      {success && <div className="rdp-alert rdp-alert--success"><CheckCircle size={15}/>{success}</div>}

      {/* ── Hero Banner ── */}
      <div
        className="rdp-hero"
        style={{ '--hero-color': TYPE_COLORS[room.roomType] || '#6366f1' }}
      >
        <div className="rdp-hero-left">
          <div className="rdp-hero-icon">
            <BedDouble size={28} />
          </div>
          <div>
            <p className="rdp-hero-label">Room</p>
            <h1 className="rdp-hero-number">#{room.roomNumber}</h1>
          </div>
        </div>
        <div className="rdp-hero-right">
          <span
            className="rdp-type-badge"
            style={{ '--type-color': TYPE_COLORS[room.roomType] || '#6366f1' }}
          >
            {room.roomType}
          </span>
          <span className={`rdp-status-pill ${sm.cls}`}>
            <sm.Icon size={12} /> {sm.label}
          </span>
        </div>
      </div>

      {/* ── Content ── */}
      <div className="rdp-body">

        {/* ── Left: Details / Edit Form ── */}
        <div className="rdp-main-col">

          {/* Core Fields */}
          <section className="rdp-card">
            <h2 className="rdp-card-title"><Tag size={15} /> Room Details</h2>

            <div className="rdp-fields-grid">
              {/* Room Number */}
              <div className="rdp-field">
                <label>Room Number</label>
                {editing
                  ? <input name="roomNumber" value={form.roomNumber} onChange={handleChange} />
                  : <span className="rdp-field-val rdp-field-val--bold">{room.roomNumber}</span>
                }
              </div>

              {/* Floor */}
              <div className="rdp-field">
                <label><Layers size={13}/> Floor</label>
                {editing
                  ? <input name="floor" type="number" min="0" value={form.floor} onChange={handleChange} />
                  : <span className="rdp-field-val">Floor {room.floor}</span>
                }
              </div>

              {/* Room Type */}
              <div className="rdp-field">
                <label><Tag size={13}/> Room Type</label>
                {editing
                  ? (
                    <select name="roomType" value={form.roomType} onChange={handleChange}>
                      {ROOM_TYPES.map(t => (
                        <option key={t} value={t}>{t.charAt(0).toUpperCase()+t.slice(1)}</option>
                      ))}
                    </select>
                  )
                  : <span className="rdp-field-val capitalize">{room.roomType}</span>
                }
              </div>

              {/* Capacity */}
              <div className="rdp-field">
                <label><Users size={13}/> Capacity</label>
                {editing
                  ? <input name="capacity" type="number" min="1" max="10" value={form.capacity} onChange={handleChange} />
                  : <span className="rdp-field-val">{room.capacity} guest{room.capacity !== 1 ? 's' : ''}</span>
                }
              </div>

              {/* Price */}
              <div className="rdp-field">
                <label><DollarSign size={13}/> Price / Night</label>
                {editing
                  ? <input name="pricePerNight" type="number" min="0" step="0.01" value={form.pricePerNight} onChange={handleChange} />
                  : <span className="rdp-field-val rdp-field-val--price">${room.pricePerNight}</span>
                }
              </div>

              {/* Status */}
              <div className="rdp-field">
                <label>Status</label>
                {editing
                  ? (
                    <select name="status" value={form.status} onChange={handleChange}>
                      <option value="available">Available</option>
                      <option value="occupied">Occupied</option>
                      <option value="maintenance">Maintenance</option>
                      <option value="cleaning">Cleaning</option>
                    </select>
                  )
                  : (
                    <span className={`rdp-status-pill ${sm.cls}`}>
                      <sm.Icon size={11}/> {sm.label}
                    </span>
                  )
                }
              </div>
            </div>

            {/* Description */}
            <div className="rdp-field rdp-field--full">
              <label><FileText size={13}/> Description</label>
              {editing
                ? (
                  <textarea
                    name="description"
                    value={form.description}
                    onChange={handleChange}
                    rows={3}
                    placeholder="Brief description of the room…"
                  />
                )
                : <span className="rdp-field-val rdp-field-val--desc">
                    {room.description || <em className="rdp-empty-val">No description</em>}
                  </span>
              }
            </div>
          </section>

          {/* Amenities */}
          <section className="rdp-card">
            <h2 className="rdp-card-title"><Sparkles size={15}/> Amenities</h2>
            {editing ? (
              <div className="rdp-amenity-grid">
                {AMENITY_OPTIONS.map(a => {
                  const AIcon = AMENITY_ICONS[a] || Zap;
                  const active = form.amenities.includes(a);
                  return (
                    <button
                      key={a}
                      type="button"
                      className={`rdp-amenity-chip ${active ? 'rdp-amenity-chip--active' : ''}`}
                      onClick={() => toggleAmenity(a)}
                    >
                      <AIcon size={14}/> {AMENITY_LABELS[a]}
                    </button>
                  );
                })}
              </div>
            ) : (
              room.amenities?.length > 0 ? (
                <div className="rdp-amenity-grid">
                  {room.amenities.map(a => {
                    const AIcon = AMENITY_ICONS[a] || Zap;
                    return (
                      <div key={a} className="rdp-amenity-chip rdp-amenity-chip--active rdp-amenity-chip--view">
                        <AIcon size={14}/> {AMENITY_LABELS[a] || a}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="rdp-empty-val">No amenities listed.</p>
              )
            )}
          </section>
        </div>

        {/* ── Right: Images + Meta ── */}
        <div className="rdp-side-col">

          {/* Images */}
          <section className="rdp-card">
            <h2 className="rdp-card-title"><ImageIcon size={15}/> Images</h2>

            {editing && (
              <div className="rdp-img-input-row">
                <input
                  value={imgInput}
                  onChange={e => setImgInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addImage())}
                  placeholder="https://…"
                  className="rdp-img-input"
                />
                <button type="button" className="rdp-img-add-btn" onClick={addImage}>Add</button>
              </div>
            )}

            {(editing ? form.images : room.images || []).length > 0 ? (
              <div className="rdp-img-gallery">
                {(editing ? form.images : room.images).map((url, i) => (
                  <div key={i} className="rdp-img-item">
                    <img
                      src={url}
                      alt={`Room ${room.roomNumber} #${i+1}`}
                      onError={e => { e.target.style.display='none'; }}
                    />
                    {editing && (
                      <button
                        className="rdp-img-remove"
                        onClick={() => removeImage(url)}
                        title="Remove"
                      >
                        <Trash2 size={12}/>
                      </button>
                    )}
                    <a href={url} target="_blank" rel="noreferrer" className="rdp-img-link">
                      <Eye size={12}/>
                    </a>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rdp-img-empty">
                <ImageIcon size={28}/>
                <p>{editing ? 'Add image URLs above' : 'No images uploaded'}</p>
              </div>
            )}
          </section>

          {/* Meta Info */}
          <section className="rdp-card rdp-meta-card">
            <h2 className="rdp-card-title"><FileText size={15}/> Meta</h2>
            <div className="rdp-meta-list">
              <div className="rdp-meta-item">
                <span className="rdp-meta-key">Room ID</span>
                <span className="rdp-meta-val rdp-meta-id">{room._id}</span>
              </div>
              <div className="rdp-meta-item">
                <span className="rdp-meta-key">Active</span>
                <span className={`rdp-meta-val ${room.isActive ? 'rdp-meta-active' : 'rdp-meta-inactive'}`}>
                  {room.isActive ? 'Yes' : 'No'}
                </span>
              </div>
              {room.createdAt && (
                <div className="rdp-meta-item">
                  <span className="rdp-meta-key">Created</span>
                  <span className="rdp-meta-val">
                    {new Date(room.createdAt).toLocaleDateString('en-US', {
                      year: 'numeric', month: 'short', day: 'numeric',
                    })}
                  </span>
                </div>
              )}
              {room.updatedAt && (
                <div className="rdp-meta-item">
                  <span className="rdp-meta-key">Last Updated</span>
                  <span className="rdp-meta-val">
                    {new Date(room.updatedAt).toLocaleDateString('en-US', {
                      year: 'numeric', month: 'short', day: 'numeric',
                    })}
                  </span>
                </div>
              )}
            </div>
          </section>

        </div>
      </div>
    </div>
  );
};

export default RoomDetailPage;