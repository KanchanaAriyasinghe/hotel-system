// frontend/src/pages/GuestResetPasswordPage.jsx
// Handles the /guest/reset-password/:token route from the reset email.

import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Lock, Eye, EyeOff, Loader, Check, AlertTriangle } from 'lucide-react';
import { useGuestAuth } from '../context/GuestAuthContext';
import './GuestResetPasswordPage.css';

const GuestResetPasswordPage = () => {
  const { token }         = useParams();
  const { resetPassword } = useGuestAuth();
  const navigate          = useNavigate();

  const [password,  setPassword]  = useState('');
  const [confirm,   setConfirm]   = useState('');
  const [showPass,  setShowPass]  = useState(false);
  const [showConf,  setShowConf]  = useState(false);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState('');
  const [success,   setSuccess]   = useState(false);

  const handleSubmit = async () => {
    setError('');

    if (!password || !confirm) {
      setError('Please fill in both fields.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const result = await resetPassword(token, password);
      if (result.success) {
        setSuccess(true);
        setTimeout(() => navigate('/booking'), 2200);
      } else {
        setError(result.message || 'Reset failed. The link may have expired.');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grp-page">
      <div className="grp-card">

        {/* Header */}
        <div className="grp-header">
          <div className="grp-header-deco" />
          <div className="grp-eyebrow">
            <Lock size={12} /> Password Reset
          </div>
          <h1 className="grp-title">
            Choose a <em>New Password</em>
          </h1>
          <p className="grp-subtitle">
            Enter and confirm your new password below.
          </p>
        </div>

        <div className="grp-body">

          {/* Success */}
          {success && (
            <div className="grp-success">
              <div className="grp-success-icon"><Check size={22} /></div>
              <div>
                <div className="grp-success-title">Password updated!</div>
                <div className="grp-success-sub">Redirecting you to bookings…</div>
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="grp-error">
              <AlertTriangle size={15} />
              {error}
            </div>
          )}

          {!success && (
            <>
              <div className="grp-field">
                <label className="grp-label"><Lock size={12} /> New Password</label>
                <div className="grp-input-wrap">
                  <input
                    className="grp-input"
                    type={showPass ? 'text' : 'password'}
                    placeholder="Min. 6 characters"
                    value={password}
                    onChange={(e) => { setError(''); setPassword(e.target.value); }}
                    autoFocus
                  />
                  <button
                    className="grp-eye"
                    type="button"
                    onClick={() => setShowPass(p => !p)}
                    tabIndex={-1}
                  >
                    {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              <div className="grp-field">
                <label className="grp-label"><Lock size={12} /> Confirm New Password</label>
                <div className="grp-input-wrap">
                  <input
                    className="grp-input"
                    type={showConf ? 'text' : 'password'}
                    placeholder="Repeat your new password"
                    value={confirm}
                    onChange={(e) => { setError(''); setConfirm(e.target.value); }}
                    onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                  />
                  <button
                    className="grp-eye"
                    type="button"
                    onClick={() => setShowConf(p => !p)}
                    tabIndex={-1}
                  >
                    {showConf ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              {/* Strength indicator */}
              {password.length > 0 && (
                <div className="grp-strength">
                  <div className="grp-strength-bars">
                    {[1, 2, 3, 4].map(i => (
                      <div
                        key={i}
                        className={`grp-strength-bar ${
                          password.length >= i * 3 ? 'grp-strength-bar--on' : ''
                        }`}
                      />
                    ))}
                  </div>
                  <span className="grp-strength-label">
                    {password.length < 4  && 'Too short'}
                    {password.length >= 4  && password.length < 7  && 'Weak'}
                    {password.length >= 7  && password.length < 10 && 'Good'}
                    {password.length >= 10 && 'Strong'}
                  </span>
                </div>
              )}

              <button
                className="grp-submit"
                onClick={handleSubmit}
                disabled={loading}
              >
                {loading
                  ? <><Loader size={16} className="grp-spinner" /> Updating…</>
                  : <><Check size={16} /> Set New Password</>}
              </button>

              <button className="grp-back" onClick={() => navigate('/')}>
                Back to Home
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default GuestResetPasswordPage;