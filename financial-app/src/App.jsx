import React, { useState, useEffect } from 'react';
import { api } from './services/api';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import FinancialTracker from './components/FinancialTracker';
import ExpenseTracker from './components/ExpenseTracker';
import PasswordManager from './components/PasswordManager';
import Login from './components/Login';
import './App.css';

export default function App() {
  const [token, setToken] = useState(localStorage.getItem('fh_token'));
  const [userEmail, setUserEmail] = useState(localStorage.getItem('fh_email') || '');
  const [page, setPage] = useState('dashboard');
  const [drawerOpen, setDrawerOpen] = useState(false);

  const [financialEntries, setFinancialEntries] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [passwords, setPasswords] = useState([]);
  const [dataLoading, setDataLoading] = useState(false);
  const [serverError, setServerError] = useState(false);

  // Token expiry signal from api.js
  useEffect(() => {
    const handler = () => { setToken(null); setUserEmail(''); };
    window.addEventListener('auth:expired', handler);
    return () => window.removeEventListener('auth:expired', handler);
  }, []);

  // Fetch all data once authenticated
  useEffect(() => {
    if (!token) return;
    setDataLoading(true);
    Promise.all([api.getFinancial(), api.getExpenses(), api.getPasswords()])
      .then(([fin, exp, pwd]) => {
        setFinancialEntries(fin);
        setExpenses(exp);
        setPasswords(pwd);
      })
      .catch(() => {
        localStorage.removeItem('fh_token');
        setToken(null);
      })
      .finally(() => setDataLoading(false));
  }, [token]);

  function handleLogin(newToken, email) {
    localStorage.setItem('fh_email', email || '');
    setToken(newToken);
    setUserEmail(email || '');
  }

  function handleLogout() {
    localStorage.removeItem('fh_token');
    localStorage.removeItem('fh_email');
    setToken(null);
    setUserEmail('');
    setFinancialEntries([]);
    setExpenses([]);
    setPasswords([]);
    setPage('dashboard');
  }

  async function refreshAll() {
    const [fin, exp, pwd] = await Promise.all([api.getFinancial(), api.getExpenses(), api.getPasswords()]);
    setFinancialEntries(fin);
    setExpenses(exp);
    setPasswords(pwd);
    return true;
  }

  // ── Financial CRUD ───────────────────────────────────
  // If a POST succeeds the returned doc updates state immediately.
  // If the POST fails but the write reached MongoDB (common on Render free tier
  // when bcrypt or a cold DB round-trip pushes past the proxy timeout),
  // refreshAll re-syncs the UI silently — no error shown to the user.
  async function addFinancialEntry(data) {
    try {
      const created = await api.addFinancial(data);
      setFinancialEntries((prev) => [created, ...prev]);
    } catch {
      const ok = await refreshAll().catch(() => false);
      if (!ok) throw new Error('Could not save entry. Please try again.');
    }
  }
  async function deleteFinancialEntry(id) {
    setFinancialEntries((prev) => prev.filter((e) => e._id !== id));
    await api.deleteFinancial(id).catch(() => refreshAll().catch(() => {}));
  }

  // ── Expense CRUD ─────────────────────────────────────
  async function addExpense(data) {
    try {
      const created = await api.addExpense(data);
      setExpenses((prev) => [created, ...prev]);
    } catch {
      const ok = await refreshAll().catch(() => false);
      if (!ok) throw new Error('Connection error — please refresh the page to check if the expense was saved before adding it again.');
    }
  }
  async function deleteExpense(id) {
    setExpenses((prev) => prev.filter((e) => e._id !== id));
    await api.deleteExpense(id).catch(() => refreshAll().catch(() => {}));
  }

  // ── Password CRUD ────────────────────────────────────
  async function addPassword(data) {
    try {
      const created = await api.addPassword(data);
      setPasswords((prev) => [created, ...prev]);
    } catch {
      const ok = await refreshAll().catch(() => false);
      if (!ok) throw new Error('Connection error — please refresh the page to check if the password was saved before adding it again.');
    }
  }
  async function deletePassword(id) {
    setPasswords((prev) => prev.filter((e) => e._id !== id));
    await api.deletePassword(id).catch(() => refreshAll().catch(() => {}));
  }

  // ── Screens ──────────────────────────────────────────
  if (serverError) {
    return (
      <div className="app-loading">
        <div style={{ fontSize: 40, marginBottom: 16 }}>⚠️</div>
        <p style={{ fontWeight: 600, color: 'var(--text)', marginBottom: 8 }}>Cannot reach server</p>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', textAlign: 'center' }}>
          Make sure the Node.js server is running on port 5000.
        </p>
        <button className="btn-primary" style={{ marginTop: 20 }} onClick={() => window.location.reload()}>
          Retry
        </button>
      </div>
    );
  }

  if (!token) {
    return <Login onLogin={handleLogin} />;
  }

  if (dataLoading) {
    return (
      <div className="app-loading">
        <div className="loading-spinner" />
        <p>Loading your data…</p>
      </div>
    );
  }

  return (
    <div className="app-layout">
      <Sidebar
        page={page}
        setPage={(p) => { setPage(p); setDrawerOpen(false); }}
        financialEntries={financialEntries}
        expenses={expenses}
        passwords={passwords}
        userEmail={userEmail}
        onLogout={handleLogout}
        drawerOpen={drawerOpen}
        onDrawerClose={() => setDrawerOpen(false)}
      />
      {drawerOpen && <div className="drawer-overlay" onClick={() => setDrawerOpen(false)} />}
      <main className="app-content">
        <button className="mobile-menu-btn" onClick={() => setDrawerOpen(true)} aria-label="Open menu">
          <span /><span /><span />
        </button>
        {page === 'dashboard' && (
          <Dashboard
            financialEntries={financialEntries}
            expenses={expenses}
            passwords={passwords}
            setPage={setPage}
          />
        )}
        {page === 'financial' && (
          <FinancialTracker
            entries={financialEntries}
            onAdd={addFinancialEntry}
            onDelete={deleteFinancialEntry}
          />
        )}
        {page === 'expense' && (
          <ExpenseTracker
            expenses={expenses}
            onAdd={addExpense}
            onDelete={deleteExpense}
          />
        )}
        {page === 'password' && (
          <PasswordManager
            passwords={passwords}
            onAdd={addPassword}
            onDelete={deletePassword}
          />
        )}
      </main>
    </div>
  );
}
