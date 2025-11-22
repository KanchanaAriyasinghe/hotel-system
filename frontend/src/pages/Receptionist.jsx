// frontend/src/pages/Receptionist.jsx

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, Users, Calendar, Phone, FileText } from 'lucide-react';
import './Receptionist.css';
import receptionist from "../assets/receptionist.jpeg";

const Receptionist = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('bookings');

  useEffect(() => {
    // Check if user is logged in and is receptionist
    const storedUser = localStorage.getItem('user');
    console.log('Stored User in Receptionist:', storedUser);
    
    if (!storedUser) {
      console.log('No user found, redirecting to home');
      navigate('/');
      return;
    }

    try {
      const userData = JSON.parse(storedUser);
      console.log('Parsed User data:', userData);
      console.log('User role:', userData.role);
      console.log('Role type:', typeof userData.role);
      
      // Allow both receptionist and any variation
      const userRole = userData.role ? userData.role.toString().toLowerCase().trim() : '';
      console.log('Normalized role:', userRole);
      
      if (userRole !== 'receptionist') {
        console.log(`User role '${userRole}' is not receptionist, but allowing anyway for testing`);
        // Temporarily comment this out for testing
        // navigate('/');
        // return;
      }

      setUser(userData);
      setLoading(false);
    } catch (error) {
      console.error('Error parsing user data:', error);
      navigate('/');
    }
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/');
  };

  if (loading) {
    return (
      <div className="receptionist-loading">
        <div className="loading-spinner"></div>
        <p>Loading Receptionist Portal...</p>
      </div>
    );
  }

  return (
    <div className="receptionist">
      {/* Sidebar */}
      <aside className="receptionist-sidebar">
        <div className="sidebar-header">
          <h1>📞 Receptionist</h1>
        </div>

        <nav className="sidebar-nav">
          <button 
            className={`nav-item ${activeTab === 'bookings' ? 'active' : ''}`}
            onClick={() => setActiveTab('bookings')}
          >
            <Calendar size={20} />
            <span>Bookings</span>
          </button>
          <button 
            className={`nav-item ${activeTab === 'guests' ? 'active' : ''}`}
            onClick={() => setActiveTab('guests')}
          >
            <Users size={20} />
            <span>Guests</span>
          </button>
          <button 
            className={`nav-item ${activeTab === 'calls' ? 'active' : ''}`}
            onClick={() => setActiveTab('calls')}
          >
            <Phone size={20} />
            <span>Calls</span>
          </button>
          <button 
            className={`nav-item ${activeTab === 'reports' ? 'active' : ''}`}
            onClick={() => setActiveTab('reports')}
          >
            <FileText size={20} />
            <span>Reports</span>
          </button>
        </nav>

        <div className="sidebar-footer">
          <button className="logout-btn" onClick={handleLogout}>
            <LogOut size={20} />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="receptionist-content">
        {/* Header */}
        <div className="receptionist-header">
          <h2>Welcome, {user?.fullName}!</h2>
          <div className="user-info">
            <span className="user-role">Receptionist</span>
            <img 
              src={receptionist}
              alt="Avatar" 
              className="user-avatar"
            />
          </div>
        </div>

        {/* Content Sections */}
        {activeTab === 'bookings' && (
          <section className="content-section">
            <h3>Manage Bookings</h3>
            <div className="bookings-list">
              <div className="booking-card">
                <div className="booking-header">
                  <h4>Room 101 - John Doe</h4>
                  <span className="status confirmed">Confirmed</span>
                </div>
                <p><strong>Check-in:</strong> 2024-01-15</p>
                <p><strong>Check-out:</strong> 2024-01-18</p>
                <p><strong>Room Type:</strong> Deluxe Suite</p>
                <div className="booking-actions">
                  <button className="btn-small">Modify</button>
                  <button className="btn-small">Cancel</button>
                </div>
              </div>

              <div className="booking-card">
                <div className="booking-header">
                  <h4>Room 205 - Jane Smith</h4>
                  <span className="status pending">Pending</span>
                </div>
                <p><strong>Check-in:</strong> 2024-01-16</p>
                <p><strong>Check-out:</strong> 2024-01-19</p>
                <p><strong>Room Type:</strong> Standard Room</p>
                <div className="booking-actions">
                  <button className="btn-small">Confirm</button>
                  <button className="btn-small">Cancel</button>
                </div>
              </div>

              <div className="booking-card">
                <div className="booking-header">
                  <h4>Room 302 - Mike Johnson</h4>
                  <span className="status confirmed">Confirmed</span>
                </div>
                <p><strong>Check-in:</strong> 2024-01-17</p>
                <p><strong>Check-out:</strong> 2024-01-20</p>
                <p><strong>Room Type:</strong> Suite</p>
                <div className="booking-actions">
                  <button className="btn-small">Modify</button>
                  <button className="btn-small">Cancel</button>
                </div>
              </div>
            </div>
          </section>
        )}

        {activeTab === 'guests' && (
          <section className="content-section">
            <h3>Guest Information</h3>
            <div className="guests-table">
              <table>
                <thead>
                  <tr>
                    <th>Guest Name</th>
                    <th>Room</th>
                    <th>Check-in</th>
                    <th>Check-out</th>
                    <th>Contact</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>John Doe</td>
                    <td>101</td>
                    <td>2024-01-15</td>
                    <td>2024-01-18</td>
                    <td>+1-555-1234</td>
                    <td><button className="btn-small">View</button></td>
                  </tr>
                  <tr>
                    <td>Jane Smith</td>
                    <td>205</td>
                    <td>2024-01-16</td>
                    <td>2024-01-19</td>
                    <td>+1-555-5678</td>
                    <td><button className="btn-small">View</button></td>
                  </tr>
                  <tr>
                    <td>Mike Johnson</td>
                    <td>302</td>
                    <td>2024-01-17</td>
                    <td>2024-01-20</td>
                    <td>+1-555-9012</td>
                    <td><button className="btn-small">View</button></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>
        )}

        {activeTab === 'calls' && (
          <section className="content-section">
            <h3>Call Logs</h3>
            <div className="calls-list">
              <div className="call-item">
                <div className="call-info">
                  <p><strong>Room 101</strong> - John Doe</p>
                  <p className="call-time">2024-01-15 14:30</p>
                </div>
                <p className="call-subject">Room Service Request</p>
                <span className="status completed">Completed</span>
              </div>

              <div className="call-item">
                <div className="call-info">
                  <p><strong>Room 205</strong> - Jane Smith</p>
                  <p className="call-time">2024-01-16 10:15</p>
                </div>
                <p className="call-subject">Checkout Inquiry</p>
                <span className="status pending">Pending</span>
              </div>

              <div className="call-item">
                <div className="call-info">
                  <p><strong>Room 302</strong> - Mike Johnson</p>
                  <p className="call-time">2024-01-17 16:45</p>
                </div>
                <p className="call-subject">Maintenance Request</p>
                <span className="status completed">Completed</span>
              </div>
            </div>
          </section>
        )}

        {activeTab === 'reports' && (
          <section className="content-section">
            <h3>Daily Reports</h3>
            <div className="reports-grid">
              <div className="report-card">
                <h4>Today's Checkings</h4>
                <p className="report-number">8</p>
                <p className="report-desc">Check-ins/Check-outs</p>
              </div>

              <div className="report-card">
                <h4>Occupancy Rate</h4>
                <p className="report-number">85%</p>
                <p className="report-desc">Current occupancy</p>
              </div>

              <div className="report-card">
                <h4>Pending Issues</h4>
                <p className="report-number">3</p>
                <p className="report-desc">Guest requests</p>
              </div>

              <div className="report-card">
                <h4>Total Guests</h4>
                <p className="report-number">45</p>
                <p className="report-desc">Currently staying</p>
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  );
};

export default Receptionist;