import React, { useState } from 'react';

const TYPES = ['Income', 'Expense', 'Savings', 'Investment'];
const TYPE_ICONS = { Income: '💰', Expense: '💸', Savings: '🏦', Investment: '📈' };
const PAYMENT_METHODS = ['Cash', 'Bank Account', 'Debit Card', 'Credit Card', 'UPI', 'Wallet'];
const PAYMENT_ICONS = { Cash: '💵', 'Bank Account': '🏦', 'Debit Card': '💳', 'Credit Card': '💳', UPI: '📱', Wallet: '👛' };

// Savings/Investment (FD, mutual funds, LIC, bank balance...) build Net Worth —
// they're money moved into an asset, not money leaving the system like an
// Expense (EMI, credit card bill), so they must never be subtracted from Net Balance.
const isOutflow = (type) => type === 'Expense';

const DATE_RANGES = [
  { value: 'all', label: 'All Time' },
  { value: 'thisMonth', label: 'This Month' },
  { value: 'lastMonth', label: 'Last Month' },
  { value: 'last3Months', label: 'Last 3 Months' },
  { value: 'thisYear', label: 'This Year' },
];

function inDateRange(dateStr, range) {
  if (range === 'all') return true;
  if (!dateStr) return false;
  const now = new Date();
  if (range === 'thisMonth') return dateStr.startsWith(now.toISOString().slice(0, 7));
  if (range === 'lastMonth') {
    const lm = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    return dateStr.startsWith(lm.toISOString().slice(0, 7));
  }
  if (range === 'last3Months') {
    const cutoff = new Date(now.getFullYear(), now.getMonth() - 2, 1);
    return new Date(dateStr) >= cutoff;
  }
  if (range === 'thisYear') return dateStr.startsWith(String(now.getFullYear()));
  return true;
}

const emptyForm = () => ({
  description: '',
  amount: '',
  type: 'Income',
  paymentMethod: 'Cash',
  date: new Date().toISOString().slice(0, 10),
});

