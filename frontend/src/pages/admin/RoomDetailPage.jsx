// frontend/src/pages/admin/RoomDetailPage.jsx

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  ArrowLeft, Edit3, Save, X, BedDouble,
  DollarSign, Users, Layers, Tag, FileText,
  Sparkles, CheckCircle, Wrench, AlertCircle,
  ImageIcon, Trash2, UserCheck, Lock,
  Upload, Loader, ChevronLeft, ChevronRight,
} from 'lucide-react';
import './RoomDetailPage.css';
import UploadMedia from '../../utils/mediaUpload';

const API = process.env.REACT_APP_API_URL;
const getAuthHeaders = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
});

const ROOM_TYPES = ['single', 'double', 'deluxe', 'suite', 'family'];

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

// Never pass a raw object to JSX — always call str() first
const str = (v) => (v == null ? '' : String(v));

// ── Image Gallery ────────────────────────────────────────────────────────────
const ImageGallery = ({ images }) => {
  const [activeIdx, setActiveIdx] = useState(0);
  const [hovered, setHovered]     = useState(false);
  const intervalRef               = useRef(null);

  useEffect(() => { setActiveIdx(0); }, [images]);

  useEffect(() => {
    if (!images || images.length <= 1) return;
    if (hovered) {
      intervalRef.current = setInterval(() => setActiveIdx(p => (p + 1) % images.length), 900);
    } else {
      clearInterval(intervalRef.current);
      setActiveIdx(0);
    }
    return () => clearInterval(intervalRef.current);
  }, [hovered, images]);

  if (!images || images.length === 0) {
    return (
      <div className="rdp-img-empty">
        <ImageIcon size={28} />
        <p>No images uploaded</p>
      </div>
    );
  }

  return (
    <div className="rdp-gallery-viewer" onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}>
      <div className="rdp-gallery-main">
        {images.map((url, i) => (
          <img key={i} src={str(url)} alt={`Room image ${i + 1}`}
            className={`rdp-gallery-slide${i === activeIdx ? ' rdp-gallery-slide--active' : ''}`}
            onError={e => { e.target.style.display = 'none'; }} />
        ))}
        {images.length > 1 && !hovered && (
          <div className="rdp-gallery-hint"><ImageIcon size={12} />{images.length} photos — hover to browse</div>
        )}
        {images.length > 1 && hovered && (
          <>
            <button className="rdp-gallery-arrow rdp-gallery-arrow--prev"
              onClick={e => { e.stopPropagation(); setActiveIdx(p => (p - 1 + images.length) % images.length); }}>
              <ChevronLeft size={16} />
            </button>
            <button className="rdp-gallery-arrow rdp-gallery-arrow--next"
              onClick={e => { e.stopPropagation(); setActiveIdx(p => (p + 1) % images.length); }}>
              <ChevronRight size={16} />
            </button>
          </>
        )}
        {images.length > 1 && <div className="rdp-gallery-counter">{activeIdx + 1} / {images.length}</div>}
      </div>
      {images.length > 1 && (
        <div className="rdp-gallery-dots">
          {images.map((_, i) => (
            <button key={i} className={`rdp-gallery-dot${i === activeIdx ? ' rdp-gallery-dot--active' : ''}`} onClick={() => setActiveIdx(i)} />
          ))}
        </div>
      )}
      {images.length > 1 && (
        <div className="rdp-gallery-thumbs">
          {images.map((url, i) => (
            <button key={i} className={`rdp-gallery-thumb${i === activeIdx ? ' rdp-gallery-thumb--active' : ''}`} onClick={() => setActiveIdx(i)}>
              <img src={str(url)} alt={`Thumb ${i + 1}`} onError={e => { e.target.style.display = 'none'; }} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// ── Main ─────────────────────────────────────────────────────────────────────
const RoomDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [room, setRoom]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState('');
  const [success, setSuccess] = useState('');

  const [allAmenities, setAllAmenities]           = useState([]);
  const [amenitiesLoading, setAmenitiesLoading]   = useState(false);

  const [editImages, setEditImages] = useState([]);
  const fileInputRef = useRef(null);

  const [form, setForm] = useState({
    roomNumber: '', roomType: 'single', floor: '',
    capacity: '', pricePerNight: '', description: '',
    amenities: [],   // _id strings
    status: 'available',
  });

  // ── Fetch amenities ─────────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      setAmenitiesLoading(true);
      try {
        const res  = await axios.get(`${API}/amenities?active=true`, getAuthHeaders());
        const list = Array.isArray(res.data?.data) ? res.data.data : [];
        setAllAmenities(list);
      } catch {
        setAllAmenities([]);
      } finally {
        setAmenitiesLoading(false);
      }
    })();
  }, []);

  // ── Fetch room ──────────────────────────────────────────────────────────────
  const fetchRoom = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/rooms/${id}`, getAuthHeaders());
      const r   = res.data?.data ?? res.data;
      setRoom(r);

      // amenities may be populated objects or plain id strings
      const amenityIds = (r.amenities || []).map(a =>
        str(typeof a === 'object' && a !== null ? a._id : a)
      );

      setForm({
        roomNumber:    str(r.roomNumber),
        roomType:      str(r.roomType) || 'single',
        floor:         r.floor ?? '',
        capacity:      r.capacity ?? '',
        pricePerNight: r.pricePerNight ?? '',
        description:   str(r.description),
        amenities:     amenityIds,
        status:        str(r.status) || 'available',
      });
      setEditImages(
        (r.images || []).map((url, i) => ({
          id: `existing-${i}-${url}`, previewUrl: str(url), supabaseUrl: str(url),
          uploading: false, error: null, existing: true,
        }))
      );
    } catch {
      setError('Failed to load room details.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchRoom(); }, [fetchRoom]);

  useEffect(() => {
    return () => {
      editImages.forEach(img => { if (!img.existing && img.previewUrl) URL.revokeObjectURL(img.previewUrl); });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleChange = (e) => {
    setForm(p => ({ ...p, [e.target.name]: e.target.value }));
    setError('');
  };

  const toggleAmenity = (id) =>
    setForm(p => ({
      ...p,
      amenities: p.amenities.includes(id) ? p.amenities.filter(x => x !== id) : [...p.amenities, id],
    }));

  // ── Image upload ────────────────────────────────────────────────────────────
  const handleFileSelect = async (e) => {
    const selected = Array.from(e.target.files);
    if (!selected.length) return;
    if (fileInputRef.current) fileInputRef.current.value = '';
    const newEntries = selected.map(file => ({
      id: `new-${Date.now()}-${Math.random()}`, file,
      previewUrl: URL.createObjectURL(file), supabaseUrl: null,
      uploading: true, error: null, existing: false,
    }));
    setEditImages(prev => [...prev, ...newEntries]);
    await Promise.all(newEntries.map(async entry => {
      try {
        const url = await UploadMedia(entry.file);
        setEditImages(prev => prev.map(img => img.id === entry.id ? { ...img, supabaseUrl: url, uploading: false } : img));
      } catch {
        setEditImages(prev => prev.map(img => img.id === entry.id ? { ...img, uploading: false, error: 'Upload failed' } : img));
      }
    }));
  };

  const removeEditImage = (entryId) => {
    setEditImages(prev => {
      const entry = prev.find(img => img.id === entryId);
      if (entry && !entry.existing && entry.previewUrl) URL.revokeObjectURL(entry.previewUrl);
      return prev.filter(img => img.id !== entryId);
    });
  };

  // ── Save ────────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!form.roomNumber.trim())           { setError('Room number is required.'); return; }
    if (isNaN(+form.floor))                { setError('Floor must be a number.'); return; }
    if (isNaN(+form.capacity))             { setError('Capacity must be a number.'); return; }
    if (isNaN(+form.pricePerNight))        { setError('Price must be a number.'); return; }
    if (editImages.some(i => i.uploading)) { setError('Please wait — images are still uploading.'); return; }

    setSaving(true); setError('');
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
        images:        editImages.filter(img => img.supabaseUrl && !img.error).map(img => img.supabaseUrl),
      };
      const res     = await axios.put(`${API}/rooms/${id}`, payload, getAuthHeaders());
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
    if (!room) return;
    const amenityIds = (room.amenities || []).map(a =>
      str(typeof a === 'object' && a !== null ? a._id : a)
    );
    setForm({
      roomNumber:    str(room.roomNumber),
      roomType:      str(room.roomType) || 'single',
      floor:         room.floor ?? '',
      capacity:      room.capacity ?? '',
      pricePerNight: room.pricePerNight ?? '',
      description:   str(room.description),
      amenities:     amenityIds,
      status:        str(room.status) || 'available',
    });
    setEditImages(
      (room.images || []).map((url, i) => ({
        id: `existing-${i}-${url}`, previewUrl: str(url), supabaseUrl: str(url),
        uploading: false, error: null, existing: true,
      }))
    );
    setEditing(false); setError('');
  };

  if (loading) return <div className="rdp-loading"><div className="rdp-spinner" /><p>Loading room…</p></div>;
  if (!room)   return <div className="rdp-not-found"><AlertCircle size={40} /><p>Room not found.</p><button onClick={() => navigate('/admin/rooms')}>← Back to Rooms</button></div>;

  const sm = STATUS_META[room.status] || STATUS_META.available;
  const showMaintenanceReason = room.status === 'maintenance' || form.status === 'maintenance';
  const uploadingCount        = editImages.filter(i => i.uploading).length;

  // populated amenity objects in view mode (filter out anything non-object)
  const roomAmenityObjects = (room.amenities || []).filter(
    a => a !== null && typeof a === 'object' && a._id
  );

  return (
    <div className="rdp-root">

      {/* Top Bar */}
      <div className="rdp-topbar">
        <button className="rdp-back-btn" onClick={() => navigate('/admin/rooms')}>
          <ArrowLeft size={16} /> Rooms
        </button>
        <div className="rdp-topbar-actions">
          {editing ? (
            <>
              <button className="rdp-btn-cancel" onClick={handleCancel}><X size={15} /> Cancel</button>
              <button className="rdp-btn-save" onClick={handleSave} disabled={saving || uploadingCount > 0}>
                <Save size={15} />{saving ? 'Saving…' : uploadingCount > 0 ? 'Uploading…' : 'Save Changes'}
              </button>
            </>
          ) : (
            <button className="rdp-btn-edit" onClick={() => setEditing(true)}><Edit3 size={15} /> Edit Room</button>
          )}
        </div>
      </div>

      {error   && <div className="rdp-alert rdp-alert--error"><AlertCircle size={15} />{error}</div>}
      {success && <div className="rdp-alert rdp-alert--success"><CheckCircle size={15} />{success}</div>}

      {/* Hero */}
      <div className="rdp-hero" style={{ '--hero-color': TYPE_COLORS[room.roomType] || '#6366f1' }}>
        <div className="rdp-hero-left">
          <div className="rdp-hero-icon"><BedDouble size={28} /></div>
          <div>
            <p className="rdp-hero-label">Room</p>
            <h1 className="rdp-hero-number">#{str(room.roomNumber)}</h1>
          </div>
        </div>
        <div className="rdp-hero-right">
          <span className="rdp-type-badge" style={{ '--type-color': TYPE_COLORS[room.roomType] || '#6366f1' }}>
            {str(room.roomType)}
          </span>
          <span className={`rdp-status-pill ${sm.cls}`}><sm.Icon size={12} /> {sm.label}</span>
          <span className={`rdp-status-pill ${room.isActive ? 'rdp-pill--green' : 'rdp-pill--red'}`}>
            {room.isActive ? <CheckCircle size={12} /> : <AlertCircle size={12} />}
            {room.isActive ? 'Active' : 'Inactive'}
          </span>
        </div>
      </div>

      {/* Body */}
      <div className="rdp-body">

        {/* Left col */}
        <div className="rdp-main-col">

          <section className="rdp-card">
            <h2 className="rdp-card-title"><Tag size={15} /> Room Details</h2>
            <div className="rdp-fields-grid">
              <div className="rdp-field">
                <label>Room Number</label>
                {editing
                  ? <input name="roomNumber" value={form.roomNumber} onChange={handleChange} />
                  : <span className="rdp-field-val rdp-field-val--bold">{str(room.roomNumber)}</span>}
              </div>
              <div className="rdp-field">
                <label><Layers size={13} /> Floor</label>
                {editing
                  ? <input name="floor" type="number" min="0" value={form.floor} onChange={handleChange} />
                  : <span className="rdp-field-val">{'Floor ' + str(room.floor)}</span>}
              </div>
              <div className="rdp-field">
                <label><Tag size={13} /> Room Type</label>
                {editing
                  ? <select name="roomType" value={form.roomType} onChange={handleChange}>
                      {ROOM_TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                    </select>
                  : <span className="rdp-field-val capitalize">{str(room.roomType)}</span>}
              </div>
              <div className="rdp-field">
                <label><Users size={13} /> Capacity</label>
                {editing
                  ? <input name="capacity" type="number" min="1" max="10" value={form.capacity} onChange={handleChange} />
                  : <span className="rdp-field-val">{str(room.capacity) + ' guest' + (room.capacity !== 1 ? 's' : '')}</span>}
              </div>
              <div className="rdp-field">
                <label><DollarSign size={13} /> Price / Night</label>
                {editing
                  ? <input name="pricePerNight" type="number" min="0" step="0.01" value={form.pricePerNight} onChange={handleChange} />
                  : <span className="rdp-field-val rdp-field-val--price">{'$' + str(room.pricePerNight)}</span>}
              </div>
              <div className="rdp-field">
                <label>Status</label>
                {editing
                  ? <select name="status" value={form.status} onChange={handleChange}>
                      <option value="available">Available</option>
                      <option value="occupied">Occupied</option>
                      <option value="maintenance">Maintenance</option>
                      <option value="cleaning">Cleaning</option>
                    </select>
                  : <span className={`rdp-status-pill ${sm.cls}`}><sm.Icon size={11} /> {sm.label}</span>}
              </div>
            </div>

            <div className="rdp-field rdp-field--full">
              <label><FileText size={13} /> Description</label>
              {editing
                ? <textarea name="description" value={form.description} onChange={handleChange} rows={3} placeholder="Brief description…" />
                : <span className="rdp-field-val rdp-field-val--desc">
                    {room.description ? str(room.description) : <em className="rdp-empty-val">No description</em>}
                  </span>}
            </div>

            {showMaintenanceReason && (
              <div className="rdp-field rdp-field--full">
                <label>
                  <Wrench size={13} /> Maintenance Reason
                  <span className="rdp-readonly-badge"><Lock size={10} /> Read Only</span>
                </label>
                <div className="rdp-readonly-box">
                  {room.maintenanceReason
                    ? <span className="rdp-field-val rdp-field-val--desc">{str(room.maintenanceReason)}</span>
                    : <em className="rdp-empty-val">No reason provided by housekeeper</em>}
                </div>
              </div>
            )}
          </section>

          {/* Amenities */}
          <section className="rdp-card">
            <h2 className="rdp-card-title"><Sparkles size={15} /> Amenities</h2>

            {editing ? (
              amenitiesLoading ? (
                <p className="rdp-empty-val">Loading amenities…</p>
              ) : allAmenities.length === 0 ? (
                <p className="rdp-empty-val">No active amenities available.</p>
              ) : (
                <div className="rdp-amenity-grid">
                  {allAmenities.map(amenity => {
                    const amenityId    = str(amenity._id);
                    const amenityLabel = str(amenity.label || amenity.name);
                    const amenityIcon  = str(amenity.icon);
                    const amenityPrice = Number(amenity.price) || 0;
                    const isActive     = form.amenities.includes(amenityId);
                    return (
                      <button
                        key={amenityId}
                        type="button"
                        className={`rdp-amenity-chip${isActive ? ' rdp-amenity-chip--active' : ''}`}
                        onClick={() => toggleAmenity(amenityId)}
                        title={str(amenity.description) || amenityLabel}
                      >
                        {amenityIcon && <span style={{ marginRight: 5 }}>{amenityIcon}</span>}
                        {amenityLabel}
                        {amenityPrice > 0 && (
                          <span style={{ marginLeft: 4, opacity: 0.65, fontSize: '0.7rem' }}>
                            {'$' + amenityPrice}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )
            ) : (
              roomAmenityObjects.length > 0 ? (
                <div className="rdp-amenity-grid">
                  {roomAmenityObjects.map(amenity => {
                    const amenityId    = str(amenity._id);
                    const amenityLabel = str(amenity.label || amenity.name);
                    const amenityIcon  = str(amenity.icon);
                    const amenityPrice = Number(amenity.price) || 0;
                    return (
                      <div key={amenityId} className="rdp-amenity-chip rdp-amenity-chip--active rdp-amenity-chip--view">
                        {amenityIcon && <span style={{ marginRight: 5 }}>{amenityIcon}</span>}
                        {amenityLabel}
                        {amenityPrice > 0 && (
                          <span style={{ marginLeft: 5, opacity: 0.65, fontSize: '0.7rem' }}>
                            {'$' + amenityPrice}
                          </span>
                        )}
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

        {/* Right col */}
        <div className="rdp-side-col">

          {/* Images */}
          <section className="rdp-card">
            <h2 className="rdp-card-title"><ImageIcon size={15} /> Images</h2>
            {editing ? (
              <div>
                <div
                  className="rdp-upload-zone"
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={e => { e.preventDefault(); e.currentTarget.classList.add('rdp-upload-zone--drag'); }}
                  onDragLeave={e => e.currentTarget.classList.remove('rdp-upload-zone--drag')}
                  onDrop={e => {
                    e.preventDefault();
                    e.currentTarget.classList.remove('rdp-upload-zone--drag');
                    if (e.dataTransfer.files.length) handleFileSelect({ target: { files: e.dataTransfer.files } });
                  }}
                >
                  <Upload size={16} />
                  <span>Click or drag to add images</span>
                </div>
                <input ref={fileInputRef} type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={handleFileSelect} />
                {uploadingCount > 0 && <p className="rdp-upload-status" style={{ color: '#9a7a45' }}>{'⏳ ' + uploadingCount + ' uploading…'}</p>}
                {editImages.length > 0 && (
                  <div className="rdp-edit-img-grid">
                    {editImages.map(img => (
                      <div key={img.id} className="rdp-edit-img-item">
                        <img src={img.previewUrl} alt="preview" onError={e => { e.target.style.display = 'none'; }} />
                        {img.uploading && <div className="rdp-edit-img-overlay"><Loader size={14} className="img-upload-spinner" /></div>}
                        {img.error    && <div className="rdp-edit-img-overlay rdp-edit-img-overlay--err"><span style={{ fontSize: '9px' }}>Failed</span></div>}
                        {img.supabaseUrl && !img.uploading && <div className="rdp-edit-img-badge">✓</div>}
                        <button className="rdp-img-remove" onClick={() => removeEditImage(img.id)} title="Remove"><Trash2 size={11} /></button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <ImageGallery images={room.images || []} />
            )}
          </section>

          {/* Housekeeper */}
          <section className="rdp-card">
            <h2 className="rdp-card-title"><UserCheck size={15} /> Assigned Housekeeper</h2>
            {room.assignedHousekeeper && typeof room.assignedHousekeeper === 'object' ? (
              <div className="rdp-housekeeper-block">
                <div className="rdp-hk-avatar">
                  {str(room.assignedHousekeeper.fullName || 'H').charAt(0).toUpperCase()}
                </div>
                <div className="rdp-hk-info">
                  <span className="rdp-hk-name">{str(room.assignedHousekeeper.fullName)}</span>
                  {room.assignedHousekeeper.email     && <span className="rdp-hk-detail">{str(room.assignedHousekeeper.email)}</span>}
                  {room.assignedHousekeeper.phoneNumber && <span className="rdp-hk-detail">{str(room.assignedHousekeeper.phoneNumber)}</span>}
                </div>
              </div>
            ) : (
              <p className="rdp-empty-val">No housekeeper assigned.</p>
            )}
          </section>

          {/* Meta */}
          <section className="rdp-card rdp-meta-card">
            <h2 className="rdp-card-title"><FileText size={15} /> Meta</h2>
            <div className="rdp-meta-list">
              <div className="rdp-meta-item">
                <span className="rdp-meta-key">Room ID</span>
                <span className="rdp-meta-val rdp-meta-id">{str(room._id)}</span>
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
                    {new Date(room.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                  </span>
                </div>
              )}
              {room.updatedAt && (
                <div className="rdp-meta-item">
                  <span className="rdp-meta-key">Last Updated</span>
                  <span className="rdp-meta-val">
                    {new Date(room.updatedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
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