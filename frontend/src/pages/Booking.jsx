// frontend/src/pages/Booking.jsx

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Users, Calendar, Wifi, Waves, Droplets,
  UtensilsCrossed, Wine, Dumbbell, Check, Loader,
  Moon, Sun, ChevronRight, Search, BedDouble, CreditCard,
} from 'lucide-react';
import axios from 'axios';
import './Booking.css';

const API = process.env.REACT_APP_API_URL;

// ── Room prices (mirrors receptionist page) ─────────────────────
const ROOM_PRICES = { single: 80, double: 120, deluxe: 180, suite: 300, family: 220 };

const Booking = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    guestName:       '',
    email:           '',
    phone:           '',
    checkInDate:     '',
    checkOutDate:    '',
    roomType:        'deluxe',
    numberOfGuests:  1,
    numberOfRooms:   1,
    amenities:       [],
    freeAmenities:   [],
    amenityHours:    {},
    selectedRestaurant: false,
    selectedBar:        false,
    specialRequests: '',
    stayType:        'overnight',
  });

  // Room search state (receptionist-style)
  const [availableRooms,  setAvailableRooms]  = useState([]);
  const [selectedRoomIds, setSelectedRoomIds] = useState([]);
  const [searching,       setSearching]       = useState(false);
  const [searched,        setSearched]        = useState(false);
  const [roomSearchError, setRoomSearchError] = useState('');

  const [bookingStep, setBookingStep] = useState(1);
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState('');
  const [scrolled,    setScrolled]    = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const roomTypes = [
    { id: 'single', name: 'Single Room', priceNight: ROOM_PRICES.single, priceDay: 50,  capacity: 1, description: 'Comfortable room for 1 guest with essential amenities' },
    { id: 'double', name: 'Double Room', priceNight: ROOM_PRICES.double, priceDay: 60,  capacity: 2, description: 'Elegant room for 2 guests with premium comfort' },
    { id: 'deluxe', name: 'Deluxe Room', priceNight: ROOM_PRICES.deluxe, priceDay: 75,  capacity: 3, description: 'Spacious room with upgraded furnishings and amenities' },
    { id: 'suite',  name: 'Suite',       priceNight: ROOM_PRICES.suite,  priceDay: 125, capacity: 4, description: 'Luxurious suite with separate living area and panoramic views' },
    { id: 'family', name: 'Family Room', priceNight: ROOM_PRICES.family, priceDay: 90,  capacity: 4, description: 'Generously sized for families with multiple sleeping arrangements' },
  ];

  const amenitiesOptions = [
    { id: 'wifi',       name: 'WiFi',        icon: <Wifi size={20}/>,            type: 'free',  price: 0,  pricingModel: 'flat',   description: 'Complimentary' },
    { id: 'pool',       name: 'Pool Access', icon: <Waves size={20}/>,           type: 'paid',  price: 15, pricingModel: 'hourly', description: '$15 / hour' },
    { id: 'spa',        name: 'Spa',         icon: <Droplets size={20}/>,        type: 'paid',  price: 25, pricingModel: 'hourly', description: '$25 / hour' },
    { id: 'gym',        name: 'Gym',         icon: <Dumbbell size={20}/>,        type: 'paid',  price: 10, pricingModel: 'hourly', description: '$10 / hour' },
    { id: 'restaurant', name: 'Restaurant',  icon: <UtensilsCrossed size={20}/>, type: 'paid',  price: 30, pricingModel: 'daily',  description: '$30 / day' },
    { id: 'bar',        name: 'Bar',         icon: <Wine size={20}/>,            type: 'paid',  price: 20, pricingModel: 'daily',  description: '$20 / day' },
  ];

  const isSameDayStay = () => {
    if (!formData.checkInDate || !formData.checkOutDate) return false;
    return formData.checkInDate === formData.checkOutDate;
  };

  useEffect(() => {
    setFormData(prev => ({ ...prev, stayType: isSameDayStay() ? 'daytime' : 'overnight' }));
  }, [formData.checkInDate, formData.checkOutDate]);

  // ── Reset room search when dates or type change ──────────────
  const resetRoomSearch = () => {
    setSearched(false);
    setAvailableRooms([]);
    setSelectedRoomIds([]);
    setRoomSearchError('');
  };

  // ── Manual room search (receptionist-style) ──────────────────
  const searchRooms = async () => {
    if (!formData.checkInDate || !formData.checkOutDate) return;
    setSearching(true);
    setRoomSearchError('');
    try {
      const res = await axios.get(`${API}/reservations/available`, {
        params: {
          roomType:     formData.roomType,
          checkInDate:  formData.checkInDate,
          checkOutDate: formData.checkOutDate,
        },
      });
      const rooms = res.data.data || [];
      setAvailableRooms(rooms);
      setSearched(true);
      if (rooms.length > 0) {
        setFormData(prev => ({ ...prev, freeAmenities: rooms[0].amenities || [] }));
      }
    } catch {
      setRoomSearchError('Unable to fetch available rooms. Please try again.');
      setSearched(true);
    } finally {
      setSearching(false);
    }
  };

  // ── Toggle room chip selection ───────────────────────────────
  const toggleRoom = (room) => {
    setSelectedRoomIds(prev => {
      const already = prev.includes(room._id);
      return already ? prev.filter(id => id !== room._id) : [...prev, room._id];
    });
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleAmenityToggle = (amenityId) => {
    const amenity = amenitiesOptions.find(a => a.id === amenityId);
    if (amenity.type === 'free') return;
    if (amenity.pricingModel === 'hourly') {
      setFormData(prev => {
        const isSelected = prev.amenities.includes(amenityId);
        if (isSelected) {
          const updatedHours = { ...prev.amenityHours };
          delete updatedHours[amenityId];
          return { ...prev, amenities: prev.amenities.filter(id => id !== amenityId), amenityHours: updatedHours };
        }
        return { ...prev, amenities: [...prev.amenities, amenityId], amenityHours: { ...prev.amenityHours, [amenityId]: 1 } };
      });
    } else if (amenity.pricingModel === 'daily') {
      setFormData(prev => {
        if (amenityId === 'restaurant') return { ...prev, selectedRestaurant: !prev.selectedRestaurant };
        if (amenityId === 'bar')        return { ...prev, selectedBar: !prev.selectedBar };
        return prev;
      });
    }
  };

  const handleAmenityHoursChange = (amenityId, hours) => {
    const num = parseInt(hours) || 0;
    if (num >= 0) setFormData(prev => ({ ...prev, amenityHours: { ...prev.amenityHours, [amenityId]: num } }));
  };

  const getNumberOfNights = () => {
    if (!formData.checkInDate || !formData.checkOutDate) return 0;
    return Math.max(0, Math.ceil((new Date(formData.checkOutDate) - new Date(formData.checkInDate)) / 86400000));
  };

  const calculateAmenitiesBreakdown = () => {
    let breakdown = {};
    const nights = getNumberOfNights();
    formData.amenities.forEach(amenityId => {
      const amenity = amenitiesOptions.find(a => a.id === amenityId);
      const hours = formData.amenityHours[amenityId] || 0;
      if (amenity?.pricingModel === 'hourly') {
        breakdown[amenityId] = { name: amenity.name, price: amenity.price, quantity: hours, unit: 'hours', subtotal: amenity.price * hours };
      }
    });
    if (formData.selectedRestaurant) {
      const a = amenitiesOptions.find(a => a.id === 'restaurant');
      breakdown['restaurant'] = { name: a.name, price: a.price, quantity: nights, unit: 'days', subtotal: a.price * nights };
    }
    if (formData.selectedBar) {
      const a = amenitiesOptions.find(a => a.id === 'bar');
      breakdown['bar'] = { name: a.name, price: a.price, quantity: nights, unit: 'days', subtotal: a.price * nights };
    }
    return breakdown;
  };

  const calculateTotalPrice = () => {
    const nights = getNumberOfNights();
    const roomPrice = isSameDayStay()
      ? (selectedRoom?.priceDay || 0) * selectedRoomIds.length
      : ROOM_PRICES[formData.roomType] * nights * (selectedRoomIds.length || 1);
    const amenitiesPrice = Object.values(calculateAmenitiesBreakdown()).reduce((s, i) => s + i.subtotal, 0);
    return roomPrice + amenitiesPrice;
  };

  const handleNextStep = () => {
    if (bookingStep === 1) {
      if (!formData.checkInDate || !formData.checkOutDate) { setError('Please select check-in and check-out dates'); return; }
      if (!searched)                                        { setError('Please search for available rooms first'); return; }
      if (selectedRoomIds.length === 0)                    { setError('Please select at least one room'); return; }
    }
    if (bookingStep === 2) {
      if (!formData.guestName || !formData.email || !formData.phone) { setError('Please fill in all required fields'); return; }
    }
    setError('');
    if (bookingStep < 3) setBookingStep(bookingStep + 1);
  };

  const handlePreviousStep = () => { if (bookingStep > 1) setBookingStep(bookingStep - 1); };

  const handleSubmitBooking = async () => {
    try {
      setLoading(true);
      setError('');
      const bookingData = {
        guestName:        formData.guestName,
        email:            formData.email,
        phone:            formData.phone,
        checkInDate:      formData.checkInDate,
        checkOutDate:     formData.checkOutDate,
        roomIds:          selectedRoomIds,
        roomType:         formData.roomType,
        numberOfGuests:   formData.numberOfGuests,
        numberOfRooms:    selectedRoomIds.length,
        freeAmenities:    formData.freeAmenities,
        paidAmenities:    formData.amenities,
        amenityHours:     formData.amenityHours,
        selectedRestaurant: formData.selectedRestaurant,
        selectedBar:        formData.selectedBar,
        specialRequests:  formData.specialRequests,
        stayType:         formData.stayType,
        totalPrice:       calculateTotalPrice(),
        amenitiesBreakdown: calculateAmenitiesBreakdown(),
      };
      const response = await axios.post(`${API}/reservations`, bookingData);
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

  const selectedRoom       = roomTypes.find(r => r.id === formData.roomType);
  const totalPrice         = calculateTotalPrice();
  const amenitiesBreakdown = calculateAmenitiesBreakdown();
  const nights             = getNumberOfNights();

  const isAmenityActive = (id) =>
    id === 'restaurant' ? formData.selectedRestaurant :
    id === 'bar'        ? formData.selectedBar :
    formData.amenities.includes(id);

  // Selected room objects for display
  const selectedRoomObjects = availableRooms.filter(r => selectedRoomIds.includes(r._id));

  const STEPS = ['Select Room', 'Guest Details', 'Confirm'];

  return (
    <div className="bp-page">

      {/* ── Header ──────────────────────────────────────────── */}
      <header className={`bp-header ${scrolled ? 'bp-header--scrolled' : ''}`}>
        <div className="bp-header-inner">
          <button className="bp-back-btn" onClick={() => navigate('/')}>
            <ArrowLeft size={16}/>
            Back to Home
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

      {/* ── Hero Band ────────────────────────────────────────── */}
      <div className="bp-hero-band">
        <div className="bp-hero-inner">
          <div className="bp-hero-eyebrow">
            <span className="bp-eyebrow-line"/>
            Reserve Your Experience
            <span className="bp-eyebrow-line"/>
          </div>
          <h2 className="bp-hero-title">Your Perfect Stay<br/><em>Awaits You</em></h2>
        </div>
      </div>

      {/* ── Progress Steps ──────────────────────────────────── */}
      <div className="bp-steps-bar">
        <div className="bp-steps">
          {STEPS.map((label, idx) => {
            const num   = idx + 1;
            const state = bookingStep > num ? 'done' : bookingStep === num ? 'active' : 'idle';
            return (
              <React.Fragment key={num}>
                <div className={`bp-step bp-step--${state}`}>
                  <div className="bp-step-circle">
                    {state === 'done' ? <Check size={14}/> : num}
                  </div>
                  <span className="bp-step-label">{label}</span>
                </div>
                {idx < STEPS.length - 1 && (
                  <div className={`bp-step-connector ${bookingStep > num ? 'bp-step-connector--done' : ''}`}/>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* ── Main Content ─────────────────────────────────────── */}
      <div className="bp-content">

        {error && (
          <div className="bp-error-banner">
            <span>{error}</span>
            <button onClick={() => setError('')}>✕</button>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════
            STEP 1: Select Room
        ══════════════════════════════════════════════════════ */}
        {bookingStep === 1 && (
          <div className="bp-card">
            <div className="bp-card-header">
              <div className="bp-card-eyebrow">
                <span className="bp-eyebrow-line"/>
                Step 1 of 3
              </div>
              <h2 className="bp-card-title">Select Your Room</h2>
            </div>

            {/* ── Dates + Guests ── */}
            <div className="bp-section">
              <h3 className="bp-section-title">Stay Dates</h3>
              <div className="bp-form-row-2">
                <div className="bp-form-group">
                  <label className="bp-label"><Calendar size={12}/> Check-in Date</label>
                  <input className="bp-input" type="date" name="checkInDate" value={formData.checkInDate}
                    onChange={e => { handleInputChange(e); resetRoomSearch(); }}/>
                </div>
                <div className="bp-form-group">
                  <label className="bp-label"><Calendar size={12}/> Check-out Date</label>
                  <input className="bp-input" type="date" name="checkOutDate" value={formData.checkOutDate}
                    onChange={e => { handleInputChange(e); resetRoomSearch(); }}/>
                </div>
              </div>

              {formData.checkInDate && formData.checkOutDate && (
                <div className={`bp-stay-badge ${isSameDayStay() ? 'bp-stay-badge--day' : 'bp-stay-badge--night'}`}>
                  {isSameDayStay() ? <Sun size={15}/> : <Moon size={15}/>}
                  {isSameDayStay() ? 'Day-time Stay' : `Overnight Stay — ${nights} night${nights !== 1 ? 's' : ''}`}
                </div>
              )}

              <div className="bp-form-row-2" style={{ marginTop: '1.25rem' }}>
                <div className="bp-form-group">
                  <label className="bp-label"><Users size={12}/> Number of Guests</label>
                  <input className="bp-input" type="number" name="numberOfGuests" value={formData.numberOfGuests}
                    onChange={handleInputChange} min="1" max="10"/>
                </div>
              </div>
            </div>

            {/* ── Room Type Grid ── */}
            <div className="bp-section">
              <h3 className="bp-section-title"><BedDouble size={12}/> Room Type</h3>
              <div className="bp-room-type-grid">
                {roomTypes.map(room => (
                  <div
                    key={room.id}
                    className={`bp-room-type-card ${formData.roomType === room.id ? 'bp-room-type-card--selected' : ''}`}
                    onClick={() => {
                      setFormData(prev => ({ ...prev, roomType: room.id }));
                      resetRoomSearch();
                      setError('');
                    }}
                  >
                    {formData.roomType === room.id && (
                      <div className="bp-room-type-selected-badge"><Check size={12}/></div>
                    )}
                    <div className="bp-room-type-name">{room.name}</div>
                    <div className="bp-room-type-desc">{room.description}</div>
                    <div className="bp-room-type-capacity">
                      <Users size={13}/>
                      Up to {room.capacity} guests
                    </div>
                    <div className="bp-room-type-price">
                      ${isSameDayStay() ? room.priceDay : room.priceNight}
                      <span>/{isSameDayStay() ? 'day' : 'night'}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Room Search / Picker ── */}
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
                      ? <><Loader size={15} className="bp-spinner"/> Searching…</>
                      : <><Search size={15}/> Search Available Rooms</>}
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
                      &nbsp;·&nbsp; {selectedRoom?.name}
                      &nbsp;·&nbsp; {formData.checkInDate} → {formData.checkOutDate}
                    </span>
                    <button
                      className="bp-re-search-btn"
                      onClick={resetRoomSearch}
                    >
                      ↺ Re-search
                    </button>
                  </div>

                  {roomSearchError && (
                    <div className="bp-error-banner" style={{ marginBottom: '1rem' }}>
                      <span>{roomSearchError}</span>
                    </div>
                  )}

                  {availableRooms.length === 0 ? (
                    <div className="bp-no-rooms">
                      No rooms available for the selected dates and type.
                    </div>
                  ) : (
                    <>
                      {selectedRoomIds.length > 0 && (
                        <div className="bp-select-hint">
                          {selectedRoomIds.length} room{selectedRoomIds.length > 1 ? 's' : ''} selected
                          — click to deselect
                        </div>
                      )}
                      <div className="bp-rooms-grid">
                        {availableRooms.map(room => {
                          const sel = selectedRoomIds.includes(room._id);
                          return (
                            <div
                              key={room._id}
                              className={`bp-room-card ${sel ? 'bp-room-card--selected' : ''}`}
                              onClick={() => toggleRoom(room)}
                            >
                              {sel && <div className="bp-room-check"><Check size={14}/></div>}
                              <div className="bp-room-number">Room {room.roomNumber}</div>
                              <div className="bp-room-floor">Floor {room.floor}</div>
                              {room.amenities?.length > 0 && (
                                <div className="bp-room-amenity-pill">✨ {room.amenities.length} amenities</div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}

                  {selectedRoomIds.length > 0 && nights > 0 && (
                    <div className="bp-price-preview">
                      <CreditCard size={14}/>
                      <span>
                        Room subtotal: <strong>${(ROOM_PRICES[formData.roomType] * nights * selectedRoomIds.length).toLocaleString()}</strong>
                        {' '}({nights} night{nights !== 1 ? 's' : ''} × {selectedRoomIds.length} room{selectedRoomIds.length > 1 ? 's' : ''} × ${ROOM_PRICES[formData.roomType]}/night)
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ── Free Amenities ── */}
            {formData.freeAmenities.length > 0 && (
              <div className="bp-section">
                <h3 className="bp-section-title">Complimentary Amenities</h3>
                <div className="bp-free-amenities">
                  {formData.freeAmenities.map(name => (
                    <div key={name} className="bp-free-amenity-item">
                      <Check size={14}/>
                      {name}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Optional Amenities ── */}
            <div className="bp-section">
              <h3 className="bp-section-title">Optional Amenities</h3>
              <div className="bp-amenities-grid">
                {amenitiesOptions.filter(a => a.type === 'paid').map(amenity => {
                  const active = isAmenityActive(amenity.id);
                  return (
                    <div key={amenity.id} className={`bp-amenity-card ${active ? 'bp-amenity-card--active' : ''}`}>
                      <div className="bp-amenity-toggle" onClick={() => handleAmenityToggle(amenity.id)}>
                        <div className="bp-amenity-icon">{amenity.icon}</div>
                        <div className="bp-amenity-info">
                          <div className="bp-amenity-name">{amenity.name}</div>
                          <div className="bp-amenity-price-label">{amenity.description}</div>
                        </div>
                        <div className={`bp-amenity-check ${active ? 'bp-amenity-check--on' : ''}`}>
                          {active && <Check size={12}/>}
                        </div>
                      </div>
                      {amenity.pricingModel === 'hourly' && active && (
                        <div className="bp-amenity-hours">
                          <label>Hours</label>
                          <div className="bp-amenity-hours-row">
                            <input
                              className="bp-input bp-input--sm"
                              type="number" min="1" max="24"
                              value={formData.amenityHours[amenity.id] || 1}
                              onChange={e => handleAmenityHoursChange(amenity.id, e.target.value)}
                            />
                            <span className="bp-amenity-subtotal">
                              = ${amenity.price * (formData.amenityHours[amenity.id] || 1)}
                            </span>
                          </div>
                        </div>
                      )}
                      {amenity.pricingModel === 'daily' && active && (
                        <div className="bp-amenity-daily-info">
                          {nights} day{nights !== 1 ? 's' : ''} × ${amenity.price} = <strong>${amenity.price * nights}</strong>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ── Price Summary ── */}
            {formData.checkInDate && formData.checkOutDate && selectedRoomIds.length > 0 && (
              <div className="bp-section">
                <div className="bp-price-summary">
                  <div className="bp-price-summary-header">Price Summary</div>
                  <div className="bp-price-row">
                    <span>
                      {selectedRoom?.name} × {selectedRoomIds.length} room{selectedRoomIds.length > 1 ? 's' : ''}
                    </span>
                    <span>
                      {isSameDayStay()
                        ? `$${selectedRoom?.priceDay} /day`
                        : `${selectedRoomIds.length} × $${ROOM_PRICES[formData.roomType]} × ${nights} night${nights !== 1 ? 's' : ''}`}
                    </span>
                  </div>
                  {Object.entries(amenitiesBreakdown).map(([key, item]) => (
                    <div key={key} className="bp-price-row bp-price-row--muted">
                      <span>{item.name} ({item.quantity} {item.unit})</span>
                      <span>${item.subtotal}</span>
                    </div>
                  ))}
                  <div className="bp-price-row bp-price-row--total">
                    <span>Total</span>
                    <span>${totalPrice.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════
            STEP 2: Guest Details
        ══════════════════════════════════════════════════════ */}
        {bookingStep === 2 && (
          <div className="bp-card">
            <div className="bp-card-header">
              <div className="bp-card-eyebrow">
                <span className="bp-eyebrow-line"/>
                Step 2 of 3
              </div>
              <h2 className="bp-card-title">Your Details</h2>
            </div>

            <div className="bp-section">
              <h3 className="bp-section-title">Personal Information</h3>
              <div className="bp-form-group">
                <label className="bp-label">Full Name <span className="bp-required">*</span></label>
                <input className="bp-input" type="text" name="guestName" value={formData.guestName}
                  onChange={handleInputChange} placeholder="Enter your full name"/>
              </div>
              <div className="bp-form-row-2">
                <div className="bp-form-group">
                  <label className="bp-label">Email Address <span className="bp-required">*</span></label>
                  <input className="bp-input" type="email" name="email" value={formData.email}
                    onChange={handleInputChange} placeholder="your@email.com"/>
                </div>
                <div className="bp-form-group">
                  <label className="bp-label">Phone Number <span className="bp-required">*</span></label>
                  <input className="bp-input" type="tel" name="phone" value={formData.phone}
                    onChange={handleInputChange} placeholder="+1 (000) 000-0000"/>
                </div>
              </div>
              <div className="bp-form-group">
                <label className="bp-label">Special Requests</label>
                <textarea className="bp-input bp-textarea" name="specialRequests" value={formData.specialRequests}
                  onChange={handleInputChange} placeholder="Any special requests or preferences for your stay?" rows="4"/>
              </div>
            </div>

            {/* Booking recap */}
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
                  <div className="bp-recap-label">Room</div>
                  <div className="bp-recap-val">{selectedRoom?.name}</div>
                </div>
                <div className="bp-recap-item">
                  <div className="bp-recap-label">Total</div>
                  <div className="bp-recap-val bp-recap-val--gold">${totalPrice.toLocaleString()}</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════
            STEP 3: Confirm
        ══════════════════════════════════════════════════════ */}
        {bookingStep === 3 && (
          <div className="bp-card">
            <div className="bp-card-header">
              <div className="bp-card-eyebrow">
                <span className="bp-eyebrow-line"/>
                Step 3 of 3
              </div>
              <h2 className="bp-card-title">Confirm Your Booking</h2>
            </div>

            {/* Guest Info */}
            <div className="bp-section">
              <h3 className="bp-section-title">Guest Information</h3>
              <div className="bp-confirm-table">
                {[['Name', formData.guestName], ['Email', formData.email], ['Phone', formData.phone]].map(([label, val]) => (
                  <div key={label} className="bp-confirm-row">
                    <span className="bp-confirm-label">{label}</span>
                    <span className="bp-confirm-val">{val}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Stay Details */}
            <div className="bp-section">
              <h3 className="bp-section-title">Stay Details</h3>
              <div className="bp-confirm-table">
                {[
                  ['Check-in',    formData.checkInDate],
                  ['Check-out',   formData.checkOutDate],
                  ['Stay Type',   isSameDayStay() ? 'Day-time Stay' : `Overnight Stay (${nights} night${nights !== 1 ? 's' : ''})`],
                  ['Room Type',   selectedRoom?.name],
                  ['Rooms',       selectedRoomObjects.map(r => `#${r.roomNumber} (Floor ${r.floor})`).join(', ')],
                  ['Guests',      formData.numberOfGuests],
                  ['Rate',        `$${ROOM_PRICES[formData.roomType]}/night`],
                ].map(([label, val]) => (
                  <div key={label} className="bp-confirm-row">
                    <span className="bp-confirm-label">{label}</span>
                    <span className="bp-confirm-val">{val}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Free Amenities */}
            {formData.freeAmenities.length > 0 && (
              <div className="bp-section">
                <h3 className="bp-section-title">Complimentary Amenities</h3>
                <div className="bp-tags">
                  {formData.freeAmenities.map((a, i) => (
                    <div key={i} className="bp-tag bp-tag--green"><Check size={12}/>{a}</div>
                  ))}
                </div>
              </div>
            )}

            {/* Paid Amenities */}
            {Object.keys(amenitiesBreakdown).length > 0 && (
              <div className="bp-section">
                <h3 className="bp-section-title">Selected Amenities</h3>
                <div className="bp-tags">
                  {Object.entries(amenitiesBreakdown).map(([key, item]) => (
                    <div key={key} className="bp-tag bp-tag--gold">
                      {item.name} · {item.quantity} {item.unit} · ${item.subtotal}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Price Breakdown */}
            <div className="bp-section">
              <h3 className="bp-section-title">Price Breakdown</h3>
              <div className="bp-price-summary">
                <div className="bp-price-row">
                  <span>
                    {selectedRoom?.name} × {selectedRoomIds.length} room{selectedRoomIds.length > 1 ? 's' : ''}
                    {!isSameDayStay() && ` × ${nights} night${nights !== 1 ? 's' : ''}`}
                  </span>
                  <span>
                    ${isSameDayStay()
                      ? (selectedRoom?.priceDay || 0) * selectedRoomIds.length
                      : ROOM_PRICES[formData.roomType] * selectedRoomIds.length * nights}
                  </span>
                </div>
                {Object.entries(amenitiesBreakdown).map(([key, item]) => (
                  <div key={key} className="bp-price-row bp-price-row--muted">
                    <span>{item.name} ({item.quantity} {item.unit} × ${item.price})</span>
                    <span>${item.subtotal}</span>
                  </div>
                ))}
                <div className="bp-price-row bp-price-row--total">
                  <span>Total Amount</span>
                  <span>${totalPrice.toLocaleString()}</span>
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

        {/* ── Navigation ───────────────────────────────────────── */}
        <div className="bp-nav">
          <button className="bp-btn bp-btn--secondary" onClick={handlePreviousStep} disabled={bookingStep === 1}>
            ← Previous
          </button>

          {bookingStep < 3 ? (
            <button className="bp-btn bp-btn--primary" onClick={handleNextStep} disabled={loading}>
              {loading ? <><Loader size={16} className="bp-spinner"/> Loading…</> : <>Next <ChevronRight size={16}/></>}
            </button>
          ) : (
            <button className="bp-btn bp-btn--gold" onClick={handleSubmitBooking} disabled={loading}>
              {loading ? <><Loader size={16} className="bp-spinner"/> Submitting…</> : 'Complete Booking'}
            </button>
          )}
        </div>

      </div>
    </div>
  );
};

export default Booking;