// frontend/src/pages/LandingPage.jsx - COMPLETE FILE

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Phone, MessageCircle, Mail, ChevronDown, X, Wifi, Waves, Droplets, UtensilsCrossed, Wine, Dumbbell, Users, Home, Heart, Star, Zap, Tv } from 'lucide-react';
import axios from 'axios';
import AuthModal from '../components/AuthModal';
import MapComponent from '../components/MapComponent';
import './LandingPage.css';
import hotel from "../assets/gallery/hotel.jpeg";
import pool from "../assets/gallery/pool.jpeg";
import resturent from "../assets/gallery/resturent.jpeg";
import spa from "../assets/gallery/spa.jpeg";
import background from "../assets/background.jpg";

// Icon mapping for different amenities
const amenityIcons = {
  'WiFi': <Wifi size={32} />,
  'wifi': <Wifi size={32} />,
  'Swimming Pool': <Waves size={32} />,
  'pool': <Waves size={32} />,
  'Spa': <Droplets size={32} />,
  'spa': <Droplets size={32} />,
  'Restaurant': <UtensilsCrossed size={32} />,
  'restaurant': <UtensilsCrossed size={32} />,
  'Bar': <Wine size={32} />,
  'bar': <Wine size={32} />,
  'Gym': <Dumbbell size={32} />,
  'gym': <Dumbbell size={32} />,
  'Family Rooms': <Users size={32} />,
  'family': <Users size={32} />,
  'Rooms': <Home size={32} />,
  'rooms': <Home size={32} />,
  'Premium': <Star size={32} />,
  'premium': <Star size={32} />,
  'Concierge': <Heart size={32} />,
  'concierge': <Heart size={32} />,
  'AC': <Zap size={32} />,
  'ac': <Zap size={32} />,
  'TV': <Tv size={32} />,
  'tv': <Tv size={32} />,
};

// Function to get icon for amenity
const getAmenityIcon = (amenity) => {
  return amenityIcons[amenity] || amenityIcons[amenity.toLowerCase()] || '✨';
};

