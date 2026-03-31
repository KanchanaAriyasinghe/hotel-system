// frontend/src/pages/Dashboard.jsx
// This file now acts as a thin redirect wrapper.
// All admin logic lives in pages/admin/AdminDashboard.jsx

import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const Dashboard = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (!stored) { navigate('/'); return; }

    const user = JSON.parse(stored);
    if (user.role === 'admin') {
      navigate('/admin/dashboard', { replace: true });
    } else {
      // Non-admin staff land on a different route if needed
      navigate('/', { replace: true });
    }
  }, [navigate]);

  return null;
};

export default Dashboard;