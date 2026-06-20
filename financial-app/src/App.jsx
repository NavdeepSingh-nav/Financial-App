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

  // ── Financial CRUD ───────────────────────────────────
  async function addFinancialEntry(data) {
    const created = await api.addFinancial(data);
    setFinancialEntries((prev) => [created, ...prev]);
  }
  async function deleteFinancialEntry(id) {
    await api.deleteFinancial(id);
    setFinancialEntries((prev) => prev.filter((e) => e._id !== id));
  }

  // ── Expense CRUD ─────────────────────────────────────
  async function addExpense(data) {
    const created = await api.addExpense(data);
    setExpenses((prev) => [created, ...prev]);
  }
  async function deleteExpense(id) {
    await api.deleteExpense(id);
    setExpenses((prev) => prev.filter((e) => e._id !== id));
  }

  // ── Password CRUD ────────────────────────────────────
  async function addPassword(data) {
    const created = await api.addPassword(data);
    setPasswords((prev) => [created, ...prev]);
  }
  async function deletePassword(id) {
    await api.deletePassword(id);
    setPasswords((prev) => prev.filter((e) => e._id !== id));
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
        setPage={setPage}
        financialEntries={financialEntries}
        expenses={expenses}
        passwords={passwords}
        userEmail={userEmail}
        onLogout={handleLogout}
      />
      <main className="app-content">
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
