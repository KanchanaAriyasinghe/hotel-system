// frontend/src/pages/LandingPage.jsx

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  MapPin, Phone, MessageCircle, Mail, ChevronDown,
  Wifi, Waves, Droplets, UtensilsCrossed, Wine, Dumbbell,
  Users, Home, Heart, Star, Zap, Tv, Car, Coffee,
  AlertCircle, Loader,
} from 'lucide-react';
import axios from 'axios';
import AuthModal from '../components/AuthModal';
import MapComponent from '../components/MapComponent';
import './LandingPage.css';
import hotel     from '../assets/gallery/hotel.jpeg';
import pool      from '../assets/gallery/pool.jpeg';
import resturent from '../assets/gallery/resturent.jpeg';
import spa       from '../assets/gallery/spa.jpeg';
import background from '../assets/background.jpg';

const API = process.env.REACT_APP_API_URL;

// ── Amenity icon map ──────────────────────────────────────────────
const AMENITY_ICONS = {
  wifi:        <Wifi size={32} />,
  pool:        <Waves size={32} />,
  spa:         <Droplets size={32} />,
  restaurant:  <UtensilsCrossed size={32} />,
  bar:         <Wine size={32} />,
  gym:         <Dumbbell size={32} />,
  parking:     <Car size={32} />,
  breakfast:   <Coffee size={32} />,
  concierge:   <Heart size={32} />,
  laundry:     <Home size={32} />,
  rooftop:     <Star size={32} />,
  lounge:      <Users size={32} />,
  family:      <Users size={32} />,
  premium:     <Star size={32} />,
  ac:          <Zap size={32} />,
  tv:          <Tv size={32} />,
};

const getAmenityIcon = (amenity) =>
  AMENITY_ICONS[amenity?.toLowerCase()] || <Star size={32} />;

// ── Amenity label formatter (capitalize first letter) ─────────────
const formatAmenity = (a) => a.charAt(0).toUpperCase() + a.slice(1);

