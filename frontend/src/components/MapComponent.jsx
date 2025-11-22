// frontend/src/components/MapComponent.jsx
import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './MapComponent.css';

// Fix for marker icons in React
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const MapComponent = ({ 
  latitude = 40.7128, 
  longitude = -74.0060, 
  hotelName = 'Our Hotel',
  address = '123 Main Street',
  zoomLevel = 15
}) => {
  const mapContainer = useRef(null);
  const mapInstance = useRef(null);

  useEffect(() => {
    // Only initialize if not already done
    if (mapInstance.current) {
      mapInstance.current.setView([latitude, longitude], zoomLevel);
      return;
    }

    // Create map
    const map = L.map(mapContainer.current).setView([latitude, longitude], zoomLevel);

    // Add OpenStreetMap tiles (FREE - No API key needed!)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19,
      minZoom: 2,
    }).addTo(map);

    // Create custom marker with red icon
    const redMarkerIcon = L.icon({
      iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41]
    });

    // Add marker at hotel location
    const marker = L.marker([latitude, longitude], { icon: redMarkerIcon });

    // Create popup with hotel info
    const popupContent = `
      <div class="map-popup">
        <div class="popup-header">
          <h4>${hotelName}</h4>
        </div>
        <div class="popup-body">
          <p class="popup-address">
            <strong>📍 Address:</strong> ${address}
          </p>
          <p class="popup-coords">
            <strong>🧭 Coordinates:</strong> ${latitude.toFixed(4)}, ${longitude.toFixed(4)}
          </p>
        </div>
      </div>
    `;

    marker.bindPopup(popupContent, {
      maxWidth: 300,
      className: 'custom-popup'
    }).addTo(map);

    // Open popup by default
    marker.openPopup();

    // Add click event to marker
    marker.on('click', function() {
      console.log(`Hotel: ${hotelName} at ${latitude}, ${longitude}`);
    });

    // Add map controls
    L.control.scale().addTo(map);

    // Store map instance
    mapInstance.current = map;

    // Handle window resize
    const handleResize = () => {
      if (mapInstance.current) {
        setTimeout(() => {
          mapInstance.current.invalidateSize();
        }, 100);
      }
    };

    window.addEventListener('resize', handleResize);

    // Cleanup function
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [latitude, longitude, hotelName, address, zoomLevel]);

  return (
    <div className="map-component">
      <div 
        ref={mapContainer}
        className="map-container"
        id="map"
      />
    </div>
  );
};

export default MapComponent;