const LandingPage = () => {
  const [hotelInfo, setHotelInfo] = useState(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authType, setAuthType] = useState('login');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHotelInfo();
  }, []);

  const fetchHotelInfo = async () => {
    try {
      const response = await axios.get(`${process.env.REACT_APP_API_URL}/hotel/info`);
      setHotelInfo(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching hotel info:', error);
      // Set default hotel info if API fails
      setHotelInfo({
        name: 'Luxury Hotel',
        description: 'Experience luxury and comfort at our 5-star hotel',
        email: 'info@luxuryhotel.com',
        phone: '+1 (555) 123-4567',
        whatsapp: '+15551234567',
        address: '123 Main Street',
        city: 'New York',
        latitude: 40.7128,
        longitude: -74.0060,
        images: [],
        amenities: ['WiFi', 'Swimming Pool', 'Spa', 'Restaurant', 'Bar', 'Gym'],
        checkInTime: '14:00',
        checkOutTime: '11:00',
        currency: 'USD'
      });
      setLoading(false);
    }
  };

  const handleAuthClick = (type) => {
    setAuthType(type);
    setShowAuthModal(true);
  };

  const handleGalleryClick = () => {
    // Navigate to gallery page
    window.location.href = '/gallery';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-purple-500 to-purple-900">
        <div className="text-white text-2xl font-bold">Loading...</div>
      </div>
    );
  }

  return (
    <div className="landing-page">
      {/* Navigation Bar */}
      <nav className="navbar">
        <div className="nav-container">
          <div className="nav-logo">
            <h1>🏨 {hotelInfo?.name || 'Hotel'}</h1>
          </div>
          <button 
            className="auth-nav-btn"
            onClick={() => handleAuthClick('login')}
          >
            Hotel Staff - Login / Register
          </button>
        </div>
      </nav>

      {/* Hero Section with Introduction */}
      <section className="hero-section" style={{backgroundImage: `url(${background})`, backgroundSize: 'cover', backgroundPosition: 'center'}}>
        <div className="hero-overlay"></div>
        <div className="hero-content">
          <h1 className="hero-title">{hotelInfo?.name || 'Welcome'}</h1>
          <p className="hero-subtitle">{hotelInfo?.description || 'Experience luxury and comfort'}</p>
          <div className="hero-buttons">
            
            <div className="btn btn-primary">
          <Link to="/booking" >
            Book Now
          </Link>
        </div>
            <button 
              className="btn btn-secondary"
              onClick={() => document.getElementById('amenities')?.scrollIntoView({ behavior: 'smooth' })}
            >
              Explore <ChevronDown size={20} />
            </button>
          </div>
        </div>
      </section>

      {/* Hotel Images Gallery Section - FIXED */}
      <section id="gallery" className="gallery-section">
        <h2>Our Gallery</h2>
        <div className="gallery-grid">
          {/* Card 1: Luxury Room - With Label */}
          <div className="gallery-item" onClick={handleGalleryClick}>
            <img src={hotel} alt="Luxury Room" />
            <div className="gallery-item-label">Luxury Room</div>
          </div>

          {/* Card 2: Swimming Pool - With Label */}
          <div className="gallery-item" onClick={handleGalleryClick}>
            <img src={pool} alt="Swimming Pool" />
            <div className="gallery-item-label">Swimming Pool</div>
          </div>

          {/* Card 3: Restaurant - With Label */}
          <div className="gallery-item" onClick={handleGalleryClick}>
            <img src={resturent} alt="Restaurant" />
            <div className="gallery-item-label">Restaurant</div>
          </div>

          {/* Card 4: Spa Center - With Label */}
          <div className="gallery-item" onClick={handleGalleryClick}>
            <img src={spa} alt="Spa Center" />
            <div className="gallery-item-label">Spa Center</div>
          </div>
        </div>

        {/* View Full Gallery Button */}
        <div className="gallery-action">
          <Link to="/gallery" className="view-gallery-btn">
            View Full Gallery
          </Link>
        </div>
      </section>

      {/* Amenities Section - WITH INDIVIDUAL ICONS */}
      <section id="amenities" className="amenities-section">
        <h2>Our Amenities</h2>
        <div className="amenities-grid">
          {hotelInfo?.amenities && hotelInfo.amenities.map((amenity, idx) => (
            <div key={idx} className="amenity-card">
              <div className="amenity-icon">
                {getAmenityIcon(amenity)}
              </div>
              <h3>{amenity}</h3>
            </div>
          ))}
        </div>
      </section>

      {/* Location Section with Free Map (Leaflet) */}
      <section id="location" className="location-section">
        <div className="location-container">
          <div className="map-wrapper">
            <h2>Our Location</h2>
            
            {/* Free Map Component - No API Key Needed */}
            <MapComponent 
              latitude={hotelInfo?.latitude || 40.7128}
              longitude={hotelInfo?.longitude || -74.0060}
              hotelName={hotelInfo?.name || 'Our Hotel'}
              address={hotelInfo?.address || '123 Main Street'}
            />

            <p className="location-text">
              <MapPin size={20} />
              {hotelInfo?.address}, {hotelInfo?.city}
            </p>
          </div>

          {/* Contact Details Section */}
          <div className="contact-section">
            <h2>Contact Us</h2>
            <div className="contact-grid">
              {/* Phone Call */}
              <div className="contact-card">
                <Phone size={40} className="contact-icon" />
                <h3>Call Us</h3>
                <a 
                  href={`tel:${hotelInfo?.phone}`} 
                  className="contact-link"
                >
                  {hotelInfo?.phone || '+1 (555) 123-4567'}
                </a>
                <p className="contact-desc">Available 24/7</p>
              </div>

              {/* WhatsApp Chat */}
              <div className="contact-card">
                <MessageCircle size={40} className="contact-icon whatsapp" />
                <h3>WhatsApp</h3>
                <a 
                  href={`https://wa.me/${hotelInfo?.whatsapp?.replace(/\D/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="contact-link"
                >
                  Chat with us
                </a>
                <p className="contact-desc">Instant response</p>
              </div>

              {/* Email */}
              <div className="contact-card">
                <Mail size={40} className="contact-icon" />
                <h3>Email Us</h3>
                <a 
                  href={`mailto:${hotelInfo?.email}`} 
                  className="contact-link"
                >
                  {hotelInfo?.email || 'info@hotel.com'}
                </a>
                <p className="contact-desc">We'll respond soon</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Check-in Check-out Times Info */}
      <section className="info-section">
        <div className="info-container">
          <div className="info-card">
            <h3>Check-in Time</h3>
            <p className="time-badge">{hotelInfo?.checkInTime || '14:00'}</p>
          </div>
          <div className="info-card">
            <h3>Check-out Time</h3>
            <p className="time-badge">{hotelInfo?.checkOutTime || '11:00'}</p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="footer-content">
          <p>&copy; 2024 {hotelInfo?.name || 'Hotel'}. All rights reserved.</p>
          <div className="footer-links">
            <a href="#gallery">Gallery</a>
            <a href="#amenities">Amenities</a>
            <a href="#location">Location</a>
            <a href="#" onClick={() => handleAuthClick('login')}>Login</a>
          </div>
        </div>
      </footer>

      {/* Auth Modal */}
      {showAuthModal && (
        <AuthModal 
          type={authType} 
          onClose={() => setShowAuthModal(false)}
          onSwitchType={(newType) => setAuthType(newType)}
        />
      )}
    </div>
  );
};

export default LandingPage;