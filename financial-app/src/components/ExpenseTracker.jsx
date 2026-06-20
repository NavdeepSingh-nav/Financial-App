import React, { useState } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

const CATEGORIES = ['Food', 'Transport', 'Housing', 'Health', 'Entertainment', 'Shopping', 'Education', 'Other'];
const CAT_COLORS = {
  Food: '#f59e0b', Transport: '#3b82f6', Housing: '#8b5cf6',
  Health: '#10b981', Entertainment: '#f97316', Shopping: '#ec4899',
  Education: '#06b6d4', Other: '#64748b',
};
const CAT_ICONS = {
  Food: '🍔', Transport: '🚗', Housing: '🏠', Health: '💊',
  Entertainment: '🎬', Shopping: '🛍️', Education: '📚', Other: '📌',
};

export default function ExpenseTracker({ expenses, onAdd, onDelete }) {
  const [form, setForm] = useState({
    title: '', amount: '', category: 'Food',
    date: new Date().toISOString().slice(0, 10), note: '',
  });
  const [clientId, setClientId] = useState(() => crypto.randomUUID());
  const [filter, setFilter] = useState('All');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const filtered = filter === 'All' ? expenses : expenses.filter((e) => e.category === filter);
  const grandTotal = expenses.reduce((s, e) => s + parseFloat(e.amount), 0);

  const catData = CATEGORIES.map((cat) => ({
    name: cat,
    value: expenses.filter((e) => e.category === cat).reduce((s, e) => s + parseFloat(e.amount), 0),
    color: CAT_COLORS[cat],
  })).filter((d) => d.value > 0);

  const maxCat = Math.max(...catData.map((d) => d.value), 1);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.title.trim()) return setError('Title is required.');
    const amt = parseFloat(form.amount);
    if (!form.amount || isNaN(amt) || amt <= 0) return setError('Enter a valid positive amount.');
    setError('');
    setSaving(true);
    try {
      await onAdd({ title: form.title.trim(), amount: amt, category: form.category, date: form.date, note: form.note, clientId });
      setForm((f) => ({ ...f, title: '', amount: '', note: '' }));
      setClientId(crypto.randomUUID());
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="page-header">
        <h1>Expense Tracker</h1>
        <p>Monitor your spending across categories</p>
      </div>

      <div className="two-col" style={{ marginBottom: 20 }}>
        <div className="col-card">
          <h3>Spending by Category</h3>
          {catData.length === 0 ? (
            <div className="empty-state" style={{ padding: '24px 0' }}>
              <div className="empty-state-icon">🥧</div><div>No data yet</div>
            </div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={catData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={3} dataKey="value">
                    {catData.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
                  </Pie>
                  <Tooltip
                    formatter={(value) => `$${value.toFixed(2)}`}
                    contentStyle={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)' }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="cat-bars" style={{ marginTop: 8 }}>
                {catData.map((d) => (
                  <div className="cat-bar-row" key={d.name}>
                    <div className="cat-bar-meta">
                      <span className="cat-bar-label">{CAT_ICONS[d.name]} {d.name}</span>
                      <span className="cat-bar-amt">${d.value.toFixed(2)}</span>
                    </div>
                    <div className="cat-bar-track">
                      <div className="cat-bar-fill" style={{ width: `${(d.value / maxCat) * 100}%`, background: d.color }} />
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="col-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: 8 }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Total Spent</div>
          <div style={{ fontSize: '2.4rem', fontWeight: 800, color: 'var(--red)', letterSpacing: '-1px' }}>
            ${grandTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
          <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{expenses.length} expenses logged</div>
        </div>
      </div>

      <div className="form-card">
        <h3>Log Expense</h3>
        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-field" style={{ flex: 2 }}>
              <label>Title</label>
              <input placeholder="e.g. Grocery shopping, Uber ride..."
                value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
            </div>
            <div className="form-field">
              <label>Amount ($)</label>
              <input type="number" placeholder="0.00" min="0" step="0.01"
                value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} />
            </div>
            <div className="form-field">
              <label>Category</label>
              <select value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}>
                {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div className="form-field">
              <label>Date</label>
              <input type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} />
            </div>
            <div className="form-field">
              <label>Note</label>
              <input placeholder="Optional note"
                value={form.note} onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))} />
            </div>
            <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Add'}</button>
          </div>
          {error && <div className="form-error">⚠ {error}</div>}
        </form>
      </div>

      <div className="filter-chips">
        {['All', ...CATEGORIES].map((cat) => (
          <button key={cat} className={`chip ${filter === cat ? 'active' : ''}`} onClick={() => setFilter(cat)}>
            {cat !== 'All' ? CAT_ICONS[cat] + ' ' : ''}{cat}
          </button>
        ))}
      </div>

      <div className="list-card">
        <div className="list-header">
          <h3>Expenses</h3>
          <span>{filtered.length} {filtered.length === 1 ? 'item' : 'items'}</span>
        </div>
        {filtered.length === 0 ? (
          <div className="empty-state"><div className="empty-state-icon">🛒</div><div>No expenses found</div></div>
        ) : (
          filtered.map((e) => (
            <div className="tx-item" key={e._id}>
              <div className="tx-icon" style={{ background: `${CAT_COLORS[e.category]}18` }}>{CAT_ICONS[e.category]}</div>
              <div className="tx-info">
                <div className="tx-desc">{e.title}</div>
                <div className="tx-date">{e.date}{e.note ? ` · ${e.note}` : ''}</div>
              </div>
              <span className="tx-badge expense">{e.category}</span>
              <div className="tx-amount expense">-${parseFloat(e.amount).toFixed(2)}</div>
              <button className="btn-delete" onClick={() => onDelete(e._id)}>✕</button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
