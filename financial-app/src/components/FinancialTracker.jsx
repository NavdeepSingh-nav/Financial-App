import React, { useState } from 'react';

const TYPES = ['Income', 'Expense', 'Savings', 'Investment'];
const TYPE_ICONS = { Income: '💰', Expense: '💸', Savings: '🏦', Investment: '📈' };

export default function FinancialTracker({ entries, onAdd, onDelete }) {
  const [form, setForm] = useState({
    description: '',
    amount: '',
    type: 'Income',
    date: new Date().toISOString().slice(0, 10),
  });
  const [filter, setFilter] = useState('All');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const totals = entries.reduce(
    (a, e) => {
      const amt = parseFloat(e.amount);
      if (e.type === 'Income') a.income += amt;
      else if (e.type === 'Expense') a.expense += amt;
      else if (e.type === 'Savings') a.savings += amt;
      else if (e.type === 'Investment') a.investment += amt;
      return a;
    },
    { income: 0, expense: 0, savings: 0, investment: 0 }
  );

  const balance = totals.income - totals.expense - totals.savings - totals.investment;
  const filtered = filter === 'All' ? entries : entries.filter((e) => e.type === filter);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.description.trim()) return setError('Description is required.');
    const amt = parseFloat(form.amount);
    if (!form.amount || isNaN(amt) || amt <= 0) return setError('Enter a valid positive amount.');
    setError('');
    setSaving(true);
    try {
      await onAdd({ description: form.description.trim(), amount: amt, type: form.type, date: form.date });
      setForm((f) => ({ ...f, description: '', amount: '' }));
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="page-header">
        <h1>Financial Tracker</h1>
        <p>Track income, expenses, savings and investments</p>
      </div>

      <div className="stat-grid" style={{ marginBottom: 20 }}>
        <div className="stat-card green">
          <div className="stat-icon">💰</div>
          <div className="stat-label">Income</div>
          <div className="stat-value">${totals.income.toFixed(2)}</div>
        </div>
        <div className="stat-card red">
          <div className="stat-icon">💸</div>
          <div className="stat-label">Expenses</div>
          <div className="stat-value">${totals.expense.toFixed(2)}</div>
        </div>
        <div className="stat-card blue">
          <div className="stat-icon">🏦</div>
          <div className="stat-label">Savings</div>
          <div className="stat-value">${totals.savings.toFixed(2)}</div>
        </div>
        <div className="stat-card violet">
          <div className="stat-icon">📈</div>
          <div className="stat-label">Investments</div>
          <div className="stat-value">${totals.investment.toFixed(2)}</div>
        </div>
        <div className={`stat-card ${balance >= 0 ? 'green' : 'red'}`} style={{ gridColumn: 'span 2' }}>
          <div className="stat-icon">{balance >= 0 ? '✅' : '⚠️'}</div>
          <div className="stat-label">Net Balance</div>
          <div className="stat-value">{balance < 0 ? '-' : ''}${Math.abs(balance).toFixed(2)}</div>
        </div>
      </div>

      <div className="form-card">
        <h3>Add Entry</h3>
        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-field" style={{ flex: 2 }}>
              <label>Description</label>
              <input
                placeholder="e.g. Monthly salary, Rent payment..."
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>
            <div className="form-field">
              <label>Amount ($)</label>
              <input
                type="number" placeholder="0.00" min="0" step="0.01"
                value={form.amount}
                onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
              />
            </div>
            <div className="form-field">
              <label>Type</label>
              <select value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}>
                {TYPES.map((t) => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div className="form-field">
              <label>Date</label>
              <input type="date" value={form.date}
                onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} />
            </div>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Saving…' : 'Add Entry'}
            </button>
          </div>
          {error && <div className="form-error">⚠ {error}</div>}
        </form>
      </div>

      <div className="filter-chips">
        {['All', ...TYPES].map((t) => (
          <button key={t} className={`chip ${filter === t ? 'active' : ''}`} onClick={() => setFilter(t)}>
            {t !== 'All' && TYPE_ICONS[t] + ' '}{t}
          </button>
        ))}
      </div>

      <div className="list-card">
        <div className="list-header">
          <h3>Transactions</h3>
          <span>{filtered.length} {filtered.length === 1 ? 'entry' : 'entries'}</span>
        </div>
        {filtered.length === 0 ? (
          <div className="empty-state"><div className="empty-state-icon">📋</div><div>No entries found</div></div>
        ) : (
          filtered.map((e) => {
            const typeKey = e.type.toLowerCase();
            return (
              <div className="tx-item" key={e._id}>
                <div className={`tx-icon ${typeKey}`}>{TYPE_ICONS[e.type]}</div>
                <div className="tx-info">
                  <div className="tx-desc">{e.description}</div>
                  <div className="tx-date">{e.date}</div>
                </div>
                <span className={`tx-badge ${typeKey}`}>{e.type}</span>
                <div className={`tx-amount ${typeKey}`}>
                  {e.type === 'Income' ? '+' : '-'}${parseFloat(e.amount).toFixed(2)}
                </div>
                <button className="btn-delete" onClick={() => onDelete(e._id)}>✕</button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
