// frontend/src/pages/GalleryPage.jsx
//
// Public gallery page — fetches live data from GET /api/gallery/public.
// Falls back to the built-in static data if the API returns nothing for a category.

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, X, ZoomIn, Loader } from 'lucide-react';
import axios from 'axios';
import './GalleryPage.css';

const API = process.env.REACT_APP_API_URL;

// ── Static fallback data (shown when a category has no DB images) ─
const STATIC_DATA = {
  rooms: {
    title: 'Luxury Rooms',
    description: 'Experience comfort in our beautifully designed rooms and suites',
    images: [
      { id: '1s', url: 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=800&h=600&fit=crop', caption: 'Deluxe Room with King Bed' },
      { id: '2s', url: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2', caption: 'Room with City View' },
      { id: '3s', url: 'https://www.homestratosphere.com/wp-content/uploads/2019/02/master-bedroom-sitting-area-design-hz-7-feb072019-min.jpg', caption: 'Suite with Bedroom and Living Area' },
      { id: '4s', url: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&h=600&fit=crop', caption: 'Spacious Room with Balcony' },
      { id: '5s', url: 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb', caption: 'Executive Suite with Skyline View' },
      { id: '6s', url: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267', caption: 'Premium Room with Panoramic City View' },
    ],
  },
  pool: {
    title: 'Swimming Pool',
    description: 'Relax and swim in our Olympic-sized pool and wellness facilities',
    images: [
      { id: '1s', url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e', caption: 'Luxury Hotel Swimming Pool' },
      { id: '2s', url: 'https://images.unsplash.com/photo-1560448204-603b3fc33ddc', caption: 'Infinity Pool with Scenic View' },
      { id: '3s', url: 'https://images.unsplash.com/photo-1530549387789-4c1017266635', caption: 'Modern Outdoor Pool Area' },
      { id: '4s', url: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773', caption: 'Resort Pool with Lounge Chairs' },
    ],
  },
  restaurant: {
    title: 'Restaurant',
    description: 'Fine dining experience with international cuisine and impeccable service',
    images: [
      { id: '1s', url: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5', caption: 'Luxury Hotel Restaurant Interior' },
      { id: '2s', url: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4', caption: 'Fine Dining Restaurant Setup' },
      { id: '3s', url: 'https://images.unsplash.com/photo-1552566626-52f8b828add9', caption: 'Modern Restaurant Ambience' },
      { id: '4s', url: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0', caption: 'Outdoor Dining Experience' },
    ],
  },
  spa: {
    title: 'Spa Center',
    description: 'Relax and rejuvenate in our world-class spa and wellness centre',
    images: [
      { id: '1s', url: 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874', caption: 'Luxury Spa Treatment Room' },
      { id: '2s', url: 'https://images.unsplash.com/photo-1556228720-195a672e8a03', caption: 'Relaxing Massage Therapy' },
      { id: '3s', url: 'https://images.unsplash.com/photo-1552693673-1bf958298935', caption: 'Hot Stone Massage Setup' },
      { id: '4s', url: 'https://images.unsplash.com/photo-1600334129128-685c5582fd35', caption: 'Facial Treatment Spa Room' },
    ],
  },
  food: {
    title: 'Foods & Dining',
    description: 'Enjoy a variety of delicious cuisines and gourmet dishes prepared by expert chefs',
    images: [
      { id: '1s', url: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c', caption: 'Gourmet Healthy Dish' },
      { id: '2s', url: 'https://images.unsplash.com/photo-1551782450-a2132b4ba21d', caption: 'Classic Burger Meal' },
      { id: '3s', url: 'https://images.unsplash.com/photo-1473093295043-cdd812d0e601', caption: 'Pasta with Rich Sauce' },
      { id: '4s', url: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836', caption: 'Luxury Dining Platter' },
    ],
  },
  exclusive: {
    title: 'Exclusive Features',
    description: 'Experience premium amenities including private villas, infinity pools, elegant interiors, and world-class facilities.',
    images: [
      { id: '1s', url: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2', caption: 'Luxury Private Villa' },
      { id: '2s', url: 'https://images.unsplash.com/photo-1505691938895-1758d7feb511', caption: 'Infinity Pool View' },
      { id: '3s', url: 'https://images.unsplash.com/photo-1566665797739-1674de7a421a', caption: 'Private Pool Villa' },
      { id: '4s', url: 'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa', caption: 'Elegant Hotel Lobby' },
    ],
  },
  services: {
    title: 'Experiences & Services',
    description: 'Enjoy personalized services such as concierge assistance, private transport, guided experiences, and curated activities.',
    images: [
      { id: '1s', url: 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4', caption: 'Luxury Concierge Service' },
      { id: '2s', url: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d', caption: 'Hotel Reception Service' },
      { id: '3s', url: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70', caption: 'Luxury Car Service' },
      { id: '4s', url: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee', caption: 'Guided Tour Experience' },
    ],
  },
};

const CATEGORY_META = {
  rooms:      { title: 'Luxury Rooms',           description: 'Experience comfort in our beautifully designed rooms and suites' },
  pool:       { title: 'Swimming Pool',           description: 'Relax and swim in our Olympic-sized pool and wellness facilities' },
  restaurant: { title: 'Restaurant',             description: 'Fine dining experience with international cuisine and impeccable service' },
  spa:        { title: 'Spa Center',             description: 'Relax and rejuvenate in our world-class spa and wellness centre' },
  food:       { title: 'Foods & Dining',          description: 'Enjoy a variety of delicious cuisines and gourmet dishes prepared by expert chefs' },
  exclusive:  { title: 'Exclusive Features',      description: 'Experience premium amenities including private villas, infinity pools, elegant interiors.' },
  services:   { title: 'Experiences & Services', description: 'Enjoy personalized services such as concierge assistance and curated activities.' },
};

const GalleryPage = () => {
  const navigate = useNavigate();
  const [selectedImage,     setSelectedImage]     = useState(null);
  const [selectedCategory,  setSelectedCategory]  = useState('rooms');
  const [scrolled,          setScrolled]          = useState(false);
  const [lightboxVisible,   setLightboxVisible]   = useState(false);
  const [apiImages,         setApiImages]         = useState({});  // grouped by category
  const [loadingAPI,        setLoadingAPI]        = useState(true);

  // Scroll listener
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Escape key closes lightbox
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') closeLightbox(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Fetch public gallery data
  useEffect(() => {
    const fetchGallery = async () => {
      setLoadingAPI(true);
      try {
        const res = await axios.get(`${API}/gallery/public`);
        setApiImages(res.data?.data || {});
      } catch {
        setApiImages({});
      } finally {
        setLoadingAPI(false);
      }
    };
    fetchGallery();
  }, []);

  const openLightbox = (image) => {
    setSelectedImage(image);
    setLightboxVisible(true);
    document.body.style.overflow = 'hidden';
  };

  const closeLightbox = () => {
    setLightboxVisible(false);
    document.body.style.overflow = '';
    setTimeout(() => setSelectedImage(null), 250);
  };

  // Build gallery data: prefer DB images, fall back to static
  const buildGalleryData = () => {
    const result = {};
    Object.keys(STATIC_DATA).forEach(cat => {
      const dbImages = apiImages[cat];
      const meta     = CATEGORY_META[cat];
      if (dbImages && dbImages.length > 0) {
        result[cat] = {
          title:       meta.title,
          description: meta.description,
          images: dbImages.map(img => ({
            id:      img._id,
            url:     img.url,
            caption: img.caption,
          })),
        };
      } else {
        result[cat] = STATIC_DATA[cat];
      }
    });
    return result;
  };

  const galleryData = buildGalleryData();

  const categories = [
    { id: 'rooms',      label: 'Luxury Rooms',            sub: 'Suites & Bedrooms' },
    { id: 'pool',       label: 'Swimming Pool',            sub: 'Aqua & Wellness' },
    { id: 'restaurant', label: 'Restaurant',               sub: 'Fine Dining' },
    { id: 'spa',        label: 'Spa Center',               sub: 'Relax & Rejuvenate' },
    { id: 'food',       label: 'Foods & Dining',           sub: 'Taste Luxury Cuisine' },
    { id: 'exclusive',  label: 'Exclusive Features',       sub: 'Luxury Redefined' },
    { id: 'services',   label: 'Experiences & Services',   sub: 'Personalized Luxury' },
  ];

  const current = galleryData[selectedCategory];

  return (
    <div className="gp-page">

      {/* ── Header ──────────────────────────────────────────── */}
      <header className={`gp-header ${scrolled ? 'gp-header--scrolled' : ''}`}>
        <div className="gp-header-inner">
          <button className="gp-back-btn" onClick={() => navigate('/')}>
            <ArrowLeft size={16} />
            Back to Home
          </button>

          <div className="gp-header-title">
            <span className="gp-header-eyebrow">Our</span>
            <h1 className="gp-header-name">Gallery</h1>
          </div>

          <div className="gp-header-count">
            {loadingAPI
              ? <Loader size={16} className="gp-header-loader" />
              : current.images.length
            }
            <span>photos</span>
          </div>
        </div>
      </header>

      {/* ── Hero Band ────────────────────────────────────────── */}
      <div className="gp-hero-band">
        <div className="gp-hero-band-inner">
          <div className="gp-hero-eyebrow">
            <span className="gp-eyebrow-line" />
            Explore Our Spaces
            <span className="gp-eyebrow-line" />
          </div>
          <h2 className="gp-hero-title">A Visual Journey<br /><em>Through Luxury</em></h2>
        </div>
      </div>

      {/* ── Category Tabs ────────────────────────────────────── */}
      <div className="gp-tabs-wrapper">
        <div className="gp-tabs">
          {categories.map((cat) => (
            <button
              key={cat.id}
              className={`gp-tab ${selectedCategory === cat.id ? 'gp-tab--active' : ''}`}
              onClick={() => setSelectedCategory(cat.id)}
            >
              <span className="gp-tab-label">{cat.label}</span>
              <span className="gp-tab-sub">{cat.sub}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Category Header ──────────────────────────────────── */}
      <div className="gp-cat-header">
        <div className="gp-cat-header-inner">
          <div className="gp-cat-eyebrow">
            <span className="gp-eyebrow-line" />
            {current.title}
          </div>
          <p className="gp-cat-desc">{current.description}</p>
        </div>
      </div>

      {/* ── Image Grid ───────────────────────────────────────── */}
      <div className="gp-grid-wrapper">
        {loadingAPI ? (
          <div className="gp-grid-loading">
            <div className="gp-spinner" />
            <p>Loading gallery…</p>
          </div>
        ) : (
          <div className="gp-grid" key={selectedCategory}>
            {current.images.map((image, idx) => (
              <div
                key={image.id}
                className="gp-grid-item"
                style={{ animationDelay: `${idx * 0.06}s` }}
                onClick={() => openLightbox(image)}
              >
                <div className="gp-grid-img-wrap">
                  <img src={image.url} alt={image.caption} loading="lazy" />
                  <div className="gp-grid-overlay">
                    <div className="gp-zoom-icon">
                      <ZoomIn size={22} />
                    </div>
                    <p className="gp-grid-caption">{image.caption}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Lightbox ─────────────────────────────────────────── */}
      {selectedImage && (
        <div
          className={`gp-lightbox ${lightboxVisible ? 'gp-lightbox--visible' : ''}`}
          onClick={closeLightbox}
        >
          <div
            className={`gp-lightbox-content ${lightboxVisible ? 'gp-lightbox-content--visible' : ''}`}
            onClick={(e) => e.stopPropagation()}
          >
            <button className="gp-lightbox-close" onClick={closeLightbox} aria-label="Close">
              <X size={20} />
            </button>
            <div className="gp-lightbox-img-wrap">
              <img src={selectedImage.url} alt={selectedImage.caption} />
            </div>
            <div className="gp-lightbox-caption">
              <div className="gp-lightbox-eyebrow">
                <span className="gp-eyebrow-line" />
                {current.title}
              </div>
              <p>{selectedImage.caption}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GalleryPage;