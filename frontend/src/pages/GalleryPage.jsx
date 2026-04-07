// frontend/src/pages/GalleryPage.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, X, ZoomIn } from 'lucide-react';
import './GalleryPage.css';

const GalleryPage = () => {
  const navigate = useNavigate();
  const [selectedImage, setSelectedImage]     = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('rooms');
  const [scrolled, setScrolled]               = useState(false);
  const [lightboxVisible, setLightboxVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Trap Escape key to close lightbox
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') closeLightbox(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
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

  // Gallery data organized by category
  const galleryData = {
    rooms: {
      title: 'Luxury Rooms',
      description: 'Experience comfort in our beautifully designed rooms and suites',
      images: [
        { id: 1,  url: 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=800&h=600&fit=crop', caption: 'Deluxe Room with King Bed' },
        { id: 2,  url: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2', caption: 'Room with City View' },
        { id: 3,  url: 'https://www.homestratosphere.com/wp-content/uploads/2019/02/master-bedroom-sitting-area-design-hz-7-feb072019-min.jpg', caption: 'Suite with Bedroom and Living Area' },
        { id: 4,  url: 'https://www.carpentry.sg/wp-content/uploads/2023/04/Jalan-Greja_Website_08.jpg', caption: 'Modern Bedroom with Amenities' },
        { id: 5,  url: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&h=600&fit=crop', caption: 'Spacious Room with Balcony' },
        { id: 6,  url: 'https://tse1.mm.bing.net/th/id/OIP.ABqXFuAsE0hP1jEjf1dGBAHaFj?rs=1&pid=ImgDetMain&o=7&rm=3', caption: 'Luxury Twin Room' },
        { id: 7, url: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2', caption: 'Luxury Room with City View' },
        { id: 8, url: 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb', caption: 'Executive Suite with Skyline View' },
        { id: 9, url: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267', caption: 'Premium Room with Panoramic City View' },
        { id: 10, url: 'https://images.unsplash.com/photo-1505691938895-1758d7feb511', caption: 'Luxury Bedroom with Night City Lights' },
        { id: 11, url: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b', caption: 'Deluxe Suite with Balcony City View' },
        { id: 12, url: 'https://images.unsplash.com/photo-1590490360182-c33d57733427', caption: 'Modern Luxury Room with Urban View' },
        { id: 13, url: 'https://images.unsplash.com/photo-1578683010236-d716f9a3f461', caption: 'High-Rise Suite with Stunning Skyline' },
        { id: 14, url: 'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa', caption: 'Elegant Room with Cityscape View' },
        { id: 15, url: 'https://images.unsplash.com/photo-1578898887932-dce23a595ad4', caption: 'Luxury Suite with City Panorama' }
      ],
    },
    pool: {
      title: 'Swimming Pool',
      description: 'Relax and swim in our Olympic-sized pool and wellness facilities',
      images: [
        { id: 7,  url: 'https://th.bing.com/th/id/R.89dbf894243f879085ff9995052cd63e?rik=9xMnHcr5UXoc1w&pid=ImgRaw&r=0', caption: 'Olympic-Sized Swimming Pool' },
        { id: 8,  url: 'https://th.bing.com/th/id/R.aa5ac52eb2c1d1a70907a48d7688c0ed?rik=d%2ftwQDLrjILDjw&pid=ImgRaw&r=0', caption: 'Pool Area with Lounge Chairs' },
        { id: 9,  url: 'https://images.fineartamerica.com/images/artworkimages/mediumlarge/3/evening-pool-view-in-bucaramanga-danaan-andrew.jpg', caption: 'Evening Pool View' },
        { id: 10, url: 'https://lucaslagoons.com/wp-content/gallery/luxury-pools-with-waterfalls/Luxury-Pools-With-Waterfalls18.jpg', caption: 'Pool with Waterfall Feature' },
        { id: 11, url: 'https://th.bing.com/th/id/R.4346c7426cd68432dc67f77e6df6c2ba?rik=hZHPrUOreMhgkA&pid=ImgRaw&r=0', caption: 'Kids Pool Area' },
        { id: 12, url: 'https://thumbs.dreamstime.com/b/outdoor-pool-bar-night-luxury-resort-travel-lifestyle-photo-outdoor-pool-bar-night-luxury-resort-travel-lifestyle-331737121.jpg', caption: 'Poolside Bar and Seating' },
        { id: 1, url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e', caption: 'Luxury Hotel Swimming Pool' },
        { id: 2, url: 'https://images.unsplash.com/photo-1560448204-603b3fc33ddc', caption: 'Infinity Pool with Scenic View' },
        { id: 3, url: 'https://images.unsplash.com/photo-1530549387789-4c1017266635', caption: 'Modern Outdoor Pool Area' },
        { id: 4, url: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773', caption: 'Resort Pool with Lounge Chairs' },
        { id: 5, url: 'https://images.unsplash.com/photo-1521783593447-5702b9bfd267', caption: 'Luxury Poolside Relaxation Area' },
        { id: 6, url: 'https://images.unsplash.com/photo-1508609349937-5ec4ae374ebf', caption: 'Private Hotel Pool Experience' },
        { id: 7, url: 'https://images.unsplash.com/photo-1596394516093-501ba68a0ba6', caption: 'Tropical Resort Swimming Pool' },
        { id: 8, url: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b', caption: 'Pool with City Skyline View' },
        { id: 9, url: 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb', caption: 'Elegant Hotel Poolside View' }
      ],
    },
    restaurant: {
      title: 'Restaurant',
      description: 'Fine dining experience with international cuisine and impeccable service',
      images: [
        { id: 13, url: 'https://tse4.mm.bing.net/th/id/OIP.tgMFhjnh_lvSqkqSUO4phwHaEl?rs=1&pid=ImgDetMain&o=7&rm=3', caption: 'Main Dining Hall' },
        { id: 14, url: 'https://i.pinimg.com/736x/e2/26/13/e22613561d435dd62dde486c7edf0bef.jpg', caption: 'Elegant Table Setting' },
        { id: 15, url: 'https://static.vecteezy.com/system/resources/previews/024/570/962/non_2x/portrait-of-a-professional-chef-standing-in-the-kitchen-of-a-restaurant-a-chefs-full-rear-view-inside-a-modern-kitchen-preparing-exquisite-dishes-ai-generated-free-photo.jpg', caption: 'Kitchen with Chef' },
        { id: 16, url: 'https://tse2.mm.bing.net/th/id/OIP.QSd_Qv2ZxpTPXQHIAjsb5gHaE9?rs=1&pid=ImgDetMain&o=7&rm=3', caption: 'Buffet Section' },
        { id: 17, url: 'https://tse2.mm.bing.net/th/id/OIP.rIsRZWsU8eFrSO8Rklj2egHaE8?rs=1&pid=ImgDetMain&o=7&rm=3', caption: 'Indoor Restaurant Ambiance' },
        { id: 18, url: 'https://th.bing.com/th/id/R.e2d74c77832424a84b1399ec724d1b42?rik=19kuGCKpHSA8Yg&riu=http%3a%2f%2fwww.quiet-corner.com%2fwp-content%2fuploads%2f2016%2f04%2fDesigning-an-Outdoor-Dining-Area-4.jpg&ehk=Wr2NSKeJ%2bP4w%2fLLyAwD2Zaf6EKMSZ%2bFdDGEqMDOINMU%3d&risl=&pid=ImgRaw&r=0', caption: 'Outdoor Dining Area' },
        { id: 1, url: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5', caption: 'Luxury Hotel Restaurant Interior' },
        { id: 2, url: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4', caption: 'Fine Dining Restaurant Setup' },
        { id: 3, url: 'https://images.unsplash.com/photo-1552566626-52f8b828add9', caption: 'Modern Restaurant Ambience' },
        { id: 4, url: 'https://images.unsplash.com/photo-1544148103-0773bf10d330', caption: 'Elegant Dining Area' },
        { id: 5, url: 'https://images.unsplash.com/photo-1424847651672-bf20a4b0982b', caption: 'Restaurant with Cozy Lighting' },
        { id: 6, url: 'https://images.unsplash.com/photo-1559339352-11d035aa65de', caption: 'Luxury Buffet Restaurant' },
        { id: 7, url: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0', caption: 'Outdoor Dining Experience' },
        { id: 8, url: 'https://images.unsplash.com/photo-1466978913421-dad2ebd01d17', caption: 'Romantic Dinner Setup' },
        { id: 9, url: 'https://images.unsplash.com/photo-1550966871-3ed3cdb5ed0c', caption: 'Upscale Restaurant Seating' }
      ],
    },
    spa: {
      title: 'Spa Center',
      description: 'Relax and rejuvenate in our world-class spa and wellness centre',
      images: [
        { id: 19, url: 'https://tse3.mm.bing.net/th/id/OIP.TA3gSZuImQh65eYK8EB-LgHaE9?rs=1&pid=ImgDetMain&o=7&rm=3', caption: 'Spa Treatment Room' },
        { id: 20, url: 'https://img.freepik.com/premium-photo/beautifully-candlelit-massage-room-spa-salon_908985-108990.jpg', caption: 'Massage Area with Candlelight' },
        { id: 21, url: 'https://tse4.mm.bing.net/th/id/OIP.UYY38_2CeeEqdDTe1JP2CQHaEo?rs=1&pid=ImgDetMain&o=7&rm=3', caption: 'Sauna Facilities' },
        { id: 22, url: 'https://tse4.mm.bing.net/th/id/OIP.1UE2bMZ5N93KGaMXGxzinAHaEy?rs=1&pid=ImgDetMain&o=7&rm=3', caption: 'Relaxation Lounge' },
        { id: 23, url: 'https://tse3.mm.bing.net/th/id/OIP.At539UdcrmMwbuz6uVw9aAHaEA?rs=1&pid=ImgDetMain&o=7&rm=3', caption: 'Spa Pool' },
        { id: 24, url: 'https://tse4.mm.bing.net/th/id/OIP.vVgMfRkpEOJMH8V7dAhGUwHaE8?w=1440&h=960&rs=1&pid=ImgDetMain&o=7&rm=3', caption: 'Facial Treatment Room' },
        { id: 1, url: 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874', caption: 'Luxury Spa Treatment Room' },
        { id: 2, url: 'https://images.unsplash.com/photo-1556228720-195a672e8a03', caption: 'Relaxing Massage Therapy' },
        { id: 3, url: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773', caption: 'Spa with Candle Light Ambience' },
        { id: 4, url: 'https://images.unsplash.com/photo-1515378791036-0648a3ef77b2', caption: 'Wellness Spa Interior' },
        { id: 5, url: 'https://images.unsplash.com/photo-1552693673-1bf958298935', caption: 'Hot Stone Massage Setup' },
        { id: 6, url: 'https://images.unsplash.com/photo-1556228453-efd6c1ff04f6', caption: 'Luxury Spa Relaxation Area' },
        { id: 7, url: 'https://images.unsplash.com/photo-1600334129128-685c5582fd35', caption: 'Facial Treatment Spa Room' },
        { id: 8, url: 'https://images.unsplash.com/photo-1519823551278-64ac92734fb1', caption: 'Aromatherapy Spa Experience' },
        { id: 9, url: 'https://images.unsplash.com/photo-1470252649378-9c29740c9fa8', caption: 'Premium Wellness Center' }
      ],
    },

    food: {
      title: 'Foods & Dining',
      description: 'Enjoy a variety of delicious cuisines and gourmet dishes prepared by expert chefs',
      images: [
        { id: 1, url: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c', caption: 'Gourmet Healthy Dish' },
        { id: 2, url: 'https://images.unsplash.com/photo-1551782450-a2132b4ba21d', caption: 'Classic Burger Meal' },
        { id: 3, url: 'https://images.unsplash.com/photo-1473093295043-cdd812d0e601', caption: 'Pasta with Rich Sauce' },
        { id: 4, url: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836', caption: 'Luxury Dining Platter' },
        { id: 5, url: 'https://images.unsplash.com/photo-1498837167922-ddd27525d352', caption: 'Artisanal Food Plate' }, 
        { id: 6, url: 'https://images.unsplash.com/photo-1499028344343-cd173ffc68a9', caption: 'Delicious Pizza' },
        { id: 7, url: 'https://images.unsplash.com/photo-1505253758473-96b7015fcd40', caption: 'Seafood Special Dish' },
        { id: 8, url: 'https://images.unsplash.com/photo-1529042410759-befb1204b468', caption: 'Asian Cuisine Bowl' },
        { id: 9, url: 'https://images.unsplash.com/photo-1543352634-99a5d50ae78e', caption: 'Dessert with Chocolate' },
        { id: 10, url: 'https://images.unsplash.com/photo-1467003909585-2f8a72700288', caption: 'Breakfast Table Setup' },
        { id: 11, url: 'https://images.unsplash.com/photo-1490645935967-10de6ba17061', caption: 'Healthy Salad Bowl' },
        { id: 12, url: 'https://images.unsplash.com/photo-1482049016688-2d3e1b311543', caption: 'Brunch Meal Setup' },
        { id: 13, url: 'https://images.unsplash.com/photo-1544025162-d76694265947', caption: 'Hearty Meal with Side Dishes' },
        { id: 14, url: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38', caption: 'Luxury Dessert Presentation' },
        { id: 15, url: 'https://images.unsplash.com/photo-1498837167922-ddd27525d352', caption: 'Colorful Fruit Dish' }
      ],
    },

    exclusive: {
        title: 'Exclusive Features',
        description: 'Experience premium amenities including private villas, infinity pools, elegant interiors, and world-class facilities designed for ultimate comfort and luxury.',
      images: [
        { id: 1, url: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2', caption: 'Luxury Private Villa' },
        { id: 2, url: 'https://images.unsplash.com/photo-1505691938895-1758d7feb511', caption: 'Infinity Pool View' },
        { id: 3, url: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b', caption: 'Luxury Hotel Suite' },
        { id: 4, url: 'https://images.unsplash.com/photo-1578898887932-dce23a595ad4', caption: 'Ocean View Balcony' },
        { id: 5, url: 'https://images.unsplash.com/photo-1590490360182-c33d57733427', caption: 'Luxury Bedroom Interior' },
        { id: 6, url: 'https://images.unsplash.com/photo-1566665797739-1674de7a421a', caption: 'Private Pool Villa' },
        { id: 7, url: 'https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=800&q=80', caption: 'Luxury Resort Exterior' },
        { id: 8, url: 'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa', caption: 'Elegant Hotel Lobby' },
        { id: 9, url: 'https://images.unsplash.com/photo-1566073771259-6a8506099945', caption: 'Luxury Hotel Room Setup' },
        { id: 10, url: 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb', caption: 'Resort Night View' },
        { id: 11, url: 'https://images.unsplash.com/photo-1493809842364-78817add7ffb?auto=format&fit=crop&w=800&q=80', caption: 'Luxury Living Space' },
        { id: 12, url: 'https://images.unsplash.com/photo-1560185127-6ed189bf02f4', caption: 'Modern Hotel Interior' },
        { id: 13, url: 'https://images.unsplash.com/photo-1522770179533-24471fcdba45', caption: 'Premium Bedroom Design' },
        { id: 14, url: 'https://images.unsplash.com/photo-1584132967334-10e028bd69f7', caption: 'Luxury Bathroom Interior' },
        { id: 15, url: 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85', caption: 'Elegant Villa Interior' }
      ],
    },

    services: {
       title: 'Experiences & Services',
      description: 'Enjoy personalized services such as concierge assistance, private transport, guided experiences, and curated activities designed to enhance your stay.',
      images: [
        { id: 1, url: 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4', caption: 'Luxury Concierge Service' },
        { id: 2, url: 'https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&w=800&q=80', caption: 'Private Butler Service' },
        { id: 3, url: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d', caption: 'Hotel Reception Service' },
        { id: 4, url: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4', caption: 'Fine Dining Experience' },
        { id: 5, url: 'https://images.unsplash.com/photo-1528605248644-14dd04022da1', caption: 'Luxury Chauffeur Service' },
        { id: 6, url: 'https://images.unsplash.com/photo-1494526585095-c41746248156', caption: 'Airport Transfer Service' },
        { id: 7, url: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70', caption: 'Luxury Car Service' },
        { id: 8, url: 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb', caption: 'Resort Experience Night' },
        { id: 9, url: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee', caption: 'Guided Tour Experience' },
        { id: 10, url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e', caption: 'Beach Leisure Experience' },
        { id: 11, url: 'https://images.unsplash.com/photo-1504609813442-a8924e83f76e', caption: 'Yacht Experience' },
        { id: 12, url: 'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1', caption: 'Adventure Travel Experience' },
        { id: 13, url: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773', caption: 'Spa Wellness Service' },
        { id: 14, url: 'https://images.unsplash.com/photo-1492724441997-5dc865305da7', caption: 'Luxury Lounge Experience' },
        { id: 15, url: 'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&w=800&q=80', caption: 'Event and Wedding Service' },
      ],
    },
  };

  const categories = [
    { id: 'rooms',      label: 'Luxury Rooms',   sub: 'Suites & Bedrooms' },
    { id: 'pool',       label: 'Swimming Pool',   sub: 'Aqua & Wellness' },
    { id: 'restaurant', label: 'Restaurant',      sub: 'Fine Dining' },
    { id: 'spa',        label: 'Spa Center',      sub: 'Relax & Rejuvenate' },
    { id: 'food', label: 'Foods & Dining', sub: 'Taste Luxury Cuisine' },
    { id: 'exclusive', label: 'Exclusive Features', sub: 'Luxury Redefined', },
    { id: 'services', label: 'Experiences & Services', sub: 'Personalized Luxury', },
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
            {current.images.length} <span>photos</span>
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