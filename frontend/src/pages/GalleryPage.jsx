// frontend/src/pages/GalleryPage.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, X } from 'lucide-react';
import './GalleryPage.css';

const GalleryPage = () => {
  const navigate = useNavigate();
  const [selectedImage, setSelectedImage] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('rooms');

  // Gallery data organized by category
  const galleryData = {
    rooms: {
      title: 'Luxury Rooms',
      description: 'Experience comfort in our beautifully designed rooms',
      images: [
        {
          id: 1,
          url: 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=800&h=600&fit=crop',
          caption: 'Deluxe Room with King Bed'
        },
        {
          id: 2,
          url: 'https://th.bing.com/th/id/OIP.VqrCp12sHQIsfF_NQtZZSwHaE_?o=7rm=3&rs=1&pid=ImgDetMain&o=7&rm=3',
          caption: 'Room with City View'
        },
        {
          id: 3,
          url: 'https://www.homestratosphere.com/wp-content/uploads/2019/02/master-bedroom-sitting-area-design-hz-7-feb072019-min.jpg',
          caption: 'Suite with Bedroom and Living Area'
        },
        {
          id: 4,
          url: 'https://www.carpentry.sg/wp-content/uploads/2023/04/Jalan-Greja_Website_08.jpg',
          caption: 'Modern Bedroom with Amenities'
        },
        {
          id: 5,
          url: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&h=600&fit=crop',
          caption: 'Spacious Room with Balcony'
        },
        {
          id: 6,
          url: 'https://tse1.mm.bing.net/th/id/OIP.ABqXFuAsE0hP1jEjf1dGBAHaFj?rs=1&pid=ImgDetMain&o=7&rm=3',
          caption: 'Luxury Twin Room'
        }
      ]
    },
    pool: {
      title: 'Swimming Pool',
      description: 'Relax and swim in our Olympic-sized pool',
      images: [
        {
          id: 7,
          url: 'https://th.bing.com/th/id/R.89dbf894243f879085ff9995052cd63e?rik=9xMnHcr5UXoc1w&pid=ImgRaw&r=0',
          caption: 'Olympic-Sized Swimming Pool'
        },
        {
          id: 8,
          url: 'https://th.bing.com/th/id/R.aa5ac52eb2c1d1a70907a48d7688c0ed?rik=d%2ftwQDLrjILDjw&pid=ImgRaw&r=0',
          caption: 'Pool Area with Lounge Chairs'
        },
        {
          id: 9,
          url: 'https://images.fineartamerica.com/images/artworkimages/mediumlarge/3/evening-pool-view-in-bucaramanga-danaan-andrew.jpg',
          caption: 'Evening Pool View'
        },
        {
          id: 10,
          url: 'https://lucaslagoons.com/wp-content/gallery/luxury-pools-with-waterfalls/Luxury-Pools-With-Waterfalls18.jpg',
          caption: 'Pool with Waterfall Feature'
        },
        {
          id: 11,
          url: 'https://th.bing.com/th/id/R.4346c7426cd68432dc67f77e6df6c2ba?rik=hZHPrUOreMhgkA&pid=ImgRaw&r=0',
          caption: 'Kids Pool Area'
        },
        {
          id: 12,
          url: 'https://thumbs.dreamstime.com/b/outdoor-pool-bar-night-luxury-resort-travel-lifestyle-photo-outdoor-pool-bar-night-luxury-resort-travel-lifestyle-331737121.jpg',
          caption: 'Poolside Bar and Seating'
        }
      ]
    },
    restaurant: {
      title: 'Restaurant',
      description: 'Fine dining experience with international cuisine',
      images: [
        {
          id: 13,
          url: 'https://tse4.mm.bing.net/th/id/OIP.tgMFhjnh_lvSqkqSUO4phwHaEl?rs=1&pid=ImgDetMain&o=7&rm=3',
          caption: 'Main Dining Hall'
        },
        {
          id: 14,
          url: 'https://i.pinimg.com/736x/e2/26/13/e22613561d435dd62dde486c7edf0bef.jpg',
          caption: 'Elegant Table Setting'
        },
        {
          id: 15,
          url: 'https://static.vecteezy.com/system/resources/previews/024/570/962/non_2x/portrait-of-a-professional-chef-standing-in-the-kitchen-of-a-restaurant-a-chefs-full-rear-view-inside-a-modern-kitchen-preparing-exquisite-dishes-ai-generated-free-photo.jpg',
          caption: 'Kitchen with Chef'
        },
        {
          id: 16,
          url: 'https://tse2.mm.bing.net/th/id/OIP.QSd_Qv2ZxpTPXQHIAjsb5gHaE9?rs=1&pid=ImgDetMain&o=7&rm=3',
          caption: 'Buffet Section'
        },
        {
          id: 17,
          url: 'https://tse2.mm.bing.net/th/id/OIP.rIsRZWsU8eFrSO8Rklj2egHaE8?rs=1&pid=ImgDetMain&o=7&rm=3',
          caption: 'Indoor Restaurant Ambiance'
        },
        {
          id: 18,
          url: 'https://th.bing.com/th/id/R.e2d74c77832424a84b1399ec724d1b42?rik=19kuGCKpHSA8Yg&riu=http%3a%2f%2fwww.quiet-corner.com%2fwp-content%2fuploads%2f2016%2f04%2fDesigning-an-Outdoor-Dining-Area-4.jpg&ehk=Wr2NSKeJ%2bP4w%2fLLyAwD2Zaf6EKMSZ%2bFdDGEqMDOINMU%3d&risl=&pid=ImgRaw&r=0',
          caption: 'Outdoor Dining Area'
        }
      ]
    },
    spa: {
      title: 'Spa Center',
      description: 'Relax and rejuvenate in our world-class spa',
      images: [
        {
          id: 19,
          url: 'https://tse3.mm.bing.net/th/id/OIP.TA3gSZuImQh65eYK8EB-LgHaE9?rs=1&pid=ImgDetMain&o=7&rm=3',
          caption: 'Spa Treatment Room'
        },
        {
          id: 20,
          url: 'https://img.freepik.com/premium-photo/beautifully-candlelit-massage-room-spa-salon_908985-108990.jpg',
          caption: 'Massage Area with Candlelight'
        },
        {
          id: 21,
          url: 'https://tse4.mm.bing.net/th/id/OIP.UYY38_2CeeEqdDTe1JP2CQHaEo?rs=1&pid=ImgDetMain&o=7&rm=3',
          caption: 'Sauna Facilities'
        },
        {
          id: 22,
          url: 'https://tse4.mm.bing.net/th/id/OIP.1UE2bMZ5N93KGaMXGxzinAHaEy?rs=1&pid=ImgDetMain&o=7&rm=3',
          caption: 'Relaxation Lounge'
        },
        {
          id: 23,
          url: 'https://tse3.mm.bing.net/th/id/OIP.At539UdcrmMwbuz6uVw9aAHaEA?rs=1&pid=ImgDetMain&o=7&rm=3',
          caption: 'Spa Pool'
        },
        {
          id: 24,
          url: 'https://tse4.mm.bing.net/th/id/OIP.vVgMfRkpEOJMH8V7dAhGUwHaE8?w=1440&h=960&rs=1&pid=ImgDetMain&o=7&rm=3',
          caption: 'Facial Treatment Room'
        }
      ]
    }
  };

  const categories = [
    { id: 'rooms', label: 'Luxury Rooms', icon: '🛏️' },
    { id: 'pool', label: 'Swimming Pool', icon: '🌊' },
    { id: 'restaurant', label: 'Restaurant', icon: '🍽️' },
    { id: 'spa', label: 'Spa Center', icon: '💆' }
  ];

  const currentCategory = galleryData[selectedCategory];

  return (
    <div className="gallery-page">
      {/* Header */}
      <div className="gallery-header">
        <button className="back-btn" onClick={() => navigate('/')}>
          <ArrowLeft size={24} />
          Back to Home
        </button>
        <h1>Gallery</h1>
      </div>

      {/* Category Tabs */}
      <div className="gallery-tabs">
        {categories.map(cat => (
          <button
            key={cat.id}
            className={`tab-btn ${selectedCategory === cat.id ? 'active' : ''}`}
            onClick={() => setSelectedCategory(cat.id)}
          >
            <span className="tab-icon">{cat.icon}</span>
            <span className="tab-label">{cat.label}</span>
          </button>
        ))}
      </div>

      {/* Category Title and Description */}
      <div className="category-header">
        <h2>{currentCategory.title}</h2>
        <p>{currentCategory.description}</p>
      </div>

      {/* Image Grid */}
      <div className="gallery-grid-container">
        <div className="gallery-grid">
          {currentCategory.images.map(image => (
            <div
              key={image.id}
              className="gallery-grid-item"
              onClick={() => setSelectedImage(image)}
            >
              <img src={image.url} alt={image.caption} />
              <div className="image-overlay">
                <p>{image.caption}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Lightbox Modal */}
      {selectedImage && (
        <div className="lightbox" onClick={() => setSelectedImage(null)}>
          <div className="lightbox-content" onClick={e => e.stopPropagation()}>
            <button 
              className="lightbox-close"
              onClick={() => setSelectedImage(null)}
            >
              <X size={32} />
            </button>
            <img src={selectedImage.url} alt={selectedImage.caption} />
            <div className="lightbox-caption">
              <p>{selectedImage.caption}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GalleryPage;