// frontend/src/pages/Housekeeper.jsx

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, Home, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import './Housekeeper.css';


const Housekeeper = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (!stored) { navigate('/'); return; }

    const user = JSON.parse(stored);
    if (user.role === 'housekeeper') {
      navigate('/housekeeper', { replace: true });
    } else {
      // Non-admin staff land on a different route if needed
      navigate('/', { replace: true });
    }
  }, [navigate]);

  return null;
};

export default Housekeeper;