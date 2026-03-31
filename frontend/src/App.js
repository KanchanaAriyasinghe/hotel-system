// frontend/src/App.js
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LandingPage    from './pages/LandingPage';
import GalleryPage    from './pages/GalleryPage';
import Booking        from './pages/Booking';
import Dashboard      from './pages/Dashboard';
import Receptionist   from './pages/Receptionist';
import Housekeeper    from './pages/Housekeeper';
import AdminLayout    from './pages/admin/AdminLayout';      // ← shared sidebar
import AdminDashboard from './pages/admin/AdminDashboard';
import RoomsPage      from './pages/admin/RoomsPage';
import RoomDetailPage from './pages/admin/RoomDetailPage';
import ReservationsPage from './pages/admin/ReservationsPage';
import UsersPage from './pages/admin/UsersPage';
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
        {/* ── Public ─────────────────────────────────────────── */}
        <Route path="/"        element={<LandingPage />} />
        <Route path="/gallery" element={<GalleryPage />} />
        <Route path="/booking" element={<Booking />} />

        {/* ── Non-admin protected ────────────────────────────── */}
        <Route path="/dashboard"    element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/receptionist" element={<ProtectedRoute><Receptionist /></ProtectedRoute>} />
        <Route path="/housekeeper"  element={<ProtectedRoute><Housekeeper /></ProtectedRoute>} />

        {/* ── Admin — all share the sidebar via AdminLayout ───── */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          {/* /admin  →  redirect to /admin/dashboard */}
          <Route index element={<Navigate to="/admin/dashboard" replace />} />

          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="rooms"     element={<RoomsPage />} />
          <Route path="rooms/:id" element={<RoomDetailPage />} />

          {/* Add future admin pages here — sidebar appears automatically */}
          <Route path="reservations" element={<ReservationsPage />} />
          <Route path="users"        element={<UsersPage />} />       
          {/* <Route path="settings"     element={<SettingsPage />} />     */}
        </Route>

        {/* ── Catch-all ──────────────────────────────────────── */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
}

export default App;