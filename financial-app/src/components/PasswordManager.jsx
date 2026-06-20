import React, { useState } from 'react';

function getStrength(pwd) {
  if (!pwd) return { score: 0, label: '', cls: '' };
  let score = 0;
  if (pwd.length >= 8) score++;
  if (pwd.length >= 14) score++;
  if (/[A-Z]/.test(pwd)) score++;
  if (/[0-9]/.test(pwd)) score++;
  if (/[^A-Za-z0-9]/.test(pwd)) score++;
  if (score <= 2) return { score, label: 'Weak', cls: 'weak' };
  if (score <= 3) return { score, label: 'Fair', cls: 'fair' };
  return { score, label: 'Strong', cls: 'strong' };
}

function generatePassword(length = 16) {
  const sets = [
    'abcdefghijklmnopqrstuvwxyz',
    'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
    '0123456789',
    '!@#$%^&*()_+-=[]{}|;:,.<>?',
  ];
  const all = sets.join('');
  let pwd = sets.map((s) => s[Math.floor(Math.random() * s.length)]).join('');
  for (let i = pwd.length; i < length; i++) pwd += all[Math.floor(Math.random() * all.length)];
  return pwd.split('').sort(() => Math.random() - 0.5).join('');
}

export default function PasswordManager({ passwords, onAdd, onDelete }) {
  const [form, setForm] = useState({ site: '', username: '', password: '', note: '' });
  const [showPwd, setShowPwd] = useState(false);
  const [visible, setVisible] = useState({});
  const [copied, setCopied] = useState(null);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const filtered = passwords.filter(
    (e) =>
      e.site.toLowerCase().includes(search.toLowerCase()) ||
      e.username.toLowerCase().includes(search.toLowerCase())
  );

  const strength = getStrength(form.password);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.site.trim()) return setError('Site or app name is required.');
    if (!form.username.trim()) return setError('Username or email is required.');
    if (!form.password.trim()) return setError('Password is required.');
    setError('');
    setSaving(true);
    try {
      await onAdd({ site: form.site.trim(), username: form.username.trim(), password: form.password, note: form.note });
      setForm({ site: '', username: '', password: '', note: '' });
      setShowPwd(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  function copy(text, key) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(null), 1800);
    });
  }

  return (
    <div>
      <div className="page-header">
        <h1>Password Manager</h1>
        <p>Passwords are encrypted with AES-256-GCM before being stored in MongoDB</p>
      </div>

      <div className="form-card">
        <h3>Save New Password</h3>
        <form onSubmit={handleSubmit}>
          {/* Row 1: Site | Username | Password */}
          <div className="form-row">
            <div className="form-field">
              <label>Site / App</label>
              <input placeholder="e.g. Gmail, Netflix..."
                value={form.site} onChange={(e) => setForm((f) => ({ ...f, site: e.target.value }))} />
            </div>
            <div className="form-field">
              <label>Username / Email</label>
              <input placeholder="you@example.com"
                value={form.username} onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))} />
            </div>
            <div className="form-field" style={{ flex: 2 }}>
              <label>Password</label>
              <div className="pw-input-group">
                <input
                  type={showPwd ? 'text' : 'password'}
                  placeholder="Enter or generate a password"
                  value={form.password}
                  onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                />
                <button type="button" className="btn-ghost" onClick={() => setShowPwd((v) => !v)}>
                  {showPwd ? 'Hide' : 'Show'}
                </button>
                <button type="button" className="btn-ghost" onClick={() => { setForm((f) => ({ ...f, password: generatePassword() })); setShowPwd(true); }}>
                  ⚡ Generate
                </button>
              </div>
            </div>
          </div>

          {/* Strength meter — sits between rows, doesn't break alignment */}
          {form.password && (
            <div style={{ marginTop: 6, marginBottom: 2 }}>
              <div className="pw-strength">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className={`pw-strength-bar ${i <= strength.score ? `filled ${strength.cls}` : ''}`} />
                ))}
              </div>
              <div className={`pw-strength-label ${strength.cls}`}>{strength.label} password</div>
            </div>
          )}

          {/* Row 2: Note | Save */}
          <div className="form-row" style={{ marginTop: 12 }}>
            <div className="form-field" style={{ flex: 1 }}>
              <label>Note (optional)</label>
              <input placeholder="e.g. Work account, 2FA enabled..."
                value={form.note} onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))} />
            </div>
            <button type="submit" className="btn-primary" style={{ alignSelf: 'flex-end' }} disabled={saving}>
              {saving ? 'Encrypting…' : 'Save Password'}
            </button>
          </div>

          {error && <div className="form-error">⚠ {error}</div>}
        </form>
      </div>

      <div className="search-wrap">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
        </svg>
        <input className="search-input" placeholder="Search by site or username..."
          value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {filtered.length === 0 ? (
        <div className="list-card">
          <div className="empty-state">
            <div className="empty-state-icon">🔑</div>
            <div>{search ? 'No results found' : 'No passwords saved yet'}</div>
          </div>
        </div>
      ) : (
        filtered.map((e) => (
          <div className="pw-card" key={e._id}>
            <div className="pw-card-header">
              <div>
                <div className="pw-site-name">🔐 {e.site}</div>
                {e.note && <div className="pw-card-note">{e.note}</div>}
              </div>
              <button className="btn-delete" onClick={() => onDelete(e._id)}>✕</button>
            </div>
            <div className="pw-fields">
              <div className="pw-field-row">
                <span className="pw-field-key">User</span>
                <span className="pw-field-val" style={{ fontFamily: 'inherit' }}>{e.username}</span>
                <button className={`btn-icon-sm ${copied === `u-${e._id}` ? 'copied' : ''}`}
                  onClick={() => copy(e.username, `u-${e._id}`)}>
                  {copied === `u-${e._id}` ? '✓ Copied' : 'Copy'}
                </button>
              </div>
              <div className="pw-field-row">
                <span className="pw-field-key">Pass</span>
                <span className="pw-field-val">{visible[e._id] ? e.password : '••••••••••••••'}</span>
                <button className="btn-icon-sm"
                  onClick={() => setVisible((v) => ({ ...v, [e._id]: !v[e._id] }))}>
                  {visible[e._id] ? 'Hide' : 'Show'}
                </button>
                <button className={`btn-icon-sm ${copied === `p-${e._id}` ? 'copied' : ''}`}
                  onClick={() => copy(e.password, `p-${e._id}`)}>
                  {copied === `p-${e._id}` ? '✓ Copied' : 'Copy'}
                </button>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
