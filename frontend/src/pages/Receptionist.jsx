// frontend/src/pages/Receptionist.jsx
// This file is no longer needed as a standalone page —
// it's kept only for the old /receptionist redirect.
// The real UI now lives under ReceptionistLayout (nested routes).

import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const Receptionist = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (!stored) { navigate('/'); return; }
    const user = JSON.parse(stored);
    if (user.role === 'receptionist') {
      navigate('/receptionist/bookings', { replace: true });
    } else {
      navigate('/', { replace: true });
    }
  }, [navigate]);

  return null;
};

export default Receptionist;