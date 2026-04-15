// frontend/src/context/GuestAuthContext.js

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const API = process.env.REACT_APP_API_URL;
const GuestAuthContext = createContext(null);

export const GuestAuthProvider = ({ children }) => {
  const [guest,   setGuest]   = useState(null);
  const [loading, setLoading] = useState(true);

  // Restore session from localStorage on mount
  useEffect(() => {
    const token  = localStorage.getItem('guestToken');
    const stored = localStorage.getItem('guestData');
    if (token && stored) {
      try {
        setGuest(JSON.parse(stored));
      } catch (_) {
        localStorage.removeItem('guestToken');
        localStorage.removeItem('guestData');
      }
    }
    setLoading(false);
  }, []);

  // Verify token with server and refresh guest data
  const refreshGuest = useCallback(async () => {
    const token = localStorage.getItem('guestToken');
    if (!token) return;
    try {
      const res = await axios.get(`${API}/guests/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.data.success) {
        const g = res.data.guest;
        setGuest(g);
        localStorage.setItem('guestData', JSON.stringify(g));
      }
    } catch (_) {
      localStorage.removeItem('guestToken');
      localStorage.removeItem('guestData');
      setGuest(null);
    }
  }, []);

  const register = async ({ name, email, phone, password, address, city, country, idProof }) => {
    const res = await axios.post(`${API}/guests/register`, {
      name, email, phone, password, address, city, country, idProof,
    });
    if (res.data.success) {
      localStorage.setItem('guestToken', res.data.token);
      localStorage.setItem('guestData',  JSON.stringify(res.data.guest));
      setGuest(res.data.guest);
    }
    return res.data;
  };

  const login = async ({ email, password }) => {
    const res = await axios.post(`${API}/guests/login`, { email, password });
    if (res.data.success) {
      localStorage.setItem('guestToken', res.data.token);
      localStorage.setItem('guestData',  JSON.stringify(res.data.guest));
      setGuest(res.data.guest);
    }
    return res.data;
  };

  // Sends reset email; returns { success, message }
  const forgotPassword = async (email) => {
    const res = await axios.post(`${API}/guests/forgot-password`, { email });
    return res.data;
  };

  // Submits new password with the URL token; auto-logs in on success
  const resetPassword = async (token, password) => {
    const res = await axios.post(`${API}/guests/reset-password/${token}`, { password });
    if (res.data.success) {
      localStorage.setItem('guestToken', res.data.token);
      localStorage.setItem('guestData',  JSON.stringify(res.data.guest));
      setGuest(res.data.guest);
    }
    return res.data;
  };

  const logout = () => {
    localStorage.removeItem('guestToken');
    localStorage.removeItem('guestData');
    setGuest(null);
  };

  const updateProfile = async (updates) => {
    const token = localStorage.getItem('guestToken');
    const res   = await axios.put(`${API}/guests/me`, updates, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.data.success) {
      setGuest(res.data.guest);
      localStorage.setItem('guestData', JSON.stringify(res.data.guest));
    }
    return res.data;
  };

  return (
    <GuestAuthContext.Provider
      value={{
        guest,
        loading,
        login,
        register,
        logout,
        updateProfile,
        refreshGuest,
        forgotPassword,
        resetPassword,
      }}
    >
      {children}
    </GuestAuthContext.Provider>
  );
};

export const useGuestAuth = () => {
  const ctx = useContext(GuestAuthContext);
  if (!ctx) throw new Error('useGuestAuth must be used inside GuestAuthProvider');
  return ctx;
};

export default GuestAuthContext;