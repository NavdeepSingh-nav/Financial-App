import React from 'react';

const NAV = [
  { id: 'dashboard', label: 'Dashboard', icon: '▣' },
  { id: 'financial', label: 'Financial Tracker', icon: '◈' },
  { id: 'expense', label: 'Expense Tracker', icon: '◎' },
  { id: 'password', label: 'Password Manager', icon: '⬡' },
];

export default function Sidebar({ page, setPage, financialEntries, expenses, passwords, userEmail, onLogout, drawerOpen, onDrawerClose }) {
  const totalItems = financialEntries.length + expenses.length + passwords.length;

  return (
    <aside className={`sidebar${drawerOpen ? ' sidebar--open' : ''}`}>
      <div className="sidebar-brand">
        <div className="sidebar-brand-icon">💎</div>
        <div style={{ flex: 1 }}>
          <h2>Finance Hub</h2>
          <span>{userEmail || 'Personal Dashboard'}</span>
        </div>
        <button className="drawer-close-btn" onClick={onDrawerClose} aria-label="Close menu">✕</button>
      </div>

      <nav className="sidebar-nav">
        <div className="sidebar-nav-label">Menu</div>
        {NAV.map((item) => (
          <button
            key={item.id}
            className={`nav-item ${page === item.id ? 'active' : ''}`}
            onClick={() => setPage(item.id)}
          >
            <span style={{ fontSize: '16px', width: 18, textAlign: 'center' }}>{item.icon}</span>
            {item.label}
          </button>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-storage-info">
          <div className="storage-dot" />
          <p>MongoDB · {totalItems} {totalItems === 1 ? 'record' : 'records'} · encrypted</p>
        </div>
        <button className="btn-data" style={{ width: '100%', color: 'var(--red)', borderColor: 'rgba(239,68,68,0.2)' }} onClick={onLogout}>
          ↪ Lock &amp; Sign Out
        </button>
      </div>
    </aside>
  );
}