// ─────────────────────────────────────────────────────────────────
const LandingPage = () => {
  const [hotelInfo,     setHotelInfo]     = useState(null);
  const [loadingHotel,  setLoadingHotel]  = useState(true);
  const [hotelError,    setHotelError]    = useState('');
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authType,      setAuthType]      = useState('login');

  // ── Fetch public hotel data ─────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    const fetchHotel = async () => {
      setLoadingHotel(true);
      setHotelError('');
      try {
        // GET /api/hotel/public — no auth required
        const res  = await axios.get(`${API}/hotel/public`);
        const data = res.data?.data ?? res.data;

        if (!cancelled && data) {
          setHotelInfo(data);
        }
      } catch (err) {
        if (cancelled) return;
        const status = err.response?.status;
        if (status === 404) {
          setHotelError('Hotel information is not set up yet.');
        } else {
          setHotelError('Could not load hotel information. Please try again later.');
        }
      } finally {
        if (!cancelled) setLoadingHotel(false);
      }
    };

    fetchHotel();
    return () => { cancelled = true; };
  }, []);

  const handleAuthClick = (type) => {
    setAuthType(type);
    setShowAuthModal(true);
  };

  // ── Loading screen ──────────────────────────────────────────
  if (loadingHotel) {
    return (
      <div className="lp-loading">
        <Loader size={36} className="lp-spinner" />
        <p>Loading hotel information…</p>
      </div>
    );
  }

  // ── Error screen ────────────────────────────────────────────
  if (hotelError && !hotelInfo) {
    return (
      <div className="lp-error">
        <AlertCircle size={40} />
        <p>{hotelError}</p>
      </div>
    );
  }

  // ── Derived values (safe — only used after hotelInfo is set) ─
  const hasLocation = hotelInfo?.location?.latitude && hotelInfo?.location?.longitude;
  const lat = hotelInfo?.location?.latitude;
  const lng = hotelInfo?.location?.longitude;

  return (
    <div className="landing-page">

      {/* ── Navbar ─────────────────────────────────────────── */}
      <nav className="navbar">
        <div className="nav-container">
          <div className="nav-logo">
            <h1>🏨 {hotelInfo?.name}</h1>
          </div>
          <button className="auth-nav-btn" onClick={() => handleAuthClick('login')}>
            Hotel Staff — Login / Register
          </button>
        </div>
      </nav>

      {/* ── Hero ───────────────────────────────────────────── */}
      <section
        className="hero-section"
        style={{ backgroundImage: `url(${background})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
      >
        <div className="hero-overlay"/>
        <div className="hero-content">
          <h1 className="hero-title">{hotelInfo?.name}</h1>
          {hotelInfo?.description && (
            <p className="hero-subtitle">{hotelInfo.description}</p>
          )}
          <div className="hero-buttons">
            <div className="btn btn-primary">
              <Link to="/booking">Book Now</Link>
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

      {/* ── Gallery ────────────────────────────────────────── */}
      <section id="gallery" className="gallery-section">
        <h2>Our Gallery</h2>
        <div className="gallery-grid">
          <div className="gallery-item" onClick={() => window.location.href = '/gallery'}>
            <img src={hotel}     alt="Luxury Room"   />
            <div className="gallery-item-label">Luxury Room</div>
          </div>
          <div className="gallery-item" onClick={() => window.location.href = '/gallery'}>
            <img src={pool}      alt="Swimming Pool" />
            <div className="gallery-item-label">Swimming Pool</div>
          </div>
          <div className="gallery-item" onClick={() => window.location.href = '/gallery'}>
            <img src={resturent} alt="Restaurant"    />
            <div className="gallery-item-label">Restaurant</div>
          </div>
          <div className="gallery-item" onClick={() => window.location.href = '/gallery'}>
            <img src={spa}       alt="Spa Center"    />
            <div className="gallery-item-label">Spa Center</div>
          </div>
        </div>
        <div className="gallery-action">
          <Link to="/gallery" className="view-gallery-btn">View Full Gallery</Link>
        </div>
      </section>

      {/* ── Amenities ──────────────────────────────────────── */}
      {hotelInfo?.amenities?.length > 0 && (
        <section id="amenities" className="amenities-section">
          <h2>Our Amenities</h2>
          <div className="amenities-grid">
            {hotelInfo.amenities.map((amenity, idx) => (
              <div key={idx} className="amenity-card">
                <div className="amenity-icon">{getAmenityIcon(amenity)}</div>
                <h3>{formatAmenity(amenity)}</h3>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Location + Contact ──────────────────────────────── */}
      <section id="location" className="location-section">
        <div className="location-container">

          {/* Map — only shown if coordinates exist */}
          {hasLocation && (
            <div className="map-wrapper">
              <h2>Our Location</h2>
              <MapComponent
                latitude={lat}
                longitude={lng}
                hotelName={hotelInfo?.name}
                address={hotelInfo?.address}
              />
              {(hotelInfo?.address || hotelInfo?.city) && (
                <p className="location-text">
                  <MapPin size={20} />
                  {[hotelInfo.address, hotelInfo.city].filter(Boolean).join(', ')}
                </p>
              )}
            </div>
          )}

          {/* Contact */}
          <div className="contact-section">
            <h2>Contact Us</h2>
            <div className="contact-grid">

              {hotelInfo?.phone && (
                <div className="contact-card">
                  <Phone size={40} className="contact-icon" />
                  <h3>Call Us</h3>
                  <a href={`tel:${hotelInfo.phone}`} className="contact-link">
                    {hotelInfo.phone}
                  </a>
                  <p className="contact-desc">Available 24/7</p>
                </div>
              )}

              {hotelInfo?.whatsapp && (
                <div className="contact-card">
                  <MessageCircle size={40} className="contact-icon whatsapp" />
                  <h3>WhatsApp</h3>
                  <a
                    href={`https://wa.me/${hotelInfo.whatsapp.replace(/\D/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="contact-link"
                  >
                    Chat with us
                  </a>
                  <p className="contact-desc">Instant response</p>
                </div>
              )}

              {hotelInfo?.email && (
                <div className="contact-card">
                  <Mail size={40} className="contact-icon" />
                  <h3>Email Us</h3>
                  <a href={`mailto:${hotelInfo.email}`} className="contact-link">
                    {hotelInfo.email}
                  </a>
                  <p className="contact-desc">We'll respond soon</p>
                </div>
              )}

            </div>
          </div>
        </div>
      </section>

      {/* ── Check-in / Check-out ────────────────────────────── */}
      {(hotelInfo?.checkInTime || hotelInfo?.checkOutTime) && (
        <section className="info-section">
          <div className="info-container">
            {hotelInfo?.checkInTime && (
              <div className="info-card">
                <h3>Check-in Time</h3>
                <p className="time-badge">{hotelInfo.checkInTime}</p>
              </div>
            )}
            {hotelInfo?.checkOutTime && (
              <div className="info-card">
                <h3>Check-out Time</h3>
                <p className="time-badge">{hotelInfo.checkOutTime}</p>
              </div>
            )}
          </div>
        </section>
      )}

      {/* ── Footer ─────────────────────────────────────────── */}
      <footer className="footer">
        <div className="footer-content">
          <p>&copy; {new Date().getFullYear()} {hotelInfo?.name}. All rights reserved.</p>
          <div className="footer-links">
            <a href="#gallery">Gallery</a>
            <a href="#amenities">Amenities</a>
            <a href="#location">Location</a>
            <a href="#" onClick={() => handleAuthClick('login')}>Login</a>
          </div>
        </div>
      </footer>

      {/* ── Auth Modal ──────────────────────────────────────── */}
      {showAuthModal && (
        <AuthModal
          type={authType}
          onClose={() => setShowAuthModal(false)}
          onSwitchType={(t) => setAuthType(t)}
        />
      )}
    </div>
  );
};

export default LandingPage;