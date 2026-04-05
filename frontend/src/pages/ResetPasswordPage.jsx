// frontend/src/pages/ResetPasswordPage.jsx
// Add this route to your App.jsx/Router: <Route path="/reset-password/:token" element={<ResetPasswordPage />} />

import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { KeyRound, CheckCircle, Eye, EyeOff } from 'lucide-react';
import axios from 'axios';
import './ResetPasswordPage.css';

const API = process.env.REACT_APP_API_URL;

const ResetPasswordPage = () => {
  const { token }  = useParams();
  const navigate   = useNavigate();

  const [password,        setPassword]        = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPass,        setShowPass]        = useState(false);
  const [showConfirm,     setShowConfirm]     = useState(false);
  const [isLoading,       setIsLoading]       = useState(false);
  const [error,           setError]           = useState('');
  const [success,         setSuccess]         = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password.length < 6)              return setError('Password must be at least 6 characters');
    if (password !== confirmPassword)      return setError('Passwords do not match');

    setIsLoading(true);
    try {
      const { data } = await axios.put(`${API}/auth/reset-password/${token}`, { password });

      // Optional: auto-login the user with the returned token
      if (data.token) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user',  JSON.stringify(data.user));
      }

      setSuccess(true);

      // Redirect to the right dashboard after 2.5 s
      if (data.user) {
        const role = data.user.role?.toLowerCase();
        setTimeout(() => {
          if      (role === 'admin')        navigate('/dashboard');
          else if (role === 'receptionist') navigate('/receptionist');
          else if (role === 'housekeeper')  navigate('/housekeeper');
          else                              navigate('/');
        }, 2500);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Reset failed. The link may have expired.');
    } finally {
      setIsLoading(false);
    }
  };

  // Password strength indicator
  const getStrength = (pw) => {
    if (!pw) return { level: 0, label: '', color: '' };
    let score = 0;
    if (pw.length >= 6)                    score++;
    if (pw.length >= 10)                   score++;
    if (/[A-Z]/.test(pw))                  score++;
    if (/[0-9]/.test(pw))                  score++;
    if (/[^A-Za-z0-9]/.test(pw))           score++;
    if (score <= 1) return { level: 1, label: 'Weak',   color: '#ef4444' };
    if (score <= 3) return { level: 2, label: 'Fair',   color: '#f59e0b' };
    return              { level: 3, label: 'Strong', color: '#16a34a' };
  };

  const strength = getStrength(password);

  return (
    <div className="rp-page">
      <div className="rp-card">

        {/* Icon */}
        <div className="rp-icon-wrap">
          {success
            ? <CheckCircle size={36} className="rp-icon rp-icon--success" />
            : <KeyRound    size={36} className="rp-icon" />
          }
        </div>

        {/* Title */}
        <h1 className="rp-title">
          {success ? 'Password Reset!' : 'Set New Password'}
        </h1>

        {success ? (
          <>
            <p className="rp-subtitle">
              Your password has been updated. You'll be redirected to your dashboard shortly.
            </p>
            <Link to="/" className="rp-back-link">← Back to Home</Link>
          </>
        ) : (
          <>
            <p className="rp-subtitle">
              Choose a strong new password for your account.
            </p>

            {error && <div className="rp-error">{error}</div>}

            <form onSubmit={handleSubmit} className="rp-form">
              {/* New password */}
              <div className="rp-field">
                <label>New Password</label>
                <div className="rp-input-wrap">
                  <input
                    type={showPass ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter new password"
                    required
                    autoFocus
                  />
                  <button type="button" className="rp-eye" onClick={() => setShowPass(p => !p)}>
                    {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>

                {/* Strength bar */}
                {password && (
                  <div className="rp-strength">
                    <div className="rp-strength-bar">
                      {[1, 2, 3].map(l => (
                        <div
                          key={l}
                          className="rp-strength-seg"
                          style={{ background: strength.level >= l ? strength.color : '#e5e7eb' }}
                        />
                      ))}
                    </div>
                    <span style={{ color: strength.color }}>{strength.label}</span>
                  </div>
                )}
              </div>

              {/* Confirm password */}
              <div className="rp-field">
                <label>Confirm Password</label>
                <div className="rp-input-wrap">
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter new password"
                    required
                  />
                  <button type="button" className="rp-eye" onClick={() => setShowConfirm(p => !p)}>
                    {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {confirmPassword && password !== confirmPassword && (
                  <span className="rp-mismatch">Passwords don't match</span>
                )}
              </div>

              <button type="submit" className="rp-btn" disabled={isLoading}>
                {isLoading ? 'Resetting…' : 'Reset Password'}
              </button>
            </form>

            <Link to="/" className="rp-back-link">← Back to Home</Link>
          </>
        )}
      </div>
    </div>
  );
};

export default ResetPasswordPage;