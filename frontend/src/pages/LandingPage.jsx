// frontend/src/pages/LandingPage.jsx
//
// Amenities section:
//   1. hotel.amenities from GET /api/hotel/public → array of amenity NAME strings
//   2. GET /api/amenities?active=true → full Amenity objects (for icon + label)
//   We join them: show full Amenity data for each name found in hotel.amenities.
//   If a name has no matching Amenity object, fall back to displaying the name directly.
//
// Amenity cards are clickable → opens a modal showing label, icon, price, description.

import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  MapPin, Phone, MessageCircle, Mail, ChevronDown,
  AlertCircle, Loader, Play, Star, X, Tag, Clock,
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

// ── Star rating component ─────────────────────────────────────────
const StarRating = ({ count = 5 }) => (
  <div className="star-rating">
    {Array.from({ length: count }).map((_, i) => (
      <span key={i} className="star-icon">★</span>
    ))}
    <span className="star-score">(5.0)</span>
  </div>
);

// ── Pricing model human-readable label ───────────────────────────
const pricingLabel = (model) => {
  switch (model) {
    case 'hourly': return 'per hour';
    case 'daily':  return 'per night';
    default:       return 'flat rate';
  }
};

// ── Amenity Detail Modal ──────────────────────────────────────────
const AmenityModal = ({ amenity, onClose }) => {
  // Close on Escape key
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  if (!amenity) return null;

  const isFree   = amenity.price === 0;
  const hasPrice = amenity.price !== undefined && amenity.price !== null;

  return (
    <div className="am-backdrop" onClick={onClose} role="dialog" aria-modal="true" aria-label={amenity.label}>
      <div className="am-panel" onClick={(e) => e.stopPropagation()}>

        {/* Close */}
        <button className="am-close" onClick={onClose} aria-label="Close">
          <X size={18} />
        </button>

        {/* Icon */}
        <div className="am-icon-wrap">
          {amenity.icon && amenity.icon !== '✦' ? (
            <span className="am-icon-char" aria-hidden="true">{amenity.icon}</span>
          ) : (
            <Star size={36} />
          )}
        </div>

        {/* Label */}
        <h2 className="am-label">{amenity.label}</h2>

        {/* Price pill */}
        {hasPrice && (
          <div className={`am-price-badge ${isFree ? 'am-price-badge--free' : ''}`}>
            <Tag size={13} />
            {isFree
              ? 'Complimentary'
              : `$${amenity.price.toLocaleString()} · ${pricingLabel(amenity.pricingModel)}`
            }
          </div>
        )}

        {/* Pricing model note (only when paid) */}
        {!isFree && amenity.pricingModel && (
          <div className="am-pricing-note">
            <Clock size={12} />
            <span>Charged as a <strong>{amenity.pricingModel}</strong> rate</span>
          </div>
        )}

        {/* Divider */}
        <div className="am-divider" />

        {/* Description */}
        {amenity.description ? (
          <p className="am-description">{amenity.description}</p>
        ) : (
          <p className="am-description am-description--muted">No additional details available.</p>
        )}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────
const LandingPage = () => {
  const [hotelInfo,     setHotelInfo]     = useState(null);
  const [loadingHotel,  setLoadingHotel]  = useState(true);
  const [hotelError,    setHotelError]    = useState('');

  // Full Amenity objects fetched from /api/amenities (public-accessible or fallback)
  const [amenityObjects, setAmenityObjects] = useState([]);

  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authType,      setAuthType]      = useState('login');
  const [scrolled,      setScrolled]      = useState(false);
  const [showVideo,     setShowVideo]     = useState(false);

  // Selected amenity for the detail modal
  const [selectedAmenity, setSelectedAmenity] = useState(null);

  // Navbar scroll effect
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Fetch public hotel data
  useEffect(() => {
    let cancelled = false;
    const fetchHotel = async () => {
      setLoadingHotel(true);
      setHotelError('');
      try {
        const res  = await axios.get(`${API}/hotel/public`);
        const data = res.data?.data ?? res.data;
        if (!cancelled && data) setHotelInfo(data);
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

  // Fetch full amenity objects for icon + label + price + description lookup
  useEffect(() => {
    const fetchAmenities = async () => {
      try {
        const res = await axios.get(`${API}/amenities?active=true`);
        setAmenityObjects(res.data?.data ?? []);
      } catch {
        setAmenityObjects([]);
      }
    };
    fetchAmenities();
  }, []);

  const handleAuthClick = (type) => {
    setAuthType(type);
    setShowAuthModal(true);
  };

  const handleAmenityClick = useCallback((amenity) => {
    setSelectedAmenity(amenity);
  }, []);

  const handleModalClose = useCallback(() => {
    setSelectedAmenity(null);
  }, []);

  // ── Build displayable amenities list ─────────────────────────────
  const buildAmenityDisplay = () => {
    if (!hotelInfo?.amenities?.length) return [];

    return hotelInfo.amenities.map(amenityName => {
      const obj = amenityObjects.find(a => a.name === amenityName);
      return {
        name:         amenityName,
        label:        obj?.label       || (amenityName.charAt(0).toUpperCase() + amenityName.slice(1)),
        icon:         obj?.icon        || '✦',
        price:        obj?.price,
        pricingModel: obj?.pricingModel,
        description:  obj?.description || '',
      };
    });
  };

  const amenityDisplay = buildAmenityDisplay();

  // Loading screen
  if (loadingHotel) {
    return (
      <div className="lp-loading">
        <div className="lp-loading-inner">
          <div className="lp-brand-loader">
            {hotelInfo?.name ? `🏨 ${hotelInfo.name}` : '🏨 Luxury Hotel'}
          </div>
          <Loader size={28} className="lp-spinner" />
          <p>Preparing your experience…</p>
        </div>
      </div>
    );
  }

  // Error screen
  if (hotelError && !hotelInfo) {
    return (
      <div className="lp-error">
        <AlertCircle size={36} />
        <p>{hotelError}</p>
      </div>
    );
  }

  const hasLocation = hotelInfo?.location?.latitude && hotelInfo?.location?.longitude;
  const lat = hotelInfo?.location?.latitude;
  const lng = hotelInfo?.location?.longitude;

  return (
    <div className="landing-page">

      {/* ── Navbar ─────────────────────────────────────────────── */}
      <nav className={`navbar ${scrolled ? 'navbar--scrolled' : ''}`}>
        <div className="nav-container">
          <div className="nav-logo">
            <span className="nav-logo-icon">🏨</span>
            <span className="nav-logo-name">{hotelInfo?.name}</span>
          </div>
          <ul className="nav-links">
            <li><a href="#gallery">Gallery</a></li>
            <li><a href="#amenities">Amenities</a></li>
            <li><a href="#location">Location</a></li>
            <li><a href="#contact">Contact</a></li>
          </ul>
          <button className="auth-nav-btn" onClick={() => handleAuthClick('login')}>
            Staff Portal
          </button>
        </div>
      </nav>

      {/* ── Hero ───────────────────────────────────────────────── */}
      <section
        className="hero-section"
        style={{ backgroundImage: `url(${background})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
      >
        <div className="hero-overlay" />
        <div className="hero-grain" />
        <div className="hero-content">
          <div className="hero-eyebrow">
            <span className="hero-eyebrow-line" />
            Modern Luxury and Timeless Living
          </div>
          <StarRating count={5} />
          <h1 className="hero-title">
            <em>Welcome to Our Luxurious</em>
            <strong>{hotelInfo?.name || 'Hotel & Resort'}</strong>
          </h1>
          {hotelInfo?.description && (
            <p className="hero-subtitle">{hotelInfo.description}</p>
          )}
          <div className="hero-buttons">
            <Link to="/booking" className="btn btn-gold">
              Book Apartments
            </Link>
            <button
              className="btn btn-outline-white"
              onClick={() => document.getElementById('amenities')?.scrollIntoView({ behavior: 'smooth' })}
            >
              Explore <ChevronDown size={16} />
            </button>
          </div>
        </div>
        <div className="hero-scroll-hint">
          <span>Scroll</span>
          <div className="hero-scroll-line" />
        </div>
      </section>

      {/* ── Stats Bar ──────────────────────────────────────────── */}
      <div className="stats-bar">
        <div className="stat-item">
          <div className="stat-num">98<sup>%</sup><span className="stat-plus">+</span></div>
          <div className="stat-label">Positive Feedback</div>
          <div className="stat-desc">
            Over 98% positive feedback from satisfied guests, reflecting our commitment
            to exceptional service and memorable stays.
          </div>
        </div>
        <div className="stat-item stat-item--center">
          <div className="stat-num">15<span className="stat-plus">+</span></div>
          <div className="stat-label">Years of Expertise</div>
          <div className="stat-desc">
            Backed by 15 years of passion and craft, we turn every stay into
            a seamless, unforgettable experience.
          </div>
        </div>
        <div className="stat-item">
          <div className="stat-num">25K<span className="stat-plus">+</span></div>
          <div className="stat-label">Happy Clients</div>
          <div className="stat-desc">
            Proudly serving 25K+ happy travelers who've trusted us to find
            their perfect stay.
          </div>
        </div>
      </div>

      {/* ── About Strip ────────────────────────────────────────── */}
      <section className="about-section">
        <div className="about-text">
          <div className="section-eyebrow">
            <span className="eyebrow-line" />
            About Us
          </div>
          <h2 className="about-title">
            Since 2016, we've been helping travelers find stays they love — effortlessly.
          </h2>
          <p className="about-body">
            We're about curating unforgettable journeys! Since 2016, our passionate team has been
            helping travelers find the perfect stay, blending seamless technology with a love for
            discovery. From cozy hideaways to grand escapes, we turn your travel dreams into
            real-world adventures.
          </p>
          <Link to="/about" className="know-more-link">
            Know More <span className="know-more-arrow">→</span>
          </Link>
        </div>
        <div className="about-visual">
          <img src={hotel} alt={hotelInfo?.name} className="about-img" />
          <div className="about-badge">
            <span className="about-badge-num">15+</span>
            <span className="about-badge-txt">Years of Excellence</span>
          </div>
        </div>
      </section>

      {/* ── Gallery / Rooms ────────────────────────────────────── */}
      <section id="gallery" className="gallery-section">
        <div className="section-header">
          <div className="section-eyebrow section-eyebrow--centered">
            <span className="eyebrow-line" />
            Rooms &amp; Suites
            <span className="eyebrow-line" />
          </div>
          <h2 className="section-title">Our Exquisite Rooms Collections</h2>
        </div>
        <div className="gallery-grid">
          {[
            { src: hotel,     label: 'Luxury Room',  price: '$300', tag: 'Royal Sapphire Suite' },
            { src: pool,      label: 'Swimming Pool', price: null,   tag: 'Pool & Wellness' },
            { src: resturent, label: 'Restaurant',    price: null,   tag: 'Fine Dining' },
            { src: spa,       label: 'Spa Center',    price: '$150', tag: 'Pearl Orchid Suite' },
          ].map(({ src, label, price, tag }, idx) => (
            <div key={idx} className="gallery-card" onClick={() => window.location.href = '/gallery'}>
              <div className="gallery-card-img-wrap">
                <img src={src} alt={label} className="gallery-card-img" />
                <div className="gallery-card-overlay" />
                {price && <div className="gallery-price-tag">{price}<span>/night</span></div>}
              </div>
              <div className="gallery-card-body">
                <div className="gallery-card-tag">{tag}</div>
                <div className="gallery-card-meta">
                  <span>90 Sq.Ft</span>
                  <span className="meta-dot" />
                  <span>1 Bed</span>
                  <span className="meta-dot" />
                  <span>3 Sleeps</span>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="gallery-action">
          <Link to="/gallery" className="view-gallery-btn">View Full Gallery</Link>
        </div>
      </section>

      {/* ── Feature / Video Strip ───────────────────────────────── */}
      <div className="feature-strip">
        <div className="feature-bg" style={{ backgroundImage: `url(${pool})` }} />
        <div className="feature-overlay" />
        <div className="feature-content">
          {!showVideo ? (
            <button className="play-btn" aria-label="Play video" onClick={() => setShowVideo(true)}>
              <Play size={22} fill="white" />
            </button>
          ) : (
            <div className="feature-video-wrapper">
              <iframe
                width="100%"
                height="100%"
                src="https://www.youtube.com/embed/1Dt2sXECBXE?autoplay=1"
                title="Hotel Experience Video"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          )}
          <div className="feature-label">Experience the Difference</div>
        </div>
      </div>

      {/* ── Amenities ──────────────────────────────────────────── */}
      {amenityDisplay.length > 0 && (
        <section id="amenities" className="amenities-section">
          <div className="section-header">
            <div className="section-eyebrow section-eyebrow--centered">
              <span className="eyebrow-line" />
              What We Offer
              <span className="eyebrow-line" />
            </div>
            <h2 className="section-title">Our Amenities</h2>
            <p className="amenities-hint">Click any amenity to learn more</p>
          </div>

          <div className="amenities-grid">
            {amenityDisplay.map((amenity, idx) => (
              <button
                key={idx}
                className="amenity-card amenity-card--clickable"
                onClick={() => handleAmenityClick(amenity)}
                aria-label={`View details for ${amenity.label}`}
              >
                <div className="amenity-icon-wrap">
                  {amenity.icon && amenity.icon !== '✦' ? (
                    <span className="amenity-icon-char" aria-hidden="true">
                      {amenity.icon}
                    </span>
                  ) : (
                    <Star size={28} />
                  )}
                </div>
                <h3 className="amenity-name">{amenity.label}</h3>
                {amenity.price === 0 && (
                  <span className="amenity-free-tag">Free</span>
                )}
                {amenity.price > 0 && (
                  <span className="amenity-price-tag">${amenity.price}</span>
                )}
                <span className="amenity-view-hint">View details</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* ── Location + Contact ──────────────────────────────────── */}
      <section id="location" className="location-section">
        <div className="location-container">
          {hasLocation && (
            <div className="map-wrapper">
              <div className="section-eyebrow">
                <span className="eyebrow-line" />
                Find Us
              </div>
              <h2 className="map-title">Our Location</h2>
              <MapComponent latitude={lat} longitude={lng} hotelName={hotelInfo?.name} address={hotelInfo?.address}/>
              {(hotelInfo?.address || hotelInfo?.city) && (
                <p className="location-text">
                  <MapPin size={16} />
                  {[hotelInfo.address, hotelInfo.city].filter(Boolean).join(', ')}
                </p>
              )}
            </div>
          )}

          <div id="contact" className="contact-section">
            <div className="section-eyebrow">
              <span className="eyebrow-line" />
              Get In Touch
            </div>
            <h2 className="contact-title">We'd love to<br/><em>host your next stay</em></h2>
            <div className="contact-grid">
              {hotelInfo?.phone && (
                <a href={`tel:${hotelInfo.phone}`} className="contact-card">
                  <div className="contact-icon-wrap"><Phone size={20} /></div>
                  <div className="contact-card-body">
                    <div className="contact-card-label">Call Us</div>
                    <div className="contact-card-value">{hotelInfo.phone}</div>
                    <div className="contact-card-desc">Available 24/7</div>
                  </div>
                </a>
              )}
              {hotelInfo?.whatsapp && (
                <a
                  href={`https://wa.me/${hotelInfo.whatsapp.replace(/\D/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="contact-card contact-card--whatsapp"
                >
                  <div className="contact-icon-wrap contact-icon-wrap--whatsapp"><MessageCircle size={20} /></div>
                  <div className="contact-card-body">
                    <div className="contact-card-label">WhatsApp</div>
                    <div className="contact-card-value">Chat with us</div>
                    <div className="contact-card-desc">Instant response</div>
                  </div>
                </a>
              )}
              {hotelInfo?.email && (
                <a href={`mailto:${hotelInfo.email}`} className="contact-card">
                  <div className="contact-icon-wrap"><Mail size={20} /></div>
                  <div className="contact-card-body">
                    <div className="contact-card-label">Email Us</div>
                    <div className="contact-card-value">{hotelInfo.email}</div>
                    <div className="contact-card-desc">We'll respond soon</div>
                  </div>
                </a>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── Check-in / Check-out ────────────────────────────────── */}
      {(hotelInfo?.checkInTime || hotelInfo?.checkOutTime) && (
        <section className="checkinout-section">
          <div className="checkinout-container">
            {hotelInfo?.checkInTime && (
              <div className="checkinout-card">
                <div className="checkinout-label">Check-in Time</div>
                <div className="checkinout-time">{hotelInfo.checkInTime}</div>
              </div>
            )}
            {hotelInfo?.checkOutTime && (
              <div className="checkinout-card">
                <div className="checkinout-label">Check-out Time</div>
                <div className="checkinout-time">{hotelInfo.checkOutTime}</div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* ── Footer ─────────────────────────────────────────────── */}
      <footer className="footer">
        <div className="footer-content">
          <div className="footer-brand">
            <span className="footer-brand-name">{hotelInfo?.name}</span>
            <span className="footer-brand-tagline">Luxury &amp; Timeless Living</span>
          </div>
          <div className="footer-links">
            <a href="#gallery">Gallery</a>
            <a href="#amenities">Amenities</a>
            <a href="#location">Location</a>
            <a href="#" onClick={() => handleAuthClick('login')}>Login</a>
          </div>
          <p className="footer-copy">
            &copy; {new Date().getFullYear()} {hotelInfo?.name}. All rights reserved.
          </p>
        </div>
      </footer>

      {/* ── Amenity Detail Modal ────────────────────────────────── */}
      {selectedAmenity && (
        <AmenityModal amenity={selectedAmenity} onClose={handleModalClose} />
      )}

      {/* ── Auth Modal ──────────────────────────────────────────── */}
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