export default function FinancialTracker({
  entries, onAdd, onUpdate, onDelete,
  recurringTemplates, onAddRecurring, onDeleteRecurring,
  goals, onAddGoal, onContributeGoal, onDeleteGoal,
}) {
  const [form, setForm] = useState(emptyForm);
  const [clientId, setClientId] = useState(() => crypto.randomUUID());
  const [editingId, setEditingId] = useState(null);
  const [filter, setFilter] = useState('All');
  const [dateRange, setDateRange] = useState('all');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const [recurringForm, setRecurringForm] = useState({
    description: '', amount: '', type: 'Income', paymentMethod: 'Cash', dayOfMonth: '1',
  });
  const [recurringError, setRecurringError] = useState('');
  const [savingRecurring, setSavingRecurring] = useState(false);

  const [goalForm, setGoalForm] = useState({ name: '', targetAmount: '', targetDate: '' });
  const [goalError, setGoalError] = useState('');
  const [savingGoal, setSavingGoal] = useState(false);
  const [contributions, setContributions] = useState({});
  const [contributingId, setContributingId] = useState(null);

  // Date range scopes the stats + list below; the type chip just narrows within it.
  const scopedEntries = entries.filter((e) => inDateRange(e.date, dateRange));

  const totals = scopedEntries.reduce(
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

  const netWorth = totals.savings + totals.investment;
  const balance = totals.income - totals.expense;
  const filtered = filter === 'All' ? scopedEntries : scopedEntries.filter((e) => e.type === filter);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.description.trim()) return setError('Description is required.');
    const amt = parseFloat(form.amount);
    if (!form.amount || isNaN(amt) || amt <= 0) return setError('Enter a valid positive amount.');
    setError('');
    setSaving(true);
    try {
      const payload = {
        description: form.description.trim(), amount: amt, type: form.type,
        paymentMethod: form.paymentMethod, date: form.date,
      };
      if (editingId) {
        await onUpdate(editingId, payload);
        setEditingId(null);
        setForm(emptyForm());
      } else {
        await onAdd({ ...payload, clientId });
        setForm((f) => ({ ...f, description: '', amount: '' }));
        setClientId(crypto.randomUUID());
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  function handleEditClick(e) {
    setEditingId(e._id);
    setForm({
      description: e.description, amount: String(e.amount), type: e.type,
      paymentMethod: e.paymentMethod || 'Cash', date: e.date,
    });
    setError('');
  }

  function handleCancelEdit() {
    setEditingId(null);
    setForm(emptyForm());
    setError('');
  }

  async function handleAddRecurring() {
    if (!recurringForm.description.trim()) return setRecurringError('Description is required.');
    const amt = parseFloat(recurringForm.amount);
    if (!recurringForm.amount || isNaN(amt) || amt <= 0) return setRecurringError('Enter a valid positive amount.');
    const day = parseInt(recurringForm.dayOfMonth, 10);
    if (!day || day < 1 || day > 28) return setRecurringError('Day of month must be between 1 and 28.');
    setRecurringError('');
    setSavingRecurring(true);
    try {
      await onAddRecurring({
        description: recurringForm.description.trim(), amount: amt, type: recurringForm.type,
        paymentMethod: recurringForm.paymentMethod, dayOfMonth: day,
      });
      setRecurringForm((f) => ({ ...f, description: '', amount: '' }));
    } catch (err) {
      setRecurringError(err.message);
    } finally {
      setSavingRecurring(false);
    }
  }

  async function handleAddGoal() {
    if (!goalForm.name.trim()) return setGoalError('Goal name is required.');
    const target = parseFloat(goalForm.targetAmount);
    if (!goalForm.targetAmount || isNaN(target) || target <= 0) return setGoalError('Enter a valid positive target amount.');
    setGoalError('');
    setSavingGoal(true);
    try {
      await onAddGoal({ name: goalForm.name.trim(), targetAmount: target, targetDate: goalForm.targetDate });
      setGoalForm({ name: '', targetAmount: '', targetDate: '' });
    } catch (err) {
      setGoalError(err.message);
    } finally {
      setSavingGoal(false);
    }
  }

  async function handleContribute(goalId) {
    const amt = parseFloat(contributions[goalId]);
    if (!contributions[goalId] || isNaN(amt) || amt <= 0) return;
    setContributingId(goalId);
    try {
      await onContributeGoal(goalId, amt);
      setContributions((c) => ({ ...c, [goalId]: '' }));
    } catch (err) {
      setGoalError(err.message);
    } finally {
      setContributingId(null);
    }
  }

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h1>Financial Tracker</h1>
          <p>Track income, expenses, savings and investments</p>
        </div>
        <div className="form-field" style={{ minWidth: 160, flex: 'none' }}>
          <label>Showing</label>
          <select value={dateRange} onChange={(e) => setDateRange(e.target.value)}>
            {DATE_RANGES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
        </div>
      </div>

      <div className="stat-grid" style={{ marginBottom: 20 }}>
        <div className="stat-card green">
          <div className="stat-icon">💰</div>
          <div className="stat-label">Income</div>
          <div className="stat-value">₹{totals.income.toFixed(2)}</div>
        </div>
        <div className="stat-card red">
          <div className="stat-icon">💸</div>
          <div className="stat-label">Expenses</div>
          <div className="stat-value">₹{totals.expense.toFixed(2)}</div>
        </div>
        <div className="stat-card blue">
          <div className="stat-icon">🏦</div>
          <div className="stat-label">Savings</div>
          <div className="stat-value">₹{totals.savings.toFixed(2)}</div>
        </div>
        <div className="stat-card violet">
          <div className="stat-icon">📈</div>
          <div className="stat-label">Investments</div>
          <div className="stat-value">₹{totals.investment.toFixed(2)}</div>
        </div>
        <div className="stat-card cyan">
          <div className="stat-icon">💎</div>
          <div className="stat-label">Net Worth</div>
          <div className="stat-value">₹{netWorth.toFixed(2)}</div>
        </div>
        <div className={`stat-card ${balance >= 0 ? 'green' : 'red'}`} style={{ gridColumn: 'span 2' }}>
          <div className="stat-icon">{balance >= 0 ? '✅' : '⚠️'}</div>
          <div className="stat-label">Net Balance</div>
          <div className="stat-value">{balance < 0 ? '-' : ''}₹{Math.abs(balance).toFixed(2)}</div>
        </div>
      </div>
      <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: -12, marginBottom: 20 }}>
        Net Worth (Savings + Investments) builds up separately and is never subtracted from your Net Balance — only actual Expenses (EMI, bills, credit card payments...) reduce it.
      </p>

      <div className="form-card">
        <h3>{editingId ? 'Edit Entry' : 'Add Entry'}</h3>
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
              <label>Amount (₹)</label>
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
              <label>Payment Method</label>
              <select value={form.paymentMethod} onChange={(e) => setForm((f) => ({ ...f, paymentMethod: e.target.value }))}>
                {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{PAYMENT_ICONS[m]} {m}</option>)}
              </select>
            </div>
            <div className="form-field">
              <label>Date</label>
              <input type="date" value={form.date}
                onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} />
            </div>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Saving…' : editingId ? 'Update Entry' : 'Add Entry'}
            </button>
            {editingId && (
              <button type="button" className="btn-ghost" onClick={handleCancelEdit}>Cancel</button>
            )}
          </div>
          {error && <div className="form-error">⚠ {error}</div>}
        </form>
      </div>

      <div className="form-card" style={{ marginTop: 20 }}>
        <h3>Recurring Entries</h3>
        <div className="form-row">
          <div className="form-field" style={{ flex: 2 }}>
            <label>Description</label>
            <input
              placeholder="e.g. Monthly salary, Rent, EMI..."
              value={recurringForm.description}
              onChange={(e) => setRecurringForm((f) => ({ ...f, description: e.target.value }))}
            />
          </div>
          <div className="form-field">
            <label>Amount (₹)</label>
            <input type="number" placeholder="0.00" min="0" step="0.01"
              value={recurringForm.amount} onChange={(e) => setRecurringForm((f) => ({ ...f, amount: e.target.value }))} />
          </div>
          <div className="form-field">
            <label>Type</label>
            <select value={recurringForm.type} onChange={(e) => setRecurringForm((f) => ({ ...f, type: e.target.value }))}>
              {TYPES.map((t) => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div className="form-field">
            <label>Payment Method</label>
            <select value={recurringForm.paymentMethod} onChange={(e) => setRecurringForm((f) => ({ ...f, paymentMethod: e.target.value }))}>
              {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{PAYMENT_ICONS[m]} {m}</option>)}
            </select>
          </div>
          <div className="form-field">
            <label>Day of Month</label>
            <input type="number" placeholder="1" min="1" max="28" step="1"
              value={recurringForm.dayOfMonth} onChange={(e) => setRecurringForm((f) => ({ ...f, dayOfMonth: e.target.value }))} />
          </div>
          <button type="button" className="btn-primary" disabled={savingRecurring} onClick={handleAddRecurring}>
            {savingRecurring ? 'Saving…' : 'Add Recurring'}
          </button>
        </div>
        {recurringError && <div className="form-error">⚠ {recurringError}</div>}
        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 10 }}>
          Auto-creates an entry on this day every month (the current month's entry is added right away).
        </p>

        {recurringTemplates.length === 0 ? (
          <div className="empty-state" style={{ padding: '16px 0' }}>
            <div className="empty-state-icon">🔁</div><div>No recurring entries yet</div>
          </div>
        ) : (
          recurringTemplates.map((t) => (
            <div className="tx-item" key={t._id}>
              <div className={`tx-icon ${t.type.toLowerCase()}`}>{TYPE_ICONS[t.type]}</div>
              <div className="tx-info">
                <div className="tx-desc">{t.description}</div>
                <div className="tx-date">Day {t.dayOfMonth} of every month · {PAYMENT_ICONS[t.paymentMethod || 'Cash']} {t.paymentMethod || 'Cash'}</div>
              </div>
              <span className={`tx-badge ${t.type.toLowerCase()}`}>{t.type}</span>
              <div className={`tx-amount ${t.type.toLowerCase()}`}>
                {isOutflow(t.type) ? '-' : '+'}₹{parseFloat(t.amount).toFixed(2)}
              </div>
              <button className="btn-delete" onClick={() => onDeleteRecurring(t._id)}>✕</button>
            </div>
          ))
        )}
      </div>

      <div className="form-card" style={{ marginTop: 20 }}>
        <h3>Savings Goals</h3>
        <div className="form-row">
          <div className="form-field" style={{ flex: 2 }}>
            <label>Goal Name</label>
            <input
              placeholder="e.g. Emergency fund, Vacation, New laptop..."
              value={goalForm.name}
              onChange={(e) => setGoalForm((f) => ({ ...f, name: e.target.value }))}
            />
          </div>
          <div className="form-field">
            <label>Target Amount (₹)</label>
            <input type="number" placeholder="0.00" min="0" step="0.01"
              value={goalForm.targetAmount} onChange={(e) => setGoalForm((f) => ({ ...f, targetAmount: e.target.value }))} />
          </div>
          <div className="form-field">
            <label>Target Date (optional)</label>
            <input type="date" value={goalForm.targetDate}
              onChange={(e) => setGoalForm((f) => ({ ...f, targetDate: e.target.value }))} />
          </div>
          <button type="button" className="btn-primary" disabled={savingGoal} onClick={handleAddGoal}>
            {savingGoal ? 'Saving…' : 'Add Goal'}
          </button>
        </div>
        {goalError && <div className="form-error">⚠ {goalError}</div>}

        {goals.length === 0 ? (
          <div className="empty-state" style={{ padding: '16px 0' }}>
            <div className="empty-state-icon">🎯</div><div>No savings goals yet</div>
          </div>
        ) : (
          <div className="cat-bars" style={{ marginTop: 16 }}>
            {goals.map((g) => {
              const pct = Math.min(100, (g.currentAmount / g.targetAmount) * 100);
              const reached = g.currentAmount >= g.targetAmount;
              return (
                <div className="cat-bar-row" key={g._id} style={{ marginBottom: 14 }}>
                  <div className="cat-bar-meta">
                    <span className="cat-bar-label">
                      🎯 {g.name}{g.targetDate ? ` · by ${g.targetDate}` : ''}
                      {reached && <span style={{ color: 'var(--green)' }}> ✓ reached</span>}
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span className="cat-bar-amt">
                        ₹{g.currentAmount.toFixed(2)} / ₹{g.targetAmount.toFixed(2)} ({pct.toFixed(0)}%)
                      </span>
                      <button className="btn-delete" onClick={() => onDeleteGoal(g._id)}>✕</button>
                    </span>
                  </div>
                  <div className="cat-bar-track">
                    <div className="cat-bar-fill" style={{ width: `${pct}%`, background: reached ? 'var(--green)' : 'var(--cyan)' }} />
                  </div>
                  {!reached && (
                    <div className="form-field" style={{ flexDirection: 'row', gap: 8, marginTop: 6, maxWidth: 280 }}>
                      <input
                        type="number" placeholder="Add funds (₹)" min="0" step="0.01"
                        value={contributions[g._id] || ''}
                        onChange={(e) => setContributions((c) => ({ ...c, [g._id]: e.target.value }))}
                      />
                      <button
                        type="button" className="btn-ghost" disabled={contributingId === g._id}
                        onClick={() => handleContribute(g._id)}
                      >
                        {contributingId === g._id ? 'Adding…' : 'Add Funds'}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
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
            const method = e.paymentMethod || 'Cash';
            return (
              <div className="tx-item" key={e._id}>
                <div className={`tx-icon ${typeKey}`}>{TYPE_ICONS[e.type]}</div>
                <div className="tx-info">
                  <div className="tx-desc">{e.description}</div>
                  <div className="tx-date">{e.date} · {PAYMENT_ICONS[method]} {method}</div>
                </div>
                <span className={`tx-badge ${typeKey}`}>{e.type}</span>
                <div className={`tx-amount ${typeKey}`}>
                  {isOutflow(e.type) ? '-' : '+'}₹{parseFloat(e.amount).toFixed(2)}
                </div>
                <button className="btn-delete" onClick={() => handleEditClick(e)}>✎</button>
                <button className="btn-delete" onClick={() => onDelete(e._id)}>✕</button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
