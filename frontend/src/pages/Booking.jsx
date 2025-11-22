// frontend/src/pages/Booking.jsx

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, MapPin, Users, Calendar, Home, Wifi, Waves, Droplets, UtensilsCrossed, Wine, Dumbbell } from 'lucide-react';
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
    amenities: [],
    specialRequests: '',
  });

  const [bookingStep, setBookingStep] = useState(1); // Step 1: Room Selection, Step 2: Guest Info, Step 3: Confirmation

  const roomTypes = [
    { id: 'standard', name: 'Standard Room', price: 100, capacity: 2, description: 'Comfortable room with basic amenities' },
    { id: 'deluxe', name: 'Deluxe Room', price: 150, capacity: 2, description: 'Spacious room with premium amenities' },
    { id: 'suite', name: 'Suite', price: 250, capacity: 4, description: 'Luxurious suite with separate living area' },
    { id: 'family', name: 'Family Room', price: 180, capacity: 4, description: 'Perfect for families with multiple beds' },
  ];

  const amenitiesOptions = [
    { id: 'wifi', name: 'WiFi', icon: <Wifi size={20} /> },
    { id: 'pool', name: 'Pool Access', icon: <Waves size={20} /> },
    { id: 'spa', name: 'Spa', icon: <Droplets size={20} /> },
    { id: 'restaurant', name: 'Restaurant', icon: <UtensilsCrossed size={20} /> },
    { id: 'bar', name: 'Bar', icon: <Wine size={20} /> },
    { id: 'gym', name: 'Gym', icon: <Dumbbell size={20} /> },
  ];

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleAmenityToggle = (amenityId) => {
    setFormData(prev => ({
      ...prev,
      amenities: prev.amenities.includes(amenityId)
        ? prev.amenities.filter(id => id !== amenityId)
        : [...prev.amenities, amenityId],
    }));
  };

  const handlePreviousStep = () => {
    if (bookingStep > 1) {
      setBookingStep(bookingStep - 1);
    }
  };

  const handleNextStep = () => {
    if (bookingStep < 3) {
      setBookingStep(bookingStep + 1);
    }
  };

  const handleSubmitBooking = () => {
    console.log('Booking submitted:', formData);
    alert('Booking request submitted! We will confirm your reservation shortly.');
    navigate('/');
  };

  const selectedRoom = roomTypes.find(r => r.id === formData.roomType);
  const totalPrice = selectedRoom ? selectedRoom.price * formData.numberOfRooms : 0;

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

            {/* Room Selection */}
            <label>Room Type</label>
            <div className="room-selection-grid">
              {roomTypes.map(room => (
                <div
                  key={room.id}
                  className={`room-card ${formData.roomType === room.id ? 'selected' : ''}`}
                  onClick={() => setFormData(prev => ({ ...prev, roomType: room.id }))}
                >
                  <div className="room-icon">
                    <Home size={32} />
                  </div>
                  <h3>{room.name}</h3>
                  <p className="room-description">{room.description}</p>
                  <div className="room-capacity">
                    <Users size={16} />
                    <span>Up to {room.capacity} guests</span>
                  </div>
                  <div className="room-price">${room.price}/night</div>
                </div>
              ))}
            </div>

            {/* Amenities Selection */}
            <div className="amenities-section">
              <h3>Select Additional Amenities</h3>
              <div className="amenities-grid">
                {amenitiesOptions.map(amenity => (
                  <div
                    key={amenity.id}
                    className={`amenity-checkbox ${formData.amenities.includes(amenity.id) ? 'checked' : ''}`}
                    onClick={() => handleAmenityToggle(amenity.id)}
                  >
                    <input
                      type="checkbox"
                      checked={formData.amenities.includes(amenity.id)}
                      onChange={() => {}}
                      style={{ display: 'none' }}
                    />
                    <div className="amenity-icon">{amenity.icon}</div>
                    <div className="amenity-name">{amenity.name}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Price Summary */}
            <div className="price-summary">
              <div className="summary-row">
                <span>Room Type:</span>
                <span>{selectedRoom?.name}</span>
              </div>
              <div className="summary-row">
                <span>Price per Night:</span>
                <span>${selectedRoom?.price}</span>
              </div>
              <div className="summary-row">
                <span>Number of Rooms:</span>
                <span>{formData.numberOfRooms}</span>
              </div>
              <div className="summary-row total">
                <span>Total Price:</span>
                <span>${totalPrice * formData.numberOfRooms}</span>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Guest Information */}
        {bookingStep === 2 && (
          <div className="booking-step">
            <h2>Step 2: Your Information</h2>

            <div className="booking-form-group">
              <label>Full Name</label>
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
              <label>Email Address</label>
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
              <label>Phone Number</label>
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
              <h3>Booking Details</h3>
              <div className="confirmation-details">
                <div className="detail-row">
                  <span className="label">Guest Name:</span>
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
                  <span className="label">Room Type:</span>
                  <span className="value">{selectedRoom?.name}</span>
                </div>
                <div className="detail-row">
                  <span className="label">Number of Rooms:</span>
                  <span className="value">{formData.numberOfRooms}</span>
                </div>
                <div className="detail-row">
                  <span className="label">Number of Guests:</span>
                  <span className="value">{formData.numberOfGuests}</span>
                </div>
              </div>

              {formData.amenities.length > 0 && (
                <>
                  <h3 style={{ marginTop: '2rem' }}>Selected Amenities</h3>
                  <div className="confirmation-amenities">
                    {formData.amenities.map(amenityId => {
                      const amenity = amenitiesOptions.find(a => a.id === amenityId);
                      return (
                        <div key={amenityId} className="amenity-tag">
                          {amenity?.name}
                        </div>
                      );
                    })}
                  </div>
                </>
              )}

              <h3 style={{ marginTop: '2rem' }}>Price Summary</h3>
              <div className="confirmation-price">
                <div className="price-row">
                  <span>Room Rate:</span>
                  <span>${selectedRoom?.price}/night</span>
                </div>
                <div className="price-row">
                  <span>Total Rooms:</span>
                  <span>{formData.numberOfRooms}</span>
                </div>
                <div className="price-row total">
                  <span>Total Amount:</span>
                  <span>${totalPrice * formData.numberOfRooms}</span>
                </div>
              </div>

              {formData.specialRequests && (
                <div className="special-requests">
                  <h3>Special Requests</h3>
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
            >
              Next
            </button>
          ) : (
            <button
              className="btn btn-primary"
              onClick={handleSubmitBooking}
            >
              Complete Booking
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Booking;