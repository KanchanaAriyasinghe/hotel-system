// frontend/src/components/AuthModal.jsx

import React, { useState } from 'react';
import { X } from 'lucide-react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import './AuthModal.css';

const AuthModal = ({ type, onClose, onSwitchType }) => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [currentType, setCurrentType] = useState(type);

  // Login Form State
  const [loginData, setLoginData] = useState({
    email: '',
    password: ''
  });

  // Registration Form State
  const [registerData, setRegisterData] = useState({
    fullName: '',
    role: '',
    phoneNumber: '',
    email: '',
    password: '',
    confirmedPassword: ''
  });

  const roles = [
    { value: 'admin', label: 'Admin/Manager' },
    { value: 'receptionist', label: 'Receptionist' },
    { value: 'housekeeper', label: 'Housekeeper' }
  ];

  // Login Handler
  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await axios.post(
        `${process.env.REACT_APP_API_URL}/auth/login`,
        loginData
      );

      // Store token and user
      const userToStore = {
        id: response.data.user.id,
        fullName: response.data.user.fullName,
        email: response.data.user.email,
        phoneNumber: response.data.user.phoneNumber,
        role: String(response.data.user.role).toLowerCase().trim(),
      };
      
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(userToStore));
      
      console.log('Stored user data:', userToStore);

      // Redirect based on role
      const role = userToStore.role;
      console.log('User role for redirect:', role);
      
      if (role === 'admin') {
        console.log('Redirecting to dashboard');
        navigate('/dashboard');
      } else if (role === 'receptionist') {
        console.log('Redirecting to receptionist');
        navigate('/receptionist');
      } else if (role === 'housekeeper') {
        console.log('Redirecting to housekeeper');
        navigate('/housekeeper');
      } else {
        console.error('Unknown role:', role);
        navigate('/');
      }

      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Registration Handler
  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!registerData.fullName.trim()) {
      setError('Full name is required');
      return;
    }
    if (!registerData.role) {
      setError('Please select a role');
      return;
    }
    if (!registerData.phoneNumber.trim()) {
      setError('Phone number is required');
      return;
    }
    if (!registerData.email.trim()) {
      setError('Email is required');
      return;
    }
    if (registerData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    if (registerData.password !== registerData.confirmedPassword) {
      setError('Passwords do not match');
      return;
    }

    setIsLoading(true);

    try {
      const response = await axios.post(
        `${process.env.REACT_APP_API_URL}/auth/register`,
        {
          fullName: registerData.fullName,
          role: registerData.role,
          phoneNumber: registerData.phoneNumber,
          email: registerData.email,
          password: registerData.password
        }
      );

      // Store token
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));

      // Redirect based on role
      const role = response.data.user.role.toLowerCase();
      console.log('User role:', role);
      
      if (role === 'admin') {
        navigate('/dashboard');
      } else if (role === 'receptionist') {
        navigate('/receptionist');
      } else if (role === 'housekeeper') {
        navigate('/housekeeper');
      } else {
        console.error('Unknown role:', role);
        navigate('/');
      }

      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoginInputChange = (e) => {
    const { name, value } = e.target;
    setLoginData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleRegisterInputChange = (e) => {
    const { name, value } = e.target;
    setRegisterData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const toggleAuthType = (newType) => {
    setCurrentType(newType);
    setError('');
    setLoginData({ email: '', password: '' });
    setRegisterData({
      fullName: '',
      role: '',
      phoneNumber: '',
      email: '',
      password: '',
      confirmedPassword: ''
    });
  };

  return (
    <div className="auth-modal-overlay" onClick={onClose}>
      <div className="auth-modal" onClick={(e) => e.stopPropagation()}>
        {/* Close Button */}
        <button className="auth-modal-close" onClick={onClose}>
          <X size={24} />
        </button>

        {/* Login Form */}
        {currentType === 'login' && (
          <div className="auth-form-container">
            <h2>Login</h2>
            
            {error && <div className="auth-error">{error}</div>}

            <form onSubmit={handleLogin}>
              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  name="email"
                  value={loginData.email}
                  onChange={handleLoginInputChange}
                  placeholder="Enter your email"
                  required
                />
              </div>

              <div className="form-group">
                <label>Password</label>
                <input
                  type="password"
                  name="password"
                  value={loginData.password}
                  onChange={handleLoginInputChange}
                  placeholder="Enter your password"
                  required
                />
              </div>

              <button
                type="submit"
                className="auth-btn"
                disabled={isLoading}
              >
                {isLoading ? 'Logging in...' : 'Login'}
              </button>
            </form>

            <p className="auth-switch">
              Don't have an account?{' '}
              <span onClick={() => toggleAuthType('register')} className="auth-link">
                Register here
              </span>
            </p>
          </div>
        )}

        {/* Registration Form */}
        {currentType === 'register' && (
          <div className="auth-form-container">
            <h2>Register</h2>
            
            {error && <div className="auth-error">{error}</div>}

            <form onSubmit={handleRegister}>
              <div className="form-group">
                <label>Full Name</label>
                <input
                  type="text"
                  name="fullName"
                  value={registerData.fullName}
                  onChange={handleRegisterInputChange}
                  placeholder="Enter your full name"
                  required
                />
              </div>

              <div className="form-group">
                <label>Role</label>
                <select
                  name="role"
                  value={registerData.role}
                  onChange={handleRegisterInputChange}
                  required
                >
                  <option value="">Select a role</option>
                  {roles.map(role => (
                    <option key={role.value} value={role.value}>
                      {role.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Phone Number</label>
                <input
                  type="tel"
                  name="phoneNumber"
                  value={registerData.phoneNumber}
                  onChange={handleRegisterInputChange}
                  placeholder="Enter your phone number"
                  required
                />
              </div>

              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  name="email"
                  value={registerData.email}
                  onChange={handleRegisterInputChange}
                  placeholder="Enter your email"
                  required
                />
              </div>

              <div className="form-group">
                <label>Password</label>
                <input
                  type="password"
                  name="password"
                  value={registerData.password}
                  onChange={handleRegisterInputChange}
                  placeholder="Enter password (min 6 characters)"
                  required
                />
              </div>

              <div className="form-group">
                <label>Confirm Password</label>
                <input
                  type="password"
                  name="confirmedPassword"
                  value={registerData.confirmedPassword}
                  onChange={handleRegisterInputChange}
                  placeholder="Confirm your password"
                  required
                />
              </div>

              <button
                type="submit"
                className="auth-btn"
                disabled={isLoading}
              >
                {isLoading ? 'Registering...' : 'Register'}
              </button>
            </form>

            <p className="auth-switch">
              Already have an account?{' '}
              <span onClick={() => toggleAuthType('login')} className="auth-link">
                Login here
              </span>
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuthModal;