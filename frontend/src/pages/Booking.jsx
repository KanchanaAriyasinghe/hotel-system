// frontend/src/pages/Booking.jsx

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Users, Calendar, Home, Wifi, Waves, Droplets, UtensilsCrossed, Wine, Dumbbell, Check, X } from 'lucide-react';
import axios from 'axios';
import './Booking.css';

const Booking = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    guestName: '',
    email: '',
    phone: '',
    checkInDate: '',
    checkOutDate: '',
    roomType: 'deluxe',
    numberOfGuests: 1,
    numberOfRooms: 1,
    selectedRooms: [],
    amenities: [], // Selected paid amenities
    freeAmenities: [], // Free amenities included with room
    amenityHours: {}, // Hours for amenities like pool, spa, gym
    selectedRestaurant: false,
    selectedBar: false,
    specialRequests: '',
    stayType: 'overnight',
  });

  const [bookingStep, setBookingStep] = useState(1);
  const [availableRooms, setAvailableRooms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const roomTypes = [
    { id: 'single', name: 'Single Room', priceNight: 100, priceDay: 50, capacity: 1, description: 'Comfortable room with basic amenities for 1 person' },
    { id: 'double', name: 'Double Room', priceNight: 120, priceDay: 60, capacity: 2, description: 'Comfortable room with basic amenities for 2 persons' },
    { id: 'deluxe', name: 'Deluxe Room', priceNight: 150, priceDay: 75, capacity: 3, description: 'Spacious room with premium amenities' },
    { id: 'suite', name: 'Suite', priceNight: 250, priceDay: 125, capacity: 4, description: 'Luxurious suite with separate living area' },
    { id: 'family', name: 'Family Room', priceNight: 180, priceDay: 90, capacity: 4, description: 'Perfect for families with multiple beds' },
  ];

  // Amenities with pricing
  const amenitiesOptions = [
    { id: 'wifi', name: 'WiFi', icon: <Wifi size={20} />, type: 'free', price: 0, pricingModel: 'flat' },
    { id: 'pool', name: 'Pool Access', icon: <Waves size={20} />, type: 'paid', price: 15, pricingModel: 'hourly', description: '$15 per hour' },
    { id: 'spa', name: 'Spa', icon: <Droplets size={20} />, type: 'paid', price: 25, pricingModel: 'hourly', description: '$25 per hour' },
    { id: 'gym', name: 'Gym', icon: <Dumbbell size={20} />, type: 'paid', price: 10, pricingModel: 'hourly', description: '$10 per hour' },
    { id: 'restaurant', name: 'Restaurant', icon: <UtensilsCrossed size={20} />, type: 'paid', price: 30, pricingModel: 'daily', description: '$30 per day of stay' },
    { id: 'bar', name: 'Bar', icon: <Wine size={20} />, type: 'paid', price: 20, pricingModel: 'daily', description: '$20 per day of stay' },
  ];

  // Check if stay is same day (daytime only)
  const isSameDayStay = () => {
    if (!formData.checkInDate || !formData.checkOutDate) return false;
    return formData.checkInDate === formData.checkOutDate;
  };

  // Update stay type when dates change
  useEffect(() => {
    if (isSameDayStay()) {
      setFormData(prev => ({ ...prev, stayType: 'daytime' }));
    } else {
      setFormData(prev => ({ ...prev, stayType: 'overnight' }));
    }
  }, [formData.checkInDate, formData.checkOutDate]);

  // Fetch available rooms when dates or room type changes
  useEffect(() => {
    if (formData.checkInDate && formData.checkOutDate && formData.roomType) {
      fetchAvailableRooms();
    }
  }, [formData.checkInDate, formData.checkOutDate, formData.roomType]);

  const fetchAvailableRooms = async () => {
    try {
      setLoading(true);
      setError('');
      
      const response = await axios.get(
        `${process.env.REACT_APP_API_URL}/rooms/available`,
        {
          params: {
            roomType: formData.roomType,
            checkInDate: formData.checkInDate,
            checkOutDate: formData.checkOutDate,
            stayType: isSameDayStay() ? 'daytime' : 'overnight',
          },
        }
      );

      setAvailableRooms(response.data.data || []);
      
      // Extract free amenities from first available room
      if (response.data.data && response.data.data.length > 0) {
        const freeAmenities = response.data.data[0].amenities || [];
        setFormData(prev => ({
          ...prev,
          freeAmenities: freeAmenities,
        }));
      }
      
      setLoading(false);
    } catch (err) {
      console.error('Error fetching available rooms:', err);
      setError('Unable to fetch available rooms. Please try again.');
      setAvailableRooms([]);
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleRoomSelect = (roomId) => {
    setFormData(prev => {
      const isSelected = prev.selectedRooms.includes(roomId);
      const updatedRooms = isSelected
        ? prev.selectedRooms.filter(id => id !== roomId)
        : [...prev.selectedRooms, roomId];

      if (updatedRooms.length <= prev.numberOfRooms) {
        return {
          ...prev,
          selectedRooms: updatedRooms,
        };
      }
      return prev;
    });
  };

  const handleAmenityToggle = (amenityId) => {
    const amenity = amenitiesOptions.find(a => a.id === amenityId);

    if (amenity.type === 'free') {
      // Free amenities don't need special handling
      return;
    }

    if (amenity.pricingModel === 'hourly') {
      setFormData(prev => {
        const isSelected = prev.amenities.includes(amenityId);
        
        if (isSelected) {
          const updatedAmenities = prev.amenities.filter(id => id !== amenityId);
          const updatedHours = { ...prev.amenityHours };
          delete updatedHours[amenityId];
          
          return {
            ...prev,
            amenities: updatedAmenities,
            amenityHours: updatedHours,
          };
        } else {
          return {
            ...prev,
            amenities: [...prev.amenities, amenityId],
            amenityHours: { ...prev.amenityHours, [amenityId]: 1 }, // Default 1 hour
          };
        }
      });
    } else if (amenity.pricingModel === 'daily') {
      setFormData(prev => {
        const isSelected = amenityId === 'restaurant' ? prev.selectedRestaurant : prev.selectedBar;
        
        if (amenityId === 'restaurant') {
          return { ...prev, selectedRestaurant: !isSelected };
        } else if (amenityId === 'bar') {
          return { ...prev, selectedBar: !isSelected };
        }
        return prev;
      });
    }
  };

  const handleAmenityHoursChange = (amenityId, hours) => {
    const numHours = parseInt(hours) || 0;
    if (numHours >= 0) {
      setFormData(prev => ({
        ...prev,
        amenityHours: { ...prev.amenityHours, [amenityId]: numHours },
      }));
    }
  };

  const handlePreviousStep = () => {
    if (bookingStep > 1) {
      setBookingStep(bookingStep - 1);
    }
  };

  const handleNextStep = () => {
    if (bookingStep === 1) {
      if (!formData.checkInDate || !formData.checkOutDate) {
        setError('Please select check-in and check-out dates');
        return;
      }
      if (formData.selectedRooms.length === 0) {
        setError('Please select at least one room');
        return;
      }
      setError('');
    }

    if (bookingStep === 2) {
      if (!formData.guestName || !formData.email || !formData.phone) {
        setError('Please fill in all required fields');
        return;
      }
      setError('');
    }

    if (bookingStep < 3) {
      setBookingStep(bookingStep + 1);
    }
  };

  const handleSubmitBooking = async () => {
    try {
      setLoading(true);
      setError('');

      const bookingData = {
        guestName: formData.guestName,
        email: formData.email,
        phone: formData.phone,
        checkInDate: formData.checkInDate,
        checkOutDate: formData.checkOutDate,
        roomIds: formData.selectedRooms,
        roomType: formData.roomType,
        numberOfGuests: formData.numberOfGuests,
        numberOfRooms: formData.numberOfRooms,
        freeAmenities: formData.freeAmenities,
        paidAmenities: formData.amenities,
        amenityHours: formData.amenityHours,
        selectedRestaurant: formData.selectedRestaurant,
        selectedBar: formData.selectedBar,
        specialRequests: formData.specialRequests,
        stayType: formData.stayType,
        totalPrice: calculateTotalPrice(),
        amenitiesBreakdown: calculateAmenitiesBreakdown(),
      };

      const response = await axios.post(
        `${process.env.REACT_APP_API_URL}/reservations`,
        bookingData
      );

      if (response.data.success) {
        alert('✅ Booking confirmed! Check your email for confirmation details.');
        navigate('/');
      } else {
        setError(response.data.message || 'Booking failed. Please try again.');
      }

      setLoading(false);
    } catch (err) {
      console.error('Booking error:', err);
      setError(err.response?.data?.message || 'Error submitting booking. Please try again.');
      setLoading(false);
    }
  };

  const selectedRoom = roomTypes.find(r => r.id === formData.roomType);

  const getNumberOfNights = () => {
    if (!formData.checkInDate || !formData.checkOutDate) return 0;
    const checkIn = new Date(formData.checkInDate);
    const checkOut = new Date(formData.checkOutDate);
    return Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24));
  };

  const calculateAmenitiesBreakdown = () => {
    let breakdown = {};
    
    // Hourly amenities
    formData.amenities.forEach(amenityId => {
      const amenity = amenitiesOptions.find(a => a.id === amenityId);
      const hours = formData.amenityHours[amenityId] || 0;
      if (amenity && amenity.pricingModel === 'hourly') {
        breakdown[amenityId] = {
          name: amenity.name,
          price: amenity.price,
          quantity: hours,
          unit: 'hours',
          subtotal: amenity.price * hours,
        };
      }
    });

    // Daily amenities (Restaurant & Bar)
    const nights = getNumberOfNights();
    if (formData.selectedRestaurant) {
      const restaurant = amenitiesOptions.find(a => a.id === 'restaurant');
      breakdown['restaurant'] = {
        name: restaurant.name,
        price: restaurant.price,
        quantity: nights,
        unit: 'days',
        subtotal: restaurant.price * nights,
      };
    }

    if (formData.selectedBar) {
      const bar = amenitiesOptions.find(a => a.id === 'bar');
      breakdown['bar'] = {
        name: bar.name,
        price: bar.price,
        quantity: nights,
        unit: 'days',
        subtotal: bar.price * nights,
      };
    }

    return breakdown;
  };

  const calculateTotalPrice = () => {
    if (!selectedRoom) return 0;

    let roomPrice = 0;
    
    // Calculate room price
    if (isSameDayStay()) {
      roomPrice = selectedRoom.priceDay * formData.numberOfRooms;
    } else {
      const nights = getNumberOfNights();
      roomPrice = selectedRoom.priceNight * formData.numberOfRooms * nights;
    }

    // Calculate amenities price
    let amenitiesPrice = 0;
    const breakdown = calculateAmenitiesBreakdown();
    
    Object.values(breakdown).forEach(item => {
      amenitiesPrice += item.subtotal;
    });

    return roomPrice + amenitiesPrice;
  };

  const totalPrice = calculateTotalPrice();
  const amenitiesBreakdown = calculateAmenitiesBreakdown();

  return (
    <div className="booking-page">
      {/* Header */}
      <header className="booking-header">
        <div className="booking-header-content">
          <button className="back-btn" onClick={() => navigate('/')}>
            <ArrowLeft size={24} />
            Back
          </button>
          <h1>🏨 Book Your Stay</h1>
          <p>Reserve your perfect room at our hotel</p>
        </div>
      </header>

      {/* Booking Container */}
      <div className="booking-container">
        {/* Progress Steps */}
        <div className="booking-steps">
          <div className={`step ${bookingStep >= 1 ? 'active' : ''}`}>
            <div className="step-number">1</div>
            <div className="step-title">Select Room</div>
          </div>
          <div className={`step ${bookingStep >= 2 ? 'active' : ''}`}>
            <div className="step-number">2</div>
            <div className="step-title">Guest Details</div>
          </div>
          <div className={`step ${bookingStep >= 3 ? 'active' : ''}`}>
            <div className="step-number">3</div>
            <div className="step-title">Confirm</div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="error-message">
            <p>{error}</p>
          </div>
        )}

        {/* Step 1: Room Selection */}
        {bookingStep === 1 && (
          <div className="booking-step">
            <h2>Step 1: Select Your Room</h2>
            
            {/* Date Selection */}
            <div className="booking-form-group">
              <label>Check-in Date</label>
              <input
                type="date"
                name="checkInDate"
                value={formData.checkInDate}
                onChange={handleInputChange}
                required
              />
            </div>

            <div className="booking-form-group">
              <label>Check-out Date</label>
              <input
                type="date"
                name="checkOutDate"
                value={formData.checkOutDate}
                onChange={handleInputChange}
                required
              />
            </div>

            {/* Stay Type Indicator */}
            {formData.checkInDate && formData.checkOutDate && (
              <div className="stay-type-indicator">
                <p style={{ fontSize: '14px', fontWeight: '500', color: '#555' }}>
                  📅 Stay Type: <span style={{ color: '#2ecc71', fontWeight: '600' }}>
                    {isSameDayStay() ? '☀️ Day-time Stay' : '🌙 Overnight Stay'}
                  </span>
                </p>
              </div>
            )}

            <div className="booking-form-row">
              <div className="booking-form-group">
                <label>Number of Guests</label>
                <input
                  type="number"
                  name="numberOfGuests"
                  value={formData.numberOfGuests}
                  onChange={handleInputChange}
                  min="1"
                  max="10"
                />
              </div>

              <div className="booking-form-group">
                <label>Number of Rooms</label>
                <input
                  type="number"
                  name="numberOfRooms"
                  value={formData.numberOfRooms}
                  onChange={handleInputChange}
                  min="1"
                  max="5"
                />
              </div>
            </div>

            {/* Room Type Selection */}
            <label>Room Type</label>
            <div className="room-type-grid">
              {roomTypes.map(room => (
                <div
                  key={room.id}
                  className={`room-type-card ${formData.roomType === room.id ? 'selected' : ''}`}
                  onClick={() => {
                    setFormData(prev => ({ ...prev, roomType: room.id, selectedRooms: [] }));
                    setError('');
                  }}
                >
                  <h3>{room.name}</h3>
                  <p className="room-description">{room.description}</p>
                  <div className="room-capacity">
                    <Users size={16} />
                    <span>Up to {room.capacity} guests</span>
                  </div>
                  <div className="room-price-display">
                    {isSameDayStay() ? (
                      <div>${room.priceDay} <span style={{ fontSize: '12px' }}>/day</span></div>
                    ) : (
                      <div>${room.priceNight} <span style={{ fontSize: '12px' }}>/night</span></div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Available Rooms Display */}
            {formData.checkInDate && formData.checkOutDate && (
              <div className="available-rooms-section">
                <h3>
                  Available {selectedRoom?.name}s
                  <span className="room-count"> ({availableRooms.length} available)</span>
                </h3>
                
                {loading && <p className="loading">Loading available rooms...</p>}
                
                {error && <p className="error">{error}</p>}
                
                {!loading && availableRooms.length > 0 ? (
                  <>
                    <p className="selection-info">
                      Select {formData.numberOfRooms} room{formData.numberOfRooms > 1 ? 's' : ''}
                      {formData.selectedRooms.length > 0 && ` (${formData.selectedRooms.length} selected)`}
                    </p>
                    <div className="available-rooms-grid">
                      {availableRooms.map(room => (
                        <div
                          key={room._id}
                          className={`room-availability-card ${formData.selectedRooms.includes(room._id) ? 'selected' : ''}`}
                          onClick={() => {
                            if (formData.selectedRooms.length < formData.numberOfRooms || formData.selectedRooms.includes(room._id)) {
                              handleRoomSelect(room._id);
                            }
                          }}
                        >
                          <div className="room-number">Room {room.roomNumber}</div>
                          <div className="room-floor">Floor {room.floor}</div>
                          <div className="room-amenities">
                            {room.amenities && room.amenities.length > 0 && (
                              <span className="amenity-count">✨ {room.amenities.length} free amenities</span>
                            )}
                          </div>
                          {formData.selectedRooms.includes(room._id) && (
                            <div className="selected-badge">
                              <Check size={24} />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  !loading && <p className="no-rooms">No rooms available for selected dates and type.</p>
                )}
              </div>
            )}

            {/* Free Amenities Display */}
            {formData.freeAmenities.length > 0 && (
              <div className="free-amenities-section">
                <h3>✨ Free Amenities Included with Your Room</h3>
                <div className="free-amenities-list">
                  {formData.freeAmenities.map(amenityName => (
                    <div key={amenityName} className="free-amenity-item">
                      <Check size={18} style={{ color: '#2ecc71' }} />
                      <span>{amenityName}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Paid Amenities Selection */}
            <div className="amenities-section">
              <h3>Add Optional Paid Amenities</h3>
              <div className="amenities-grid">
                {amenitiesOptions.filter(a => a.type === 'paid').map(amenity => (
                  <div key={amenity.id} className="amenity-card">
                    <div
                      className={`amenity-checkbox ${formData.amenities.includes(amenity.id) || (amenity.id === 'restaurant' && formData.selectedRestaurant) || (amenity.id === 'bar' && formData.selectedBar) ? 'checked' : ''}`}
                      onClick={() => handleAmenityToggle(amenity.id)}
                    >
                      <div className="amenity-icon">{amenity.icon}</div>
                      <div className="amenity-name">{amenity.name}</div>
                      <div className="amenity-price">{amenity.description}</div>
                    </div>

                    {/* Hours input for hourly amenities */}
                    {amenity.pricingModel === 'hourly' && formData.amenities.includes(amenity.id) && (
                      <div className="amenity-hours-input">
                        <label>Hours:</label>
                        <input
                          type="number"
                          min="1"
                          max="24"
                          value={formData.amenityHours[amenity.id] || 1}
                          onChange={(e) => handleAmenityHoursChange(amenity.id, e.target.value)}
                          placeholder="Enter hours"
                        />
                        <span className="hours-cost">${amenity.price * (formData.amenityHours[amenity.id] || 1)}</span>
                      </div>
                    )}

                    {/* Daily amenity info */}
                    {amenity.pricingModel === 'daily' && ((amenity.id === 'restaurant' && formData.selectedRestaurant) || (amenity.id === 'bar' && formData.selectedBar)) && (
                      <div className="daily-amenity-info">
                        <p>For {getNumberOfNights()} day{getNumberOfNights() > 1 ? 's' : ''} of stay</p>
                        <span className="daily-cost">${amenity.price * getNumberOfNights()}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Price Summary */}
            {formData.checkInDate && formData.checkOutDate && (
              <div className="price-summary">
                <div className="summary-row">
                  <span>Room Type:</span>
                  <span>{selectedRoom?.name}</span>
                </div>
                {isSameDayStay() ? (
                  <>
                    <div className="summary-row">
                      <span>Day-time Rate:</span>
                      <span>${selectedRoom?.priceDay}</span>
                    </div>
                    <div className="summary-row">
                      <span>Number of Rooms:</span>
                      <span>{formData.numberOfRooms}</span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="summary-row">
                      <span>Night-time Rate:</span>
                      <span>${selectedRoom?.priceNight}</span>
                    </div>
                    <div className="summary-row">
                      <span>Number of Rooms:</span>
                      <span>{formData.numberOfRooms}</span>
                    </div>
                    <div className="summary-row">
                      <span>Number of Nights:</span>
                      <span>{getNumberOfNights()}</span>
                    </div>
                  </>
                )}

                {/* Room subtotal */}
                <div className="summary-row" style={{ borderTop: '1px solid #ddd', paddingTop: '10px', marginTop: '10px' }}>
                  <span>Room Subtotal:</span>
                  <span>${isSameDayStay() ? selectedRoom?.priceDay * formData.numberOfRooms : selectedRoom?.priceNight * formData.numberOfRooms * getNumberOfNights()}</span>
                </div>

                {/* Amenities breakdown */}
                {Object.keys(amenitiesBreakdown).length > 0 && (
                  <>
                    <div style={{ borderTop: '1px solid #ddd', paddingTop: '10px', marginTop: '10px' }}>
                      <p style={{ fontWeight: '600', marginBottom: '8px' }}>Amenities:</p>
                      {Object.entries(amenitiesBreakdown).map(([key, item]) => (
                        <div key={key} className="summary-row" style={{ fontSize: '14px', color: '#666' }}>
                          <span>{item.name} ({item.quantity} {item.unit}):</span>
                          <span>${item.subtotal}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}

                <div className="summary-row total" style={{ marginTop: '15px', borderTop: '2px solid #333' }}>
                  <span>Total Price:</span>
                  <span>${totalPrice}</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 2: Guest Information */}
        {bookingStep === 2 && (
          <div className="booking-step">
            <h2>Step 2: Your Information</h2>

            <div className="booking-form-group">
              <label>Full Name *</label>
              <input
                type="text"
                name="guestName"
                value={formData.guestName}
                onChange={handleInputChange}
                placeholder="Enter your full name"
                required
              />
            </div>

            <div className="booking-form-group">
              <label>Email Address *</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="Enter your email"
                required
              />
            </div>

            <div className="booking-form-group">
              <label>Phone Number *</label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                placeholder="Enter your phone number"
                required
              />
            </div>

            <div className="booking-form-group">
              <label>Special Requests</label>
              <textarea
                name="specialRequests"
                value={formData.specialRequests}
                onChange={handleInputChange}
                placeholder="Any special requests for your stay?"
                rows="4"
              ></textarea>
            </div>
          </div>
        )}

        {/* Step 3: Confirmation */}
        {bookingStep === 3 && (
          <div className="booking-step">
            <h2>Step 3: Confirm Your Booking</h2>

            <div className="confirmation-section">
              <h3>Guest Information</h3>
              <div className="confirmation-details">
                <div className="detail-row">
                  <span className="label">Name:</span>
                  <span className="value">{formData.guestName}</span>
                </div>
                <div className="detail-row">
                  <span className="label">Email:</span>
                  <span className="value">{formData.email}</span>
                </div>
                <div className="detail-row">
                  <span className="label">Phone:</span>
                  <span className="value">{formData.phone}</span>
                </div>
              </div>

              <h3 style={{ marginTop: '2rem' }}>Room Details</h3>
              <div className="confirmation-details">
                <div className="detail-row">
                  <span className="label">Check-in:</span>
                  <span className="value">{formData.checkInDate}</span>
                </div>
                <div className="detail-row">
                  <span className="label">Check-out:</span>
                  <span className="value">{formData.checkOutDate}</span>
                </div>
                <div className="detail-row">
                  <span className="label">Stay Type:</span>
                  <span className="value">{isSameDayStay() ? '☀️ Day-time Stay' : '🌙 Overnight Stay'}</span>
                </div>
                <div className="detail-row">
                  <span className="label">Room Type:</span>
                  <span className="value">{selectedRoom?.name}</span>
                </div>
                <div className="detail-row">
                  <span className="label">Number of Rooms:</span>
                  <span className="value">{formData.numberOfRooms}</span>
                </div>
                <div className="detail-row">
                  <span className="label">Selected Rooms:</span>
                  <span className="value">{formData.selectedRooms.map(id => {
                    const room = availableRooms.find(r => r._id === id);
                    return room ? `${room.roomNumber}` : '';
                  }).join(', ')}</span>
                </div>
                <div className="detail-row">
                  <span className="label">Number of Guests:</span>
                  <span className="value">{formData.numberOfGuests}</span>
                </div>
              </div>

              {/* Free Amenities */}
              {formData.freeAmenities.length > 0 && (
                <>
                  <h3 style={{ marginTop: '2rem' }}>✨ Free Amenities Included</h3>
                  <div className="confirmation-amenities">
                    {formData.freeAmenities.map((amenity, idx) => (
                      <div key={idx} className="amenity-tag" style={{ backgroundColor: '#d4edda', color: '#155724' }}>
                        ✓ {amenity}
                      </div>
                    ))}
                  </div>
                </>
              )}

              {/* Paid Amenities */}
              {Object.keys(amenitiesBreakdown).length > 0 && (
                <>
                  <h3 style={{ marginTop: '2rem' }}>💳 Selected Paid Amenities</h3>
                  <div className="confirmation-amenities">
                    {Object.entries(amenitiesBreakdown).map(([key, item]) => (
                      <div key={key} className="amenity-tag">
                        {item.name} ({item.quantity} {item.unit}) - ${item.subtotal}
                      </div>
                    ))}
                  </div>
                </>
              )}

              <h3 style={{ marginTop: '2rem' }}>💰 Price Summary</h3>
              <div className="confirmation-price">
                {isSameDayStay() ? (
                  <>
                    <div className="price-row">
                      <span>Room Rate (Day-time):</span>
                      <span>${selectedRoom?.priceDay}/day</span>
                    </div>
                    <div className="price-row">
                      <span>Number of Rooms:</span>
                      <span>{formData.numberOfRooms}</span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="price-row">
                      <span>Room Rate (Night-time):</span>
                      <span>${selectedRoom?.priceNight}/night</span>
                    </div>
                    <div className="price-row">
                      <span>Number of Rooms:</span>
                      <span>{formData.numberOfRooms}</span>
                    </div>
                    <div className="price-row">
                      <span>Number of Nights:</span>
                      <span>{getNumberOfNights()}</span>
                    </div>
                  </>
                )}
                
                <div className="price-row" style={{ borderTop: '1px solid #ddd', paddingTop: '10px', marginTop: '10px' }}>
                  <span>Room Subtotal:</span>
                  <span>${isSameDayStay() ? selectedRoom?.priceDay * formData.numberOfRooms : selectedRoom?.priceNight * formData.numberOfRooms * getNumberOfNights()}</span>
                </div>

                {/* Amenities breakdown */}
                {Object.keys(amenitiesBreakdown).length > 0 && (
                  <>
                    <div style={{ borderTop: '1px solid #ddd', paddingTop: '10px', marginTop: '10px' }}>
                      <p style={{ fontWeight: '600', marginBottom: '8px' }}>Amenities:</p>
                      {Object.entries(amenitiesBreakdown).map(([key, item]) => (
                        <div key={key} className="price-row" style={{ fontSize: '14px', color: '#666' }}>
                          <span>{item.name} ({item.quantity} {item.unit} × ${item.price}):</span>
                          <span>${item.subtotal}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}

                <div className="price-row total" style={{ marginTop: '15px', borderTop: '2px solid #333', fontSize: '18px' }}>
                  <span>Total Amount:</span>
                  <span>${totalPrice}</span>
                </div>
              </div>

              {formData.specialRequests && (
                <div className="special-requests">
                  <h3>📝 Special Requests</h3>
                  <p>{formData.specialRequests}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="booking-navigation">
          <button
            className="btn btn-secondary"
            onClick={handlePreviousStep}
            disabled={bookingStep === 1}
          >
            Previous
          </button>

          {bookingStep < 3 ? (
            <button
              className="btn btn-primary"
              onClick={handleNextStep}
              disabled={loading}
            >
              {loading ? 'Loading...' : 'Next'}
            </button>
          ) : (
            <button
              className="btn btn-primary"
              onClick={handleSubmitBooking}
              disabled={loading}
            >
              {loading ? 'Submitting...' : 'Complete Booking'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Booking;