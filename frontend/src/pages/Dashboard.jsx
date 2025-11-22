// frontend/src/pages/Dashboard.jsx

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, Users, Building2, BarChart3, Settings } from 'lucide-react';
import './Dashboard.css';
import admin from "../assets/admin.png";

const Dashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is logged in and is admin
    const storedUser = localStorage.getItem('user');
    console.log('Stored User:', storedUser);
    
    if (!storedUser) {
      console.log('No user found, redirecting to home');
      navigate('/');
      return;
    }

    const userData = JSON.parse(storedUser);
    console.log('User data:', userData);
    console.log('User role:', userData.role);
    
    if (userData.role !== 'admin') {
      console.log('User role is not admin, redirecting to home');
      navigate('/');
      return;
    }

    setUser(userData);
    setLoading(false);
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/');
  };

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="loading-spinner"></div>
        <p>Loading Dashboard...</p>
      </div>
    );
  }

  return (
    <div className="dashboard">
      {/* Sidebar */}
      <aside className="dashboard-sidebar">
        <div className="sidebar-header">
          <h1>🏨 Admin Panel</h1>
        </div>

        <nav className="sidebar-nav">
          <a href="#overview" className="nav-item active">
            <BarChart3 size={20} />
            <span>Overview</span>
          </a>
          <a href="#users" className="nav-item">
            <Users size={20} />
            <span>Users</span>
          </a>
          <a href="#properties" className="nav-item">
            <Building2 size={20} />
            <span>Properties</span>
          </a>
          <a href="#settings" className="nav-item">
            <Settings size={20} />
            <span>Settings</span>
          </a>
        </nav>

        <div className="sidebar-footer">
          <button className="logout-btn" onClick={handleLogout}>
            <LogOut size={20} />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="dashboard-content">
        {/* Header */}
        <div className="dashboard-header">
          <h2>Welcome, {user?.fullName}!</h2>
          <div className="user-info">
            <span className="user-role">Admin/Manager</span>
            <img 
              src={admin} 
              alt="Avatar" 
              className="user-avatar"
            />
          </div>
        </div>

        {/* Stats Grid */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon" style={{ background: '#667eea' }}>
              <Users size={24} color="white" />
            </div>
            <div className="stat-content">
              <h3>Total Users</h3>
              <p className="stat-value">1,234</p>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon" style={{ background: '#764ba2' }}>
              <Building2 size={24} color="white" />
            </div>
            <div className="stat-content">
              <h3>Total Rooms</h3>
              <p className="stat-value">156</p>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon" style={{ background: '#f093fb' }}>
              <BarChart3 size={24} color="white" />
            </div>
            <div className="stat-content">
              <h3>Bookings</h3>
              <p className="stat-value">892</p>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon" style={{ background: '#4facfe' }}>
              <Building2 size={24} color="white" />
            </div>
            <div className="stat-content">
              <h3>Revenue</h3>
              <p className="stat-value">$45.2K</p>
            </div>
          </div>
        </div>

        {/* Content Sections */}
        <div className="dashboard-sections">
          <section className="dashboard-section">
            <h3>Recent Activity</h3>
            <div className="activity-list">
              <div className="activity-item">
                <div className="activity-dot"></div>
                <div className="activity-content">
                  <p className="activity-title">New user registered</p>
                  <p className="activity-time">2 hours ago</p>
                </div>
              </div>
              <div className="activity-item">
                <div className="activity-dot"></div>
                <div className="activity-content">
                  <p className="activity-title">Room booking confirmed</p>
                  <p className="activity-time">5 hours ago</p>
                </div>
              </div>
              <div className="activity-item">
                <div className="activity-dot"></div>
                <div className="activity-content">
                  <p className="activity-title">Maintenance request submitted</p>
                  <p className="activity-time">1 day ago</p>
                </div>
              </div>
            </div>
          </section>

          <section className="dashboard-section">
            <h3>Quick Actions</h3>
            <div className="quick-actions">
              <button className="action-btn">Add New User</button>
              <button className="action-btn">Add New Room</button>
              <button className="action-btn">View Reports</button>
              <button className="action-btn">Manage Roles</button>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;