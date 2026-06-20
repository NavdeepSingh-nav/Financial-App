import React, { useState } from 'react';
import { api } from '../services/api';

export default function Login({ hasUser, onLogin }) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (password.length < 8) return setError('Password must be at least 8 characters.');
    if (!hasUser && password !== confirm) return setError('Passwords do not match.');

    setLoading(true);
    try {
      const { token } = hasUser ? await api.login(password) : await api.setup(password);
      localStorage.setItem('fh_token', token);
      onLogin(token);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-icon">💎</div>
        <h1 className="login-title">Finance Hub</h1>
        <p className="login-sub">
          {hasUser
            ? 'Enter your master password to unlock your data'
            : 'Create a master password to protect your data'}
        </p>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="login-field">
            <label>Master Password</label>
            <div className="login-input-row">
              <input
                type={showPwd ? 'text' : 'password'}
                placeholder="Enter master password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoFocus
                autoComplete={hasUser ? 'current-password' : 'new-password'}
              />
              <button type="button" className="btn-show" onClick={() => setShowPwd((v) => !v)}>
                {showPwd ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>

          {!hasUser && (
            <div className="login-field">
              <label>Confirm Password</label>
              <input
                type={showPwd ? 'text' : 'password'}
                placeholder="Repeat master password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                autoComplete="new-password"
              />
            </div>
          )}

          {error && <div className="login-error">⚠ {error}</div>}

          <button type="submit" className="login-btn" disabled={loading}>
            {loading ? 'Please wait…' : hasUser ? '→ Unlock' : '→ Create Account'}
          </button>
        </form>

        <div className="login-footer">
          <span className="login-badge">🔐 AES-256-GCM</span>
          <span className="login-badge">🪪 JWT Auth</span>
          <span className="login-badge">🍃 MongoDB</span>
        </div>
        <p className="login-note">
          Passwords are encrypted before reaching the database — the server never stores plaintext.
        </p>
      </div>
    </div>
  );
}
