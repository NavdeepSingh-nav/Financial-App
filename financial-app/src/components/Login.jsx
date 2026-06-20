import React, { useState } from 'react';
import { api } from '../services/api';

export default function Login({ onLogin }) {
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function switchMode(m) {
    setMode(m);
    setError('');
    setPassword('');
    setConfirm('');
    setShowPwd(false);
    setShowConfirm(false);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (!email.trim()) return setError('Email is required.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return setError('Enter a valid email address.');
    if (password.length < 8) return setError('Password must be at least 8 characters.');
    if (mode === 'register' && password !== confirm) return setError('Passwords do not match.');

    setLoading(true);
    try {
      const res = mode === 'register'
        ? await api.register(email, password)
        : await api.login(email, password);
      localStorage.setItem('fh_token', res.token);
      onLogin(res.token, res.email);
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
          {mode === 'login'
            ? 'Sign in to access your personal finance dashboard'
            : 'Create an account to get started'}
        </p>

        {/* Mode toggle */}
        <div className="login-tabs">
          <button
            type="button"
            className={`login-tab ${mode === 'login' ? 'active' : ''}`}
            onClick={() => switchMode('login')}
          >
            Sign In
          </button>
          <button
            type="button"
            className={`login-tab ${mode === 'register' ? 'active' : ''}`}
            onClick={() => switchMode('register')}
          >
            Register
          </button>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="login-field">
            <label>Email Address</label>
            <input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoFocus
              autoComplete="email"
            />
          </div>

          <div className="login-field">
            <label>Password</label>
            <div className="login-input-row">
              <input
                type={showPwd ? 'text' : 'password'}
                placeholder={mode === 'register' ? 'Min. 8 characters' : 'Enter your password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              />
              <button type="button" className="btn-show" onClick={() => setShowPwd((v) => !v)}>
                {showPwd ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>

          {mode === 'register' && (
            <div className="login-field">
              <label>Confirm Password</label>
              <div className="login-input-row">
                <input
                  type={showConfirm ? 'text' : 'password'}
                  placeholder="Repeat your password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  autoComplete="new-password"
                />
                <button type="button" className="btn-show" onClick={() => setShowConfirm((v) => !v)}>
                  {showConfirm ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>
          )}

          {error && <div className="login-error">⚠ {error}</div>}

          <button type="submit" className="login-btn" disabled={loading}>
            {loading
              ? 'Please wait…'
              : mode === 'login' ? '→ Sign In' : '→ Create Account'}
          </button>
        </form>

        <div className="login-footer">
          <span className="login-badge">🔐 AES-256-GCM</span>
          <span className="login-badge">🪪 JWT Auth</span>
          <span className="login-badge">🍃 MongoDB</span>
        </div>
        <p className="login-note">
          Your passwords are encrypted before reaching the database.
        </p>
      </div>
    </div>
  );
}
