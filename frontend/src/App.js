// frontend/src/App.js

import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LandingPage      from './pages/LandingPage';
import GalleryPage      from './pages/GalleryPage';
import Booking          from './pages/Booking';
import Dashboard        from './pages/Dashboard';
import Receptionist     from './pages/Receptionist';
import AdminLayout      from './pages/admin/AdminLayout';
import AdminDashboard   from './pages/admin/AdminDashboard';
import RoomsPage        from './pages/admin/RoomsPage';
import RoomDetailPage   from './pages/admin/RoomDetailPage';
import ReservationsPage from './pages/admin/ReservationsPage';
import UsersPage        from './pages/admin/UsersPage';
import SettingsPage     from './pages/admin/Settingspage';
import HousekeeperLayout    from './pages/housekeeper/HousekeeperLayout';
import RoomManagement       from './pages/housekeeper/RoomManagement';
import HousekeeperSettings  from './pages/housekeeper/HousekeeperSettings';
import HousekeeperRoomsView from './pages/housekeeper/HousekeeperRoomsView';

// ── Receptionist ────────────────────────────────────────────────
import ReceptionistLayout   from './pages/receptionist/ReceptionistLayout';
import ReceptionistBookings from './pages/receptionist/ReceptionistBookings';
import ReceptionistRooms    from './pages/receptionist/ReceptionistRooms';
import ReceptionistSettings from './pages/receptionist/ReceptionistSettings';

import './App.css';

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

        {/* ── Admin ──────────────────────────────────────────── */}
        <Route path="/admin" element={<ProtectedRoute><AdminLayout /></ProtectedRoute>}>
          <Route index element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="dashboard"    element={<AdminDashboard />} />
          <Route path="rooms"        element={<RoomsPage />} />
          <Route path="rooms/:id"    element={<RoomDetailPage />} />
          <Route path="reservations" element={<ReservationsPage />} />
          <Route path="users"        element={<UsersPage />} />
          <Route path="settings"     element={<SettingsPage />} />
        </Route>

        {/* ── Housekeeper ────────────────────────────────────── */}
        <Route path="/housekeeper" element={<ProtectedRoute><HousekeeperLayout /></ProtectedRoute>}>
          <Route index     element={<Navigate to="rooms" replace />} />
          <Route path="rooms"     element={<RoomManagement />} />
          <Route path="all-rooms" element={<HousekeeperRoomsView />} />
          <Route path="settings"  element={<HousekeeperSettings />} />
        </Route>

        {/* ── Receptionist ───────────────────────────────────── */}
        <Route path="/receptionist" element={<ProtectedRoute><ReceptionistLayout /></ProtectedRoute>}>
          <Route index       element={<Navigate to="bookings" replace />} />
          <Route path="bookings" element={<ReceptionistBookings />} />
          <Route path="rooms"    element={<ReceptionistRooms />} />
          <Route path="settings" element={<ReceptionistSettings />} />
        </Route>

        {/* ── Catch-all ──────────────────────────────────────── */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
}

export default App;