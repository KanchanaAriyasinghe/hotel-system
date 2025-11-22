// frontend/src/pages/Housekeeper.jsx

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, Home, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import './Housekeeper.css';
import housekeeper from "../assets/housekeeper.jpeg";

const Housekeeper = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [roomFilter, setRoomFilter] = useState('all');

  useEffect(() => {
    // Check if user is logged in and is housekeeper
    const storedUser = localStorage.getItem('user');
    console.log('Stored User in Housekeeper:', storedUser);
    
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
      
      // Allow both housekeeper and any variation
      const userRole = userData.role ? userData.role.toString().toLowerCase().trim() : '';
      console.log('Normalized role:', userRole);
      
      if (userRole !== 'housekeeper') {
        console.log(`User role '${userRole}' is not housekeeper, but allowing anyway for testing`);
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

  const handleRoomStatusChange = (roomId, status) => {
    console.log(`Room ${roomId} status changed to ${status}`);
    // Add your API call here
  };

  if (loading) {
    return (
      <div className="housekeeper-loading">
        <div className="loading-spinner"></div>
        <p>Loading Housekeeping Portal...</p>
      </div>
    );
  }

  return (
    <div className="housekeeper">
      {/* Sidebar */}
      <aside className="housekeeper-sidebar">
        <div className="sidebar-header">
          <h1>🧹 Housekeeping</h1>
        </div>

        <nav className="sidebar-nav">
          <button 
            className={`nav-item ${roomFilter === 'all' ? 'active' : ''}`}
            onClick={() => setRoomFilter('all')}
          >
            <Home size={20} />
            <span>All Rooms</span>
          </button>
          <button 
            className={`nav-item ${roomFilter === 'clean' ? 'active' : ''}`}
            onClick={() => setRoomFilter('clean')}
          >
            <CheckCircle size={20} />
            <span>Clean</span>
          </button>
          <button 
            className={`nav-item ${roomFilter === 'dirty' ? 'active' : ''}`}
            onClick={() => setRoomFilter('dirty')}
          >
            <AlertCircle size={20} />
            <span>Dirty</span>
          </button>
          <button 
            className={`nav-item ${roomFilter === 'pending' ? 'active' : ''}`}
            onClick={() => setRoomFilter('pending')}
          >
            <Clock size={20} />
            <span>Pending</span>
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
      <main className="housekeeper-content">
        {/* Header */}
        <div className="housekeeper-header">
          <h2>Welcome, {user?.fullName}!</h2>
          <div className="user-info">
            <span className="user-role">Housekeeper</span>
            <img 
              src={housekeeper} 
              alt="Avatar" 
              className="user-avatar"
            />
          </div>
        </div>

        {/* Stats Summary */}
        <div className="stats-summary">
          <div className="stat-item">
            <p className="stat-label">Total Rooms</p>
            <p className="stat-value">50</p>
          </div>
          <div className="stat-item">
            <p className="stat-label">Clean</p>
            <p className="stat-value" style={{ color: '#28a745' }}>32</p>
          </div>
          <div className="stat-item">
            <p className="stat-label">Dirty</p>
            <p className="stat-value" style={{ color: '#dc3545' }}>12</p>
          </div>
          <div className="stat-item">
            <p className="stat-label">Pending</p>
            <p className="stat-value" style={{ color: '#ffc107' }}>6</p>
          </div>
        </div>

        {/* Rooms Grid */}
        <section className="rooms-section">
          <h3>Room Status</h3>
          <div className="rooms-grid">
            {/* Clean Rooms */}
            <div className="room-card clean">
              <div className="room-number">101</div>
              <div className="room-floor">1st Floor</div>
              <div className="room-status">
                <CheckCircle size={20} />
                <span>Clean</span>
              </div>
              <button 
                className="room-action-btn"
                onClick={() => handleRoomStatusChange(101, 'dirty')}
              >
                Mark Dirty
              </button>
            </div>

            <div className="room-card clean">
              <div className="room-number">102</div>
              <div className="room-floor">1st Floor</div>
              <div className="room-status">
                <CheckCircle size={20} />
                <span>Clean</span>
              </div>
              <button 
                className="room-action-btn"
                onClick={() => handleRoomStatusChange(102, 'dirty')}
              >
                Mark Dirty
              </button>
            </div>

            {/* Dirty Rooms */}
            <div className="room-card dirty">
              <div className="room-number">201</div>
              <div className="room-floor">2nd Floor</div>
              <div className="room-status">
                <AlertCircle size={20} />
                <span>Dirty</span>
              </div>
              <button 
                className="room-action-btn"
                onClick={() => handleRoomStatusChange(201, 'clean')}
              >
                Mark Clean
              </button>
            </div>

            <div className="room-card dirty">
              <div className="room-number">202</div>
              <div className="room-floor">2nd Floor</div>
              <div className="room-status">
                <AlertCircle size={20} />
                <span>Dirty</span>
              </div>
              <button 
                className="room-action-btn"
                onClick={() => handleRoomStatusChange(202, 'clean')}
              >
                Mark Clean
              </button>
            </div>

            {/* Pending Rooms */}
            <div className="room-card pending">
              <div className="room-number">301</div>
              <div className="room-floor">3rd Floor</div>
              <div className="room-status">
                <Clock size={20} />
                <span>Pending</span>
              </div>
              <button 
                className="room-action-btn"
                onClick={() => handleRoomStatusChange(301, 'clean')}
              >
                Mark Clean
              </button>
            </div>

            <div className="room-card pending">
              <div className="room-number">302</div>
              <div className="room-floor">3rd Floor</div>
              <div className="room-status">
                <Clock size={20} />
                <span>Pending</span>
              </div>
              <button 
                className="room-action-btn"
                onClick={() => handleRoomStatusChange(302, 'clean')}
              >
                Mark Clean
              </button>
            </div>
          </div>
        </section>

        {/* Maintenance Issues */}
        <section className="maintenance-section">
          <h3>Maintenance Issues</h3>
          <div className="issues-list">
            <div className="issue-item">
              <div className="issue-room">Room 105</div>
              <p className="issue-desc">AC not working properly</p>
              <span className="issue-priority high">High Priority</span>
            </div>

            <div className="issue-item">
              <div className="issue-room">Room 204</div>
              <p className="issue-desc">Broken door handle</p>
              <span className="issue-priority medium">Medium Priority</span>
            </div>

            <div className="issue-item">
              <div className="issue-room">Room 305</div>
              <p className="issue-desc">Leaking faucet</p>
              <span className="issue-priority medium">Medium Priority</span>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default Housekeeper;