// frontend/src/components/AuthModal.jsx

import React, { useState } from 'react';
import { X, ArrowLeft, Mail, CheckCircle } from 'lucide-react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import './AuthModal.css';

const API = process.env.REACT_APP_API_URL;

// ── Screens: 'login' | 'register' | 'forgot' | 'forgot-sent'
const AuthModal = ({ type, onClose, onSwitchType }) => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading]     = useState(false);
  const [error, setError]             = useState('');
  const [currentType, setCurrentType] = useState(type);

  // Login state
  const [loginData, setLoginData] = useState({ email: '', password: '' });

  // Register state
  const [registerData, setRegisterData] = useState({
    fullName: '', role: '', phoneNumber: '', email: '', password: '', confirmedPassword: '',
  });

  // Forgot password state
  const [forgotEmail, setForgotEmail] = useState('');

  const roles = [
    { value: 'admin',        label: 'Admin / Manager' },
    { value: 'receptionist', label: 'Receptionist'    },
    { value: 'housekeeper',  label: 'Housekeeper'     },
  ];

  const clearErrors = () => setError('');

  const switchTo = (screen) => {
    setCurrentType(screen);
    clearErrors();
  };

  // ── Login ───────────────────────────────────────────────────
  const handleLogin = async (e) => {
    e.preventDefault();
    clearErrors();
    setIsLoading(true);
    try {
      const { data } = await axios.post(`${API}/auth/login`, loginData);
      const user = {
        id:          data.user.id,
        fullName:    data.user.fullName,
        email:       data.user.email,
        phoneNumber: data.user.phoneNumber,
        role:        String(data.user.role).toLowerCase().trim(),
      };
      localStorage.setItem('token', data.token);
      localStorage.setItem('user',  JSON.stringify(user));

      const role = user.role;
      if      (role === 'admin')        navigate('/dashboard');
      else if (role === 'receptionist') navigate('/receptionist');
      else if (role === 'housekeeper')  navigate('/housekeeper');
      else                              navigate('/');
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // ── Register ────────────────────────────────────────────────
  const handleRegister = async (e) => {
    e.preventDefault();
    clearErrors();
    if (!registerData.fullName.trim())                              return setError('Full name is required');
    if (!registerData.role)                                         return setError('Please select a role');
    if (!registerData.phoneNumber.trim())                           return setError('Phone number is required');
    if (!registerData.email.trim())                                 return setError('Email is required');
    if (registerData.password.length < 6)                          return setError('Password must be at least 6 characters');
    if (registerData.password !== registerData.confirmedPassword)   return setError('Passwords do not match');

    setIsLoading(true);
    try {
      const { data } = await axios.post(`${API}/auth/register`, {
        fullName:    registerData.fullName,
        role:        registerData.role,
        phoneNumber: registerData.phoneNumber,
        email:       registerData.email,
        password:    registerData.password,
      });
      localStorage.setItem('token', data.token);
      localStorage.setItem('user',  JSON.stringify(data.user));

      const role = data.user.role.toLowerCase();
      if      (role === 'admin')        navigate('/dashboard');
      else if (role === 'receptionist') navigate('/receptionist');
      else if (role === 'housekeeper')  navigate('/housekeeper');
      else                              navigate('/');
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // ── Forgot password ─────────────────────────────────────────
  const handleForgotPassword = async (e) => {
    e.preventDefault();
    clearErrors();
    if (!forgotEmail.trim()) return setError('Please enter your email address');

    setIsLoading(true);
    try {
      await axios.post(`${API}/auth/forgot-password`, { email: forgotEmail.trim() });
      switchTo('forgot-sent');
    } catch (err) {
      // Even on error we show the generic success screen (anti-enumeration UX)
      // Only show an error for genuine server failures (5xx)
      if (err.response?.status >= 500) {
        setError(err.response?.data?.message || 'Something went wrong. Please try again.');
      } else {
        switchTo('forgot-sent');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // ── Shared input handlers ───────────────────────────────────
  const handleLoginChange    = (e) => setLoginData(p    => ({ ...p,    [e.target.name]: e.target.value }));
  const handleRegisterChange = (e) => setRegisterData(p => ({ ...p,    [e.target.name]: e.target.value }));

  return (
    <div className="auth-modal-overlay" onClick={onClose}>
      <div className="auth-modal" onClick={(e) => e.stopPropagation()}>

        {/* Close */}
        <button className="auth-modal-close" onClick={onClose} aria-label="Close">
          <X size={24} />
        </button>

        {/* ── LOGIN ─────────────────────────────────────────── */}
        {currentType === 'login' && (
          <div className="auth-form-container">
            <h2>Login</h2>
            {error && <div className="auth-error">{error}</div>}

            <form onSubmit={handleLogin}>
              <div className="form-group">
                <label>Email</label>
                <input type="email" name="email" value={loginData.email}
                  onChange={handleLoginChange} placeholder="Enter your email" required />
              </div>
              <div className="form-group">
                <label>Password</label>
                <input type="password" name="password" value={loginData.password}
                  onChange={handleLoginChange} placeholder="Enter your password" required />
              </div>

              {/* Forgot password link */}
              <div className="auth-forgot-row">
                <span className="auth-link" onClick={() => switchTo('forgot')}>
                  Forgot password?
                </span>
              </div>

              <button type="submit" className="auth-btn" disabled={isLoading}>
                {isLoading ? 'Logging in…' : 'Login'}
              </button>
            </form>

            <p className="auth-switch">
              Don't have an account?{' '}
              <span className="auth-link" onClick={() => switchTo('register')}>Register here</span>
            </p>
          </div>
        )}

        {/* ── REGISTER ──────────────────────────────────────── */}
        {currentType === 'register' && (
          <div className="auth-form-container">
            <h2>Register</h2>
            {error && <div className="auth-error">{error}</div>}

            <form onSubmit={handleRegister}>
              <div className="form-group">
                <label>Full Name</label>
                <input type="text" name="fullName" value={registerData.fullName}
                  onChange={handleRegisterChange} placeholder="Enter your full name" required />
              </div>
              <div className="form-group">
                <label>Role</label>
                <select name="role" value={registerData.role} onChange={handleRegisterChange} required>
                  <option value="">Select a role</option>
                  {roles.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Phone Number</label>
                <input type="tel" name="phoneNumber" value={registerData.phoneNumber}
                  onChange={handleRegisterChange} placeholder="Enter your phone number" required />
              </div>
              <div className="form-group">
                <label>Email</label>
                <input type="email" name="email" value={registerData.email}
                  onChange={handleRegisterChange} placeholder="Enter your email" required />
              </div>
              <div className="form-group">
                <label>Password</label>
                <input type="password" name="password" value={registerData.password}
                  onChange={handleRegisterChange} placeholder="Min 6 characters" required />
              </div>
              <div className="form-group">
                <label>Confirm Password</label>
                <input type="password" name="confirmedPassword" value={registerData.confirmedPassword}
                  onChange={handleRegisterChange} placeholder="Confirm your password" required />
              </div>

              <button type="submit" className="auth-btn" disabled={isLoading}>
                {isLoading ? 'Registering…' : 'Register'}
              </button>
            </form>

            <p className="auth-switch">
              Already have an account?{' '}
              <span className="auth-link" onClick={() => switchTo('login')}>Login here</span>
            </p>
          </div>
        )}

        {/* ── FORGOT PASSWORD ───────────────────────────────── */}
        {currentType === 'forgot' && (
          <div className="auth-form-container">
            {/* Back arrow */}
            <button className="auth-back-btn" onClick={() => switchTo('login')}>
              <ArrowLeft size={18} /> Back to Login
            </button>

            <div className="auth-icon-header">
              <div className="auth-icon-circle">
                <Mail size={28} />
              </div>
              <h2>Forgot Password?</h2>
              <p className="auth-subtitle">
                Enter the email address linked to your account. We'll send you a secure reset link valid for 15 minutes.
              </p>
            </div>

            {error && <div className="auth-error">{error}</div>}

            <form onSubmit={handleForgotPassword}>
              <div className="form-group">
                <label>Email Address</label>
                <input
                  type="email"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  autoFocus
                />
              </div>

              <button type="submit" className="auth-btn" disabled={isLoading}>
                {isLoading ? 'Sending…' : 'Send Reset Link'}
              </button>
            </form>
          </div>
        )}

        {/* ── FORGOT SENT CONFIRMATION ──────────────────────── */}
        {currentType === 'forgot-sent' && (
          <div className="auth-form-container auth-success-screen">
            <div className="auth-success-icon">
              <CheckCircle size={52} />
            </div>
            <h2>Check Your Email</h2>
            <p className="auth-subtitle">
              If <strong>{forgotEmail}</strong> is registered, a password reset link is on its way. 
              Check your inbox (and spam folder) — the link expires in <strong>15 minutes</strong>.
            </p>

            <button
              className="auth-btn auth-btn--outline"
              onClick={() => {
                setForgotEmail('');
                switchTo('forgot');
              }}
            >
              Didn't receive it? Try again
            </button>

            <p className="auth-switch" style={{ marginTop: '1rem' }}>
              <span className="auth-link" onClick={() => switchTo('login')}>← Back to Login</span>
            </p>
          </div>
        )}

      </div>
    </div>
  );
};

export default AuthModal;