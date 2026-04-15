// frontend/src/pages/Booking.jsx
// Integrated guest login/register — auto-fills Step 2 personal info after sign-in.

import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Users, Calendar, Check, Loader, Moon, Sun,
  ChevronRight, Search, BedDouble, CreditCard, Gift, Star,
  Clock, LogIn, LogOut, UserCircle, UserPlus,
} from 'lucide-react';
import axios from 'axios';
import { useGuestAuth } from '../context/GuestAuthContext';
import GuestAuthModal from '../components/GuestAuthModal';
import './Booking.css';

const API = process.env.REACT_APP_API_URL;

const inferPricingModel = (amenity) => {
  if (amenity.pricingModel) return amenity.pricingModel;
  const n = (amenity.name || '').toLowerCase();
  if (['pool', 'spa', 'gym', 'fitness'].some(k => n.includes(k))) return 'hourly';
  if (['restaurant', 'bar', 'dining', 'breakfast'].some(k => n.includes(k))) return 'daily';
  return 'flat';
};

const timeToMinutes = (hhmm) => {
  if (!hhmm) return 0;
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};

const buildTimeSlots = (hotelCheckInTime) => {
  const hotelMins = timeToMinutes(hotelCheckInTime || '14:00');
  const slots = [];
  for (let mins = hotelMins; mins <= 23 * 60; mins += 30) {
    const h = String(Math.floor(mins / 60)).padStart(2, '0');
    const m = String(mins % 60).padStart(2, '0');
    slots.push(`${h}:${m}`);
  }
  return slots;
};

const formatTimeDisplay = (hhmm) => {
  if (!hhmm) return '';
  const [h, m] = hhmm.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, '0')} ${period}`;
};

// Fallback display names per type (used only for label rendering)
const ROOM_TYPE_LABELS = {
  single: 'Single Room',
  double: 'Double Room',
  deluxe: 'Deluxe Room',
  suite:  'Suite',
  family: 'Family Room',
};

const ROOM_TYPE_ORDER = ['single', 'double', 'deluxe', 'suite', 'family'];

const Booking = () => {
  const navigate = useNavigate();
  const { guest, logout } = useGuestAuth();

  // ── Guest auth modal state ────────────────────────────────────────────────
  const [showAuthModal, setShowAuthModal]   = useState(false);
  const [authModalMode, setAuthModalMode]   = useState('login');

  const [allAmenities, setAllAmenities]     = useState([]);
  const [amenitiesLoading, setAmenitiesLoading] = useState(true);
  const [hotelCheckInTime, setHotelCheckInTime] = useState('14:00');

  // ── Room type summary from DB ─────────────────────────────────────────────
  const [roomTypes, setRoomTypes]           = useState([]);
  const [roomTypesLoading, setRoomTypesLoading] = useState(true);

  const [formData, setFormData] = useState({
    guestName: '', email: '', phone: '',
    checkInDate: '', checkOutDate: '',
    checkInTime: '',
    roomType: 'deluxe', numberOfGuests: 1,
    selectedOptionalIds: [], amenityHours: {},
    specialRequests: '', stayType: 'overnight',
  });

  const [availableRooms, setAvailableRooms] = useState([]);
  const [selectedRooms, setSelectedRooms]   = useState([]);
  const [searching, setSearching]           = useState(false);
  const [searched, setSearched]             = useState(false);
  const [roomSearchError, setRoomSearchError] = useState('');
  const [bookingStep, setBookingStep]       = useState(1);
  const [loading, setLoading]               = useState(false);
  const [error, setError]                   = useState('');
  const [scrolled, setScrolled]             = useState(false);

  const selectedRoomIds = selectedRooms.map(r => r._id);

  // ── Auto-fill Step 2 when guest logs in / out ─────────────────────────────
  useEffect(() => {
    if (guest) {
      setFormData(prev => ({
        ...prev,
        guestName: guest.name  || prev.guestName,
        email:     guest.email || prev.email,
        phone:     guest.phone || prev.phone,
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        guestName: '',
        email:     '',
        phone:     '',
      }));
    }
  }, [guest]);

  // ── Hotel info ────────────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const res = await axios.get(`${API}/hotel/public`);
        const hotel = res.data?.data;
        if (hotel?.checkInTime) setHotelCheckInTime(hotel.checkInTime);
      } catch (err) {
        console.error('Could not fetch hotel info:', err.message);
      }
    })();
  }, []);

  // ── Room type summary (real data from DB) ─────────────────────────────────
  useEffect(() => {
    (async () => {
      setRoomTypesLoading(true);
      try {
        const res = await axios.get(`${API}/rooms/types/summary`);
        const raw = res.data?.data ?? [];

        // Sort by our preferred display order and attach display name
        const ordered = ROOM_TYPE_ORDER
          .map(id => {
            const found = raw.find(r => r.id === id);
            return found
              ? {
                  id,
                  name:        ROOM_TYPE_LABELS[id] || id,
                  description: found.description || '',
                  capacity:    found.maxCapacity  || 1,
                  minPrice:    found.minPrice      || 0,
                }
              : null;
          })
          .filter(Boolean);

        setRoomTypes(ordered);
      } catch (err) {
        console.error('Room type summary fetch error:', err.message);
        // Graceful fallback — empty list; UI will show a soft message
        setRoomTypes([]);
      } finally {
        setRoomTypesLoading(false);
      }
    })();
  }, []);

  // ── Amenities ─────────────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      setAmenitiesLoading(true);
      try {
        const res = await axios.get(`${API}/amenities?active=true`);
        setAllAmenities(res.data?.data ?? []);
      } catch (err) {
        console.error('Amenity fetch error:', err.message);
        setAllAmenities([]);
      } finally {
        setAmenitiesLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const timeSlots = useMemo(() => buildTimeSlots(hotelCheckInTime), [hotelCheckInTime]);

  const roomAmenityIds = useMemo(() => {
    const ids = new Set();
    selectedRooms.forEach(room =>
      (room.amenities || []).forEach(a => {
        if (typeof a === 'object' && a._id) ids.add(a._id.toString());
      })
    );
    return ids;
  }, [selectedRooms]);

  const includedAmenities = useMemo(() => {
    const seen = new Set(); const out = [];
    selectedRooms.forEach(room =>
      (room.amenities || []).forEach(a => {
        if (typeof a !== 'object' || a.price !== 0) return;
        const k = a._id?.toString();
        if (k && !seen.has(k)) { seen.add(k); out.push(a); }
      })
    );
    return out;
  }, [selectedRooms]);

  const optionalAmenities = useMemo(() => {
    if (!selectedRooms.length) return [];
    return allAmenities.filter(a => !roomAmenityIds.has(a._id?.toString()));
  }, [allAmenities, roomAmenityIds, selectedRooms.length]);

  useEffect(() => {
    if (selectedRooms.length === 0)
      setFormData(prev => ({ ...prev, selectedOptionalIds: [], amenityHours: {} }));
  }, [selectedRooms]);

  const isSameDayStay = () =>
    !!(formData.checkInDate && formData.checkOutDate && formData.checkInDate === formData.checkOutDate);

  useEffect(() => {
    setFormData(prev => ({ ...prev, stayType: isSameDayStay() ? 'daytime' : 'overnight' }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.checkInDate, formData.checkOutDate]);

  const resetRoomSearch = () => {
    setSearched(false); setAvailableRooms([]); setSelectedRooms([]); setRoomSearchError('');
  };

  const searchRooms = async () => {
    if (!formData.checkInDate || !formData.checkOutDate) return;
    setSearching(true); setRoomSearchError('');
    try {
      const res = await axios.get(`${API}/reservations/available`, {
        params: {
          roomType: formData.roomType,
          checkInDate: formData.checkInDate,
          checkOutDate: formData.checkOutDate,
        },
      });
      setAvailableRooms(res.data.data || []); setSearched(true);
    } catch {
      setRoomSearchError('Unable to fetch available rooms. Please try again.'); setSearched(true);
    } finally {
      setSearching(false);
    }
  };

  const toggleRoom = (room) =>
    setSelectedRooms(prev =>
      prev.some(r => r._id === room._id) ? prev.filter(r => r._id !== room._id) : [...prev, room]
    );

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleAmenityToggle = (amenityId) => {
    const amenity = optionalAmenities.find(a => a._id === amenityId);
    if (!amenity) return;
    const model = inferPricingModel(amenity);
    setFormData(prev => {
      const sel = prev.selectedOptionalIds.includes(amenityId);
      if (sel) {
        const h = { ...prev.amenityHours }; delete h[amenityId];
        return { ...prev, selectedOptionalIds: prev.selectedOptionalIds.filter(id => id !== amenityId), amenityHours: h };
      }
      return {
        ...prev,
        selectedOptionalIds: [...prev.selectedOptionalIds, amenityId],
        amenityHours: model === 'hourly' ? { ...prev.amenityHours, [amenityId]: 1 } : prev.amenityHours,
      };
    });
  };

  const handleAmenityHoursChange = (amenityId, hours) =>
    setFormData(prev => ({
      ...prev,
      amenityHours: { ...prev.amenityHours, [amenityId]: Math.max(1, parseInt(hours) || 1) },
    }));

  const getNumberOfNights = () => {
    if (!formData.checkInDate || !formData.checkOutDate) return 0;
    return Math.max(0, Math.ceil(
      (new Date(formData.checkOutDate) - new Date(formData.checkInDate)) / 86400000
    ));
  };

  const calculateAmenitiesBreakdown = () => {
    const breakdown = {}; const nights = getNumberOfNights();
    formData.selectedOptionalIds.forEach(amenityId => {
      const amenity = optionalAmenities.find(a => a._id === amenityId);
      if (!amenity || amenity.price === 0) return;
      const model = inferPricingModel(amenity);
      const label = amenity.label || amenity.name;
      if (model === 'hourly') {
        const hours = formData.amenityHours[amenityId] || 1;
        breakdown[amenityId] = { name: label, price: amenity.price, quantity: hours, unit: 'hours', subtotal: amenity.price * hours };
      } else if (model === 'daily') {
        breakdown[amenityId] = { name: label, price: amenity.price, quantity: nights, unit: 'days', subtotal: amenity.price * nights };
      } else {
        breakdown[amenityId] = { name: label, price: amenity.price, quantity: 1, unit: 'flat', subtotal: amenity.price };
      }
    });
    return breakdown;
  };

  const calculateRoomPrice = () => {
    const nights = getNumberOfNights();
    if (isSameDayStay()) {
      // For daytime, use the minPrice from room type summary
      const def = roomTypes.find(r => r.id === formData.roomType);
      return (def?.minPrice || 0) * (selectedRooms.length || 1);
    }
    if (selectedRooms.length > 0 && nights > 0)
      return selectedRooms.reduce((sum, room) => sum + (room.pricePerNight || 0) * nights, 0);
    return 0;
  };

  const calculateTotalPrice = () =>
    calculateRoomPrice() +
    Object.values(calculateAmenitiesBreakdown()).reduce((s, i) => s + i.subtotal, 0);

  const handleNextStep = () => {
    if (bookingStep === 1) {
      if (!formData.checkInDate || !formData.checkOutDate) { setError('Please select check-in and check-out dates'); return; }
      if (!searched) { setError('Please search for available rooms first'); return; }
      if (!selectedRooms.length) { setError('Please select at least one room'); return; }
    }
    if (bookingStep === 2 && (!formData.guestName || !formData.email || !formData.phone)) {
      setError('Please fill in all required fields');
      return;
    }
    setError('');
    if (bookingStep < 3) setBookingStep(bookingStep + 1);
  };

  const handlePreviousStep = () => { if (bookingStep > 1) setBookingStep(bookingStep - 1); };

  const handleSubmitBooking = async () => {
    try {
      setLoading(true); setError('');
      const amenitiesBreakdown = calculateAmenitiesBreakdown();
      const freeOptionals = formData.selectedOptionalIds
        .map(id => optionalAmenities.find(a => a._id === id))
        .filter(a => a && a.price === 0).map(a => a.label || a.name);
      const paidOptionalIds = formData.selectedOptionalIds
        .filter(id => { const a = optionalAmenities.find(x => x._id === id); return a && a.price > 0; });

      const response = await axios.post(`${API}/reservations`, {
        guestName:      formData.guestName,
        email:          formData.email,
        phone:          formData.phone,
        checkInDate:    formData.checkInDate,
        checkOutDate:   formData.checkOutDate,
        checkInTime:    formData.checkInTime || null,
        roomIds:        selectedRoomIds,
        roomType:       formData.roomType,
        numberOfGuests: Number(formData.numberOfGuests),
        numberOfRooms:  selectedRooms.length,
        freeAmenities:  [...includedAmenities.map(a => a.label || a.name), ...freeOptionals],
        paidAmenities:  paidOptionalIds,
        amenityHours:   formData.amenityHours,
        amenitiesBreakdown,
        specialRequests: formData.specialRequests,
        stayType:       formData.stayType,
        totalPrice:     calculateTotalPrice(),
      });

      if (response.data.success) {
        alert('✅ Booking confirmed! Check your email for confirmation details.');
        navigate('/');
      } else {
        setError(response.data.message || 'Booking failed. Please try again.');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Error submitting booking. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const selectedRoomTypeDef = roomTypes.find(r => r.id === formData.roomType);
  const totalPrice           = calculateTotalPrice();
  const amenitiesBreakdown   = calculateAmenitiesBreakdown();
  const nights               = getNumberOfNights();
  const isOptSelected        = (id) => formData.selectedOptionalIds.includes(id);
  const showAfterSelect      = selectedRooms.length > 0;

  const displayRateLabel = () => {
    if (!selectedRooms.length) return null;
    const rates = [...new Set(selectedRooms.map(r => r.pricePerNight))];
    return rates.length === 1
      ? `$${rates[0]}/night`
      : `$${Math.min(...rates)}–$${Math.max(...rates)}/night`;
  };

  const STEPS = ['Select Room', 'Guest Details', 'Confirm'];

  // ── Guest banner ─────────────────────────────────────────────────────────
  const GuestBanner = () => {
    if (guest) {
      return (
        <div className="bp-guest-banner bp-guest-banner--in">
          <div className="bp-guest-banner-left">
            <div className="bp-guest-avatar">
              {guest.name?.charAt(0)?.toUpperCase() || <UserCircle size={16} />}
            </div>
            <div className="bp-guest-banner-info">
              <span className="bp-guest-banner-label">Signed in as</span>
              <span className="bp-guest-banner-name">{guest.name}</span>
            </div>
          </div>
          <div className="bp-guest-banner-right">
            <span className="bp-guest-autofill-note">
              <Check size={11} /> Details auto-filled in Step 2
            </span>
            <button
              className="bp-guest-banner-btn bp-guest-banner-btn--out"
              onClick={logout}
            >
              <LogOut size={13} /> Sign Out
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="bp-guest-banner bp-guest-banner--out">
        <div className="bp-guest-banner-left">
          <UserCircle size={18} className="bp-guest-banner-icon" />
          <div className="bp-guest-banner-info">
            <span className="bp-guest-banner-name">Have a guest account?</span>
            <span className="bp-guest-banner-label">Sign in to auto-fill your details</span>
          </div>
        </div>
        <div className="bp-guest-banner-right">
          <button
            className="bp-guest-banner-btn"
            onClick={() => { setAuthModalMode('login'); setShowAuthModal(true); }}
          >
            <LogIn size={13} /> Sign In
          </button>
          <button
            className="bp-guest-banner-btn bp-guest-banner-btn--reg"
            onClick={() => { setAuthModalMode('register'); setShowAuthModal(true); }}
          >
            <UserPlus size={13} /> Register
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="bp-page">

      {showAuthModal && (
        <GuestAuthModal
          initialMode={authModalMode}
          onClose={() => setShowAuthModal(false)}
          onSuccess={() => setShowAuthModal(false)}
        />
      )}

      <header className={`bp-header ${scrolled ? 'bp-header--scrolled' : ''}`}>
        <div className="bp-header-inner">
          <button className="bp-back-btn" onClick={() => navigate('/')}>
            <ArrowLeft size={16} /> Back to Home
          </button>
          <div className="bp-header-title">
            <span className="bp-header-eyebrow">Reservation</span>
            <h1 className="bp-header-name">Book Your Stay</h1>
          </div>
          {totalPrice > 0 && (
            <div className="bp-header-price">
              <span className="bp-header-price-label">Estimated Total</span>
              <span className="bp-header-price-val">${totalPrice.toLocaleString()}</span>
            </div>
          )}
        </div>
      </header>

      <div className="bp-hero-band">
        <div className="bp-hero-inner">
          <div className="bp-hero-eyebrow">
            <span className="bp-eyebrow-line" /> Reserve Your Experience <span className="bp-eyebrow-line" />
          </div>
          <h2 className="bp-hero-title">Your Perfect Stay<br /><em>Awaits You</em></h2>
        </div>
      </div>

      <div className="bp-guest-banner-wrap">
        <GuestBanner />
      </div>

      <div className="bp-steps-bar">
        <div className="bp-steps">
          {STEPS.map((label, idx) => {
            const num = idx + 1;
            const state = bookingStep > num ? 'done' : bookingStep === num ? 'active' : 'idle';
            return (
              <React.Fragment key={num}>
                <div className={`bp-step bp-step--${state}`}>
                  <div className="bp-step-circle">
                    {state === 'done' ? <Check size={14} /> : num}
                  </div>
                  <span className="bp-step-label">{label}</span>
                </div>
                {idx < STEPS.length - 1 && (
                  <div className={`bp-step-connector ${bookingStep > num ? 'bp-step-connector--done' : ''}`} />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      <div className="bp-content">
        {error && (
          <div className="bp-error-banner">
            <span>{error}</span>
            <button onClick={() => setError('')}>✕</button>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════
            STEP 1 — Select Room
        ═══════════════════════════════════════════════════════════ */}
        {bookingStep === 1 && (
          <div className="bp-card">
            <div className="bp-card-header">
              <div className="bp-card-eyebrow"><span className="bp-eyebrow-line" /> Step 1 of 3</div>
              <h2 className="bp-card-title">Select Your Room</h2>
            </div>

            {/* Dates */}
            <div className="bp-section">
              <h3 className="bp-section-title">Stay Dates &amp; Time</h3>
              <div className="bp-form-row-2">
                <div className="bp-form-group">
                  <label className="bp-label"><Calendar size={12} /> Check-in Date</label>
                  <input
                    className="bp-input" type="date" name="checkInDate"
                    value={formData.checkInDate}
                    onChange={e => { handleInputChange(e); resetRoomSearch(); }}
                  />
                </div>
                <div className="bp-form-group">
                  <label className="bp-label"><Calendar size={12} /> Check-out Date</label>
                  <input
                    className="bp-input" type="date" name="checkOutDate"
                    value={formData.checkOutDate}
                    onChange={e => { handleInputChange(e); resetRoomSearch(); }}
                  />
                </div>
              </div>

              {/* Check-in time */}
              <div className="bp-form-group bp-checkin-time-group">
                <label className="bp-label">
                  <Clock size={12} /> Preferred Check-in Time
                  <span className="bp-label-optional">(optional)</span>
                </label>
                <div className="bp-checkin-time-row">
                  <select
                    className="bp-input bp-input--time"
                    name="checkInTime"
                    value={formData.checkInTime}
                    onChange={handleInputChange}
                  >
                    <option value="">No preference</option>
                    {timeSlots.map(slot => (
                      <option key={slot} value={slot}>{formatTimeDisplay(slot)}</option>
                    ))}
                  </select>
                  {formData.checkInTime && (
                    <div className="bp-time-badge">
                      <Clock size={13} /> Arriving around {formatTimeDisplay(formData.checkInTime)}
                    </div>
                  )}
                </div>
                <p className="bp-time-hint">
                  Check-in is available from {formatTimeDisplay(hotelCheckInTime)}. Subject to room availability.
                </p>
              </div>

              {formData.checkInDate && formData.checkOutDate && (
                <div className={`bp-stay-badge ${isSameDayStay() ? 'bp-stay-badge--day' : 'bp-stay-badge--night'}`}>
                  {isSameDayStay() ? <Sun size={15} /> : <Moon size={15} />}
                  {isSameDayStay()
                    ? 'Day-time Stay'
                    : `Overnight Stay — ${nights} night${nights !== 1 ? 's' : ''}`}
                </div>
              )}

              <div className="bp-form-row-2" style={{ marginTop: '1.25rem' }}>
                <div className="bp-form-group">
                  <label className="bp-label"><Users size={12} /> Number of Guests</label>
                  <input
                    className="bp-input" type="number" name="numberOfGuests"
                    value={formData.numberOfGuests} onChange={handleInputChange} min="1" max="10"
                  />
                </div>
              </div>
            </div>

            {/* Room Type */}
            <div className="bp-section">
              <h3 className="bp-section-title"><BedDouble size={12} /> Room Type</h3>

              {roomTypesLoading ? (
                <div className="bp-loading">
                  <Loader size={15} className="bp-spinner" /> Loading room types…
                </div>
              ) : roomTypes.length === 0 ? (
                <div className="bp-no-rooms">No room types available at this time.</div>
              ) : (
                <div className="bp-room-type-grid">
                  {roomTypes.map(room => (
                    <div
                      key={room.id}
                      className={`bp-room-type-card ${formData.roomType === room.id ? 'bp-room-type-card--selected' : ''}`}
                      onClick={() => { setFormData(prev => ({ ...prev, roomType: room.id })); resetRoomSearch(); setError(''); }}
                    >
                      {formData.roomType === room.id && (
                        <div className="bp-room-type-selected-badge"><Check size={12} /></div>
                      )}
                      <div className="bp-room-type-name">{room.name}</div>

                      {/* Real description from DB */}
                      {room.description ? (
                        <div className="bp-room-type-desc">{room.description}</div>
                      ) : (
                        <div className="bp-room-type-desc bp-room-type-desc--empty">No description available</div>
                      )}

                      {/* Real max capacity from DB */}
                      <div className="bp-room-type-capacity">
                        <Users size={13} /> Up to {room.capacity} guest{room.capacity !== 1 ? 's' : ''}
                      </div>

                      {/* Real price from DB */}
                      <div className="bp-room-type-price">
                        {isSameDayStay() ? (
                          room.minPrice > 0
                            ? <>${room.minPrice}<span>/day</span></>
                            : <span style={{ fontSize: '0.85rem' }}>Price on request</span>
                        ) : selectedRooms.length > 0 && formData.roomType === room.id && displayRateLabel() ? (
                          <>{displayRateLabel()}</>
                        ) : (
                          room.minPrice > 0
                            ? <>from <span style={{ fontWeight: 700 }}>${room.minPrice}</span><span>/night</span></>
                            : <span style={{ fontSize: '0.85rem' }}>Price on request</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Available Rooms */}
            <div className="bp-section">
              <div className="bp-section-title-row">
                <h3 className="bp-section-title">Available Rooms</h3>
                {searched && availableRooms.length > 0 && (
                  <span className="bp-avail-count">{availableRooms.length} available</span>
                )}
              </div>

              {!searched ? (
                <div className="bp-room-search-area">
                  <button
                    className="bp-search-btn"
                    onClick={searchRooms}
                    disabled={searching || !formData.checkInDate || !formData.checkOutDate}
                  >
                    {searching
                      ? <><Loader size={15} className="bp-spinner" /> Searching…</>
                      : <><Search size={15} /> Search Available Rooms</>}
                  </button>
                  {(!formData.checkInDate || !formData.checkOutDate) && (
                    <p className="bp-room-hint">Set check-in and check-out dates first.</p>
                  )}
                </div>
              ) : (
                <div>
                  <div className="bp-room-search-meta">
                    <span>
                      {availableRooms.length} room{availableRooms.length !== 1 ? 's' : ''} available
                      &nbsp;·&nbsp; {selectedRoomTypeDef?.name}
                      &nbsp;·&nbsp; {formData.checkInDate} → {formData.checkOutDate}
                    </span>
                    <button className="bp-re-search-btn" onClick={resetRoomSearch}>↺ Re-search</button>
                  </div>
                  {roomSearchError && (
                    <div className="bp-error-banner" style={{ marginBottom: '1rem' }}>
                      <span>{roomSearchError}</span>
                    </div>
                  )}
                  {availableRooms.length === 0
                    ? <div className="bp-no-rooms">No rooms available for the selected dates and type.</div>
                    : (
                      <>
                        {selectedRooms.length > 0 && (
                          <div className="bp-select-hint">
                            {selectedRooms.length} room{selectedRooms.length > 1 ? 's' : ''} selected — click to deselect
                          </div>
                        )}
                        <div className="bp-rooms-grid bp-rooms-grid--wide">
                          {availableRooms.map(room => {
                            const sel  = selectedRooms.some(r => r._id === room._id);
                            const objs = (room.amenities || []).filter(a => typeof a === 'object');
                            const free = objs.filter(a => a.price === 0);
                            const paid = objs.filter(a => a.price > 0);
                            return (
                              <div
                                key={room._id}
                                className={`bp-room-card bp-room-card--wide ${sel ? 'bp-room-card--selected' : ''}`}
                                onClick={() => toggleRoom(room)}
                              >
                                {sel && <div className="bp-room-check"><Check size={14} /></div>}
                                <div className="bp-room-card-top">
                                  <div>
                                    <div className="bp-room-number">Room {room.roomNumber}</div>
                                    <div className="bp-room-floor">Floor {room.floor}</div>
                                  </div>
                                  <div className="bp-room-price-badge">
                                    <span className="bp-room-price-amount">${room.pricePerNight}</span>
                                    <span className="bp-room-price-unit">/night</span>
                                  </div>
                                </div>
                                {objs.length > 0 ? (
                                  <div className="bp-room-card-amenities">
                                    {free.map(a => (
                                      <span key={a._id} className="bp-room-amenity-tag bp-room-amenity-tag--free">
                                        {a.icon || '✦'} {a.label || a.name}
                                        <span className="bp-room-amenity-badge-free">Free</span>
                                      </span>
                                    ))}
                                    {paid.map(a => (
                                      <span key={a._id} className="bp-room-amenity-tag bp-room-amenity-tag--paid">
                                        {a.icon || '✦'} {a.label || a.name}
                                        <span className="bp-room-amenity-badge-paid">+${a.price}</span>
                                      </span>
                                    ))}
                                  </div>
                                ) : <div className="bp-room-no-amenities">No amenities listed</div>}
                              </div>
                            );
                          })}
                        </div>
                      </>
                    )}

                  {selectedRooms.length > 0 && nights > 0 && (
                    <div className="bp-price-preview">
                      <CreditCard size={14} />
                      <span>
                        Room subtotal: <strong>${calculateRoomPrice().toLocaleString()}</strong>
                        {' '}({nights} night{nights !== 1 ? 's' : ''} × {selectedRooms.length} room{selectedRooms.length > 1 ? 's' : ''}
                        {' '}· {displayRateLabel()})
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {showAfterSelect && (
              <>
                {/* Complimentary amenities */}
                {includedAmenities.length > 0 && (
                  <div className="bp-section bp-section--amenity-reveal">
                    <div className="bp-amenity-section-header">
                      <Gift size={15} className="bp-amenity-section-icon bp-amenity-section-icon--green" />
                      <div>
                        <h3 className="bp-section-title" style={{ marginBottom: 0 }}>Complimentary Amenities</h3>
                        <p className="bp-amenity-section-sub">
                          Included with your selected room{selectedRooms.length > 1 ? 's' : ''} at no extra charge
                        </p>
                      </div>
                    </div>
                    <div className="bp-free-amenities">
                      {includedAmenities.map(a => (
                        <div key={a._id} className="bp-free-amenity-item">
                          <span className="bp-free-amenity-icon">{a.icon || '✦'}</span>
                          <Check size={12} className="bp-free-amenity-check" />
                          <span>{a.label || a.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Optional add-ons */}
                {amenitiesLoading ? (
                  <div className="bp-section bp-section--amenity-reveal">
                    <div className="bp-loading"><Loader size={15} className="bp-spinner" /> Loading available add-ons…</div>
                  </div>
                ) : optionalAmenities.length > 0 ? (
                  <div className="bp-section bp-section--amenity-reveal">
                    <div className="bp-amenity-section-header">
                      <Star size={15} className="bp-amenity-section-icon bp-amenity-section-icon--gold" />
                      <div>
                        <h3 className="bp-section-title" style={{ marginBottom: 0 }}>Enhance Your Stay</h3>
                        <p className="bp-amenity-section-sub">
                          {optionalAmenities.length} add-on{optionalAmenities.length !== 1 ? 's' : ''} not included in your room — select any you'd like
                        </p>
                      </div>
                    </div>
                    <div className="bp-amenities-grid">
                      {optionalAmenities.map(amenity => {
                        const active = isOptSelected(amenity._id);
                        const model  = inferPricingModel(amenity);
                        const isFree = amenity.price === 0;
                        return (
                          <div
                            key={amenity._id}
                            className={`bp-amenity-card ${active ? 'bp-amenity-card--active' : ''} ${isFree ? 'bp-amenity-card--free-opt' : ''}`}
                          >
                            <div className="bp-amenity-toggle" onClick={() => handleAmenityToggle(amenity._id)}>
                              <div className="bp-amenity-icon" style={{ fontSize: '1.4rem' }}>{amenity.icon || '✦'}</div>
                              <div className="bp-amenity-info">
                                <div className="bp-amenity-name">
                                  {amenity.label || amenity.name}
                                  {isFree && <span className="bp-amenity-free-badge">Free</span>}
                                </div>
                                {!isFree && (
                                  <div className="bp-amenity-price-label">
                                    ${amenity.price}{model === 'hourly' ? ' / hour' : model === 'daily' ? ' / day' : ' flat'}
                                  </div>
                                )}
                                {amenity.description && <div className="bp-amenity-desc">{amenity.description}</div>}
                              </div>
                              <div className={`bp-amenity-check ${active ? 'bp-amenity-check--on' : ''}`}>
                                {active && <Check size={12} />}
                              </div>
                            </div>
                            {!isFree && model === 'hourly' && active && (
                              <div className="bp-amenity-hours">
                                <label>Hours</label>
                                <div className="bp-amenity-hours-row">
                                  <input
                                    className="bp-input bp-input--sm" type="number" min="1" max="24"
                                    value={formData.amenityHours[amenity._id] || 1}
                                    onChange={e => handleAmenityHoursChange(amenity._id, e.target.value)}
                                  />
                                  <span className="bp-amenity-subtotal">
                                    = ${amenity.price * (formData.amenityHours[amenity._id] || 1)}
                                  </span>
                                </div>
                              </div>
                            )}
                            {!isFree && model === 'daily' && active && (
                              <div className="bp-amenity-daily-info">
                                {nights} day{nights !== 1 ? 's' : ''} × ${amenity.price} = <strong>${amenity.price * nights}</strong>
                              </div>
                            )}
                            {!isFree && model === 'flat' && active && (
                              <div className="bp-amenity-daily-info">Flat rate: <strong>${amenity.price}</strong></div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : null}

                {/* Price Summary */}
                {formData.checkInDate && formData.checkOutDate && (
                  <div className="bp-section">
                    <div className="bp-price-summary">
                      <div className="bp-price-summary-header">Price Summary</div>
                      {!isSameDayStay() && selectedRooms.map(room => (
                        <div key={room._id} className="bp-price-row">
                          <span>Room #{room.roomNumber} ({selectedRoomTypeDef?.name})</span>
                          <span>${room.pricePerNight}/night × {nights} night{nights !== 1 ? 's' : ''} = ${(room.pricePerNight * nights).toLocaleString()}</span>
                        </div>
                      ))}
                      {isSameDayStay() && (
                        <div className="bp-price-row">
                          <span>{selectedRoomTypeDef?.name} × {selectedRooms.length} room{selectedRooms.length > 1 ? 's' : ''}</span>
                          <span>${selectedRoomTypeDef?.minPrice}/day</span>
                        </div>
                      )}
                      {includedAmenities.length > 0 && (
                        <div className="bp-price-row bp-price-row--muted bp-price-row--free">
                          <span>Included: {includedAmenities.map(a => a.label || a.name).join(', ')}</span>
                          <span className="bp-price-free-label">Complimentary</span>
                        </div>
                      )}
                      {formData.selectedOptionalIds.map(id => {
                        const a = optionalAmenities.find(x => x._id === id);
                        return a && a.price === 0 ? (
                          <div key={id} className="bp-price-row bp-price-row--muted bp-price-row--free">
                            <span>+ {a.label || a.name}</span><span className="bp-price-free-label">Free</span>
                          </div>
                        ) : null;
                      })}
                      {Object.entries(amenitiesBreakdown).map(([key, item]) => (
                        <div key={key} className="bp-price-row bp-price-row--muted">
                          <span>{item.name} ({item.quantity} {item.unit})</span><span>+${item.subtotal}</span>
                        </div>
                      ))}
                      <div className="bp-price-row bp-price-row--total">
                        <span>Total</span><span>${totalPrice.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════
            STEP 2 — Guest Details
        ═══════════════════════════════════════════════════════════ */}
        {bookingStep === 2 && (
          <div className="bp-card">
            <div className="bp-card-header">
              <div className="bp-card-eyebrow"><span className="bp-eyebrow-line" /> Step 2 of 3</div>
              <h2 className="bp-card-title">Your Details</h2>
            </div>

            {!guest && (
              <div className="bp-section">
                <div className="bp-guest-nudge">
                  <div className="bp-guest-nudge-left">
                    <UserCircle size={22} className="bp-guest-nudge-icon" />
                    <div>
                      <div className="bp-guest-nudge-title">Save time on future bookings</div>
                      <div className="bp-guest-nudge-body">
                        Create a guest account or sign in to auto-fill your details and track your reservations.
                      </div>
                    </div>
                  </div>
                  <div className="bp-guest-nudge-actions">
                    <button
                      className="bp-guest-nudge-btn"
                      onClick={() => { setAuthModalMode('login'); setShowAuthModal(true); }}
                    >
                      <LogIn size={13} /> Sign In
                    </button>
                    <button
                      className="bp-guest-nudge-btn bp-guest-nudge-btn--reg"
                      onClick={() => { setAuthModalMode('register'); setShowAuthModal(true); }}
                    >
                      <UserPlus size={13} /> Register
                    </button>
                  </div>
                </div>
              </div>
            )}

            {guest && (
              <div className="bp-section">
                <div className="bp-guest-autofill-banner">
                  <Check size={14} className="bp-guest-autofill-check" />
                  <span>
                    Details auto-filled from your guest account (<strong>{guest.email}</strong>).
                    You can edit them below if needed.
                  </span>
                </div>
              </div>
            )}

            <div className="bp-section">
              <h3 className="bp-section-title">Personal Information</h3>
              <div className="bp-form-group">
                <label className="bp-label">Full Name <span className="bp-required">*</span></label>
                <input
                  className="bp-input" type="text" name="guestName"
                  value={formData.guestName} onChange={handleInputChange}
                  placeholder="Enter your full name"
                />
              </div>
              <div className="bp-form-row-2">
                <div className="bp-form-group">
                  <label className="bp-label">Email Address <span className="bp-required">*</span></label>
                  <input
                    className="bp-input" type="email" name="email"
                    value={formData.email} onChange={handleInputChange}
                    placeholder="your@email.com"
                  />
                </div>
                <div className="bp-form-group">
                  <label className="bp-label">Phone Number <span className="bp-required">*</span></label>
                  <input
                    className="bp-input" type="tel" name="phone"
                    value={formData.phone} onChange={handleInputChange}
                    placeholder="+1 (000) 000-0000"
                  />
                </div>
              </div>
              <div className="bp-form-group">
                <label className="bp-label">Special Requests</label>
                <textarea
                  className="bp-input bp-textarea" name="specialRequests"
                  value={formData.specialRequests} onChange={handleInputChange}
                  placeholder="Any special requests or preferences?" rows="4"
                />
              </div>
            </div>

            <div className="bp-recap">
              <div className="bp-recap-title">Your Booking Recap</div>
              <div className="bp-recap-grid">
                <div className="bp-recap-item">
                  <div className="bp-recap-label">Check-in</div>
                  <div className="bp-recap-val">{formData.checkInDate}</div>
                </div>
                <div className="bp-recap-item">
                  <div className="bp-recap-label">Check-out</div>
                  <div className="bp-recap-val">{formData.checkOutDate}</div>
                </div>
                <div className="bp-recap-item">
                  <div className="bp-recap-label">Arrival Time</div>
                  <div className="bp-recap-val">
                    {formData.checkInTime ? formatTimeDisplay(formData.checkInTime) : 'No preference'}
                  </div>
                </div>
                <div className="bp-recap-item">
                  <div className="bp-recap-label">Room</div>
                  <div className="bp-recap-val">{selectedRoomTypeDef?.name}</div>
                </div>
                <div className="bp-recap-item">
                  <div className="bp-recap-label">Total</div>
                  <div className="bp-recap-val bp-recap-val--gold">${totalPrice.toLocaleString()}</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════
            STEP 3 — Confirm
        ═══════════════════════════════════════════════════════════ */}
        {bookingStep === 3 && (
          <div className="bp-card">
            <div className="bp-card-header">
              <div className="bp-card-eyebrow"><span className="bp-eyebrow-line" /> Step 3 of 3</div>
              <h2 className="bp-card-title">Confirm Your Booking</h2>
            </div>
            <div className="bp-section">
              <h3 className="bp-section-title">Guest Information</h3>
              <div className="bp-confirm-table">
                {[['Name', formData.guestName], ['Email', formData.email], ['Phone', formData.phone]].map(([l, v]) => (
                  <div key={l} className="bp-confirm-row">
                    <span className="bp-confirm-label">{l}</span>
                    <span className="bp-confirm-val">{v}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="bp-section">
              <h3 className="bp-section-title">Stay Details</h3>
              <div className="bp-confirm-table">
                {[
                  ['Check-in',    formData.checkInDate],
                  ['Check-out',   formData.checkOutDate],
                  ['Arrival Time', formData.checkInTime ? formatTimeDisplay(formData.checkInTime) : 'No preference'],
                  ['Stay Type',   isSameDayStay() ? 'Day-time Stay' : `Overnight Stay (${nights} night${nights !== 1 ? 's' : ''})`],
                  ['Room Type',   selectedRoomTypeDef?.name],
                  ['Rooms',       selectedRooms.map(r => `#${r.roomNumber} (Floor ${r.floor} · $${r.pricePerNight}/night)`).join(', ')],
                  ['Guests',      formData.numberOfGuests],
                ].map(([l, v]) => (
                  <div key={l} className="bp-confirm-row">
                    <span className="bp-confirm-label">{l}</span>
                    <span className="bp-confirm-val">{v}</span>
                  </div>
                ))}
              </div>
            </div>
            {includedAmenities.length > 0 && (
              <div className="bp-section">
                <h3 className="bp-section-title">Complimentary Amenities</h3>
                <div className="bp-tags">
                  {includedAmenities.map(a => (
                    <div key={a._id} className="bp-tag bp-tag--green">
                      <span>{a.icon || '✦'}</span><Check size={12} />{a.label || a.name}
                    </div>
                  ))}
                </div>
              </div>
            )}
            {formData.selectedOptionalIds.length > 0 && (
              <div className="bp-section">
                <h3 className="bp-section-title">Selected Add-ons</h3>
                <div className="bp-tags">
                  {formData.selectedOptionalIds.map(id => {
                    const a  = optionalAmenities.find(x => x._id === id); if (!a) return null;
                    const bd = amenitiesBreakdown[id];
                    return a.price === 0
                      ? (
                        <div key={id} className="bp-tag bp-tag--green">
                          <span>{a.icon || '✦'}</span><Check size={12} />{a.label || a.name}
                          <span className="bp-tag-free">Free</span>
                        </div>
                      )
                      : bd
                        ? <div key={id} className="bp-tag bp-tag--gold">{a.label || a.name} · {bd.quantity} {bd.unit} · ${bd.subtotal}</div>
                        : null;
                  })}
                </div>
              </div>
            )}
            <div className="bp-section">
              <h3 className="bp-section-title">Price Breakdown</h3>
              <div className="bp-price-summary">
                {!isSameDayStay() && selectedRooms.map(room => (
                  <div key={room._id} className="bp-price-row">
                    <span>Room #{room.roomNumber} × {nights} night{nights !== 1 ? 's' : ''} × ${room.pricePerNight}/night</span>
                    <span>${(room.pricePerNight * nights).toLocaleString()}</span>
                  </div>
                ))}
                {isSameDayStay() && (
                  <div className="bp-price-row">
                    <span>{selectedRoomTypeDef?.name} × {selectedRooms.length} room{selectedRooms.length > 1 ? 's' : ''} (day stay)</span>
                    <span>${calculateRoomPrice().toLocaleString()}</span>
                  </div>
                )}
                {includedAmenities.length > 0 && (
                  <div className="bp-price-row bp-price-row--muted bp-price-row--free">
                    <span>Included: {includedAmenities.map(a => a.label || a.name).join(', ')}</span>
                    <span className="bp-price-free-label">Complimentary</span>
                  </div>
                )}
                {Object.entries(amenitiesBreakdown).map(([key, item]) => (
                  <div key={key} className="bp-price-row bp-price-row--muted">
                    <span>{item.name} ({item.quantity} {item.unit} × ${item.price})</span>
                    <span>+${item.subtotal}</span>
                  </div>
                ))}
                <div className="bp-price-row bp-price-row--total">
                  <span>Total Amount</span><span>${totalPrice.toLocaleString()}</span>
                </div>
              </div>
            </div>
            {formData.specialRequests && (
              <div className="bp-section">
                <h3 className="bp-section-title">Special Requests</h3>
                <div className="bp-special-requests">{formData.specialRequests}</div>
              </div>
            )}
          </div>
        )}

        {/* Navigation */}
        <div className="bp-nav">
          <button className="bp-btn bp-btn--secondary" onClick={handlePreviousStep} disabled={bookingStep === 1}>
            ← Previous
          </button>
          {bookingStep < 3 ? (
            <button className="bp-btn bp-btn--primary" onClick={handleNextStep} disabled={loading}>
              {loading
                ? <><Loader size={16} className="bp-spinner" /> Loading…</>
                : <>Next <ChevronRight size={16} /></>}
            </button>
          ) : (
            <button className="bp-btn bp-btn--gold" onClick={handleSubmitBooking} disabled={loading}>
              {loading
                ? <><Loader size={16} className="bp-spinner" /> Submitting…</>
                : 'Complete Booking'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Booking;