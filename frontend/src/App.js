// frontend/src/App.js
import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import axios from 'axios';
import LandingPage from './pages/LandingPage';
import GalleryPage from './pages/GalleryPage';
import Booking from './pages/Booking';
import Dashboard from './pages/Dashboard';
import Receptionist from './pages/Receptionist';
import Housekeeper from './pages/Housekeeper';
import './App.css';

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  return token ? children : <Navigate to="/" />;
};

function App() {
  return (
    <Router>
      <Routes>
        {/* Landing Page */}
        <Route path="/" element={<LandingPage />} />

        {/* Gallery Page */}
        <Route path="/gallery" element={<GalleryPage />} />

        {/* Booking Page */}
  <Route path="/booking" element={<Booking />} />


        {/* Dashboard - Protected (Admin) */}
        <Route 
          path="/dashboard" 
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } 
        />

        {/* Receptionist - Protected */}
        <Route 
          path="/receptionist" 
          element={
            <ProtectedRoute>
              <Receptionist />
            </ProtectedRoute>
          } 
        />

        {/* Housekeeper - Protected */}
        <Route 
          path="/housekeeper" 
          element={
            <ProtectedRoute>
              <Housekeeper />
            </ProtectedRoute>
          } 
        />

        {/* Catch all - redirect to home */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
}

export default App;