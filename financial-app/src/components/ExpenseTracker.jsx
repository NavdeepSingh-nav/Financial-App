import React, { useState } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

// Debit (expense) and Credit (money-in) use different category vocabularies.
const DEBIT_CATEGORIES = ['Food & Dining', 'Fuel', 'Shopping', 'Travel', 'Rent', 'Bills', 'Medical', 'Entertainment', 'Education', 'EMI', 'Subscription', 'Investment', 'Family', 'Other'];
const CREDIT_CATEGORIES = ['Salary', 'Freelance', 'Investment', 'Gift Received', 'Refund', 'Interest', 'Other Income'];
const ALL_CATEGORIES = [...new Set([...DEBIT_CATEGORIES, ...CREDIT_CATEGORIES])];

const CAT_COLORS = {
  'Food & Dining': '#f59e0b', Fuel: '#f97316', Shopping: '#ec4899', Travel: '#3b82f6',
  Rent: '#8b5cf6', Bills: '#eab308', Medical: '#10b981', Entertainment: '#f43f5e',
  Education: '#06b6d4', EMI: '#ef4444', Subscription: '#a855f7', Investment: '#14b8a6',
  Family: '#d946ef', Other: '#64748b',
  Salary: '#22c55e', Freelance: '#0ea5e9', 'Gift Received': '#f472b6',
  Refund: '#60a5fa', Interest: '#fbbf24', 'Other Income': '#94a3b8',
  // Retired category names — kept so entries saved before the category rename still render.
  Food: '#f59e0b', Transport: '#3b82f6', Housing: '#8b5cf6', Health: '#10b981',
};
const CAT_ICONS = {
  'Food & Dining': '🍔', Fuel: '⛽', Shopping: '🛍️', Travel: '🚕', Rent: '🏠',
  Bills: '💡', Medical: '🏥', Entertainment: '🎬', Education: '📚', EMI: '💳',
  Subscription: '🔁', Investment: '📈', Family: '👪', Other: '📦',
  Salary: '💼', Freelance: '💰', 'Gift Received': '🎁', Refund: '💸',
  Interest: '🏦', 'Other Income': '📦',
  // Retired category names — kept so entries saved before the category rename still render.
  Food: '🍔', Transport: '🚗', Housing: '🏠', Health: '💊',
};
const FALLBACK_CAT_COLOR = '#64748b';
const FALLBACK_CAT_ICON = '📦';
const PAYMENT_METHODS = ['Cash', 'Bank Account', 'Debit Card', 'Credit Card', 'UPI', 'Wallet'];
const PAYMENT_ICONS = { Cash: '💵', 'Bank Account': '🏦', 'Debit Card': '💳', 'Credit Card': '💳', UPI: '📱', Wallet: '👛' };

const categoriesForType = (type) => (type === 'Credit' ? CREDIT_CATEGORIES : DEBIT_CATEGORIES);
// Older entries were saved before the Debit/Credit type existed — treat them as Debit.
const isCredit = (e) => e.type === 'Credit';

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
  title: '', amount: '', category: DEBIT_CATEGORIES[0], type: 'Debit', paymentMethod: 'Cash',
  date: new Date().toISOString().slice(0, 10), note: '',
});

export default function ExpenseTracker({ expenses, onAdd, onUpdate, onDelete, budgets, onSaveBudget, onDeleteBudget }) {
  const [form, setForm] = useState(emptyForm);
  const [clientId, setClientId] = useState(() => crypto.randomUUID());
  const [editingId, setEditingId] = useState(null);
  const [filter, setFilter] = useState('All');
  const [typeFilter, setTypeFilter] = useState('All');
  const [dateRange, setDateRange] = useState('all');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const [budgetForm, setBudgetForm] = useState({ category: DEBIT_CATEGORIES[0], limit: '' });
  const [budgetError, setBudgetError] = useState('');
  const [savingBudget, setSavingBudget] = useState(false);

  // Date range scopes the stats + list below; category/type chips just narrow within it.
  const scopedExpenses = expenses.filter((e) => inDateRange(e.date, dateRange));

  const filtered = scopedExpenses
    .filter((e) => filter === 'All' || e.category === filter)
    .filter((e) => typeFilter === 'All' || (typeFilter === 'Credit' ? isCredit(e) : !isCredit(e)));

  const totalDebit = scopedExpenses.filter((e) => !isCredit(e)).reduce((s, e) => s + parseFloat(e.amount), 0);
  const totalCredit = scopedExpenses.filter(isCredit).reduce((s, e) => s + parseFloat(e.amount), 0);
  const netSpent = totalDebit - totalCredit;

  // Union of the current category list with whatever's actually in the data, so
  // entries saved under a retired category name (e.g. before a taxonomy change)
  // still show up instead of silently disappearing from the breakdown.
  const debitCategoriesPresent = [...new Set([...DEBIT_CATEGORIES, ...scopedExpenses.filter((e) => !isCredit(e)).map((e) => e.category)])];
  const catData = debitCategoriesPresent.map((cat) => {
    const inCat = scopedExpenses.filter((e) => e.category === cat);
    const debit = inCat.filter((e) => !isCredit(e)).reduce((s, e) => s + parseFloat(e.amount), 0);
    const credit = inCat.filter(isCredit).reduce((s, e) => s + parseFloat(e.amount), 0);
    return { name: cat, value: Math.max(0, debit - credit), color: CAT_COLORS[cat] || FALLBACK_CAT_COLOR };
  }).filter((d) => d.value > 0);

  const maxCat = Math.max(...catData.map((d) => d.value), 1);

  // Budgets are monthly — compare each category's limit against this calendar month's net spend.
  const currentMonth = new Date().toISOString().slice(0, 7);
  const monthlyExpenses = expenses.filter((e) => e.date && e.date.startsWith(currentMonth));
  const monthlySpend = {};
  DEBIT_CATEGORIES.forEach((cat) => {
    const inCat = monthlyExpenses.filter((e) => e.category === cat);
    const debit = inCat.filter((e) => !isCredit(e)).reduce((s, e) => s + parseFloat(e.amount), 0);
    const credit = inCat.filter(isCredit).reduce((s, e) => s + parseFloat(e.amount), 0);
    monthlySpend[cat] = Math.max(0, debit - credit);
  });
  const overBudget = budgets.filter((b) => monthlySpend[b.category] > b.limit);

  async function handleSaveBudget() {
    const lim = parseFloat(budgetForm.limit);
    if (!budgetForm.limit || isNaN(lim) || lim <= 0) return setBudgetError('Enter a valid positive limit.');
    setBudgetError('');
    setSavingBudget(true);
    try {
      await onSaveBudget(budgetForm.category, lim);
      setBudgetForm((f) => ({ ...f, limit: '' }));
    } catch (err) {
      setBudgetError(err.message);
    } finally {
      setSavingBudget(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.title.trim()) return setError('Title is required.');
    const amt = parseFloat(form.amount);
    if (!form.amount || isNaN(amt) || amt <= 0) return setError('Enter a valid positive amount.');
    setError('');
    setSaving(true);
    try {
      const payload = {
        title: form.title.trim(), amount: amt, category: form.category,
        type: form.type, paymentMethod: form.paymentMethod,
        date: form.date, note: form.note,
      };
      if (editingId) {
        await onUpdate(editingId, payload);
        setEditingId(null);
        setForm(emptyForm());
      } else {
        await onAdd({ ...payload, clientId });
        setForm((f) => ({ ...f, title: '', amount: '', note: '' }));
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
      title: e.title, amount: String(e.amount), category: e.category,
      type: isCredit(e) ? 'Credit' : 'Debit', paymentMethod: e.paymentMethod || 'Cash',
      date: e.date, note: e.note || '',
    });
    setError('');
  }

  function handleCancelEdit() {
    setEditingId(null);
    setForm(emptyForm());
    setError('');
  }

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h1>Expense Tracker</h1>
          <p>Monitor your spending across categories</p>
        </div>
        <div className="form-field" style={{ minWidth: 160, flex: 'none' }}>
          <label>Showing</label>
          <select value={dateRange} onChange={(e) => setDateRange(e.target.value)}>
            {DATE_RANGES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
        </div>
      </div>

      {overBudget.length > 0 && (
        <div className="form-error" style={{ marginBottom: 20 }}>
          ⚠ Over budget this month: {overBudget.map((b) => `${CAT_ICONS[b.category] || FALLBACK_CAT_ICON} ${b.category}`).join(', ')}
        </div>
      )}

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
                    formatter={(value) => `₹${value.toFixed(2)}`}
                    contentStyle={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)' }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="cat-bars" style={{ marginTop: 8 }}>
                {catData.map((d) => (
                  <div className="cat-bar-row" key={d.name}>
                    <div className="cat-bar-meta">
                      <span className="cat-bar-label">{CAT_ICONS[d.name] || FALLBACK_CAT_ICON} {d.name}</span>
                      <span className="cat-bar-amt">₹{d.value.toFixed(2)}</span>
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
          <div style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Net Spent</div>
          <div style={{ fontSize: '2.4rem', fontWeight: 800, color: netSpent >= 0 ? 'var(--red)' : 'var(--green)', letterSpacing: '-1px' }}>
            {netSpent < 0 ? '+' : ''}₹{Math.abs(netSpent).toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
          <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
            ₹{totalDebit.toFixed(2)} debited · ₹{totalCredit.toFixed(2)} credited back
          </div>
        </div>
      </div>

      <div className="form-card">
        <h3>{editingId ? 'Edit Expense' : 'Log Expense'}</h3>
        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-field" style={{ flex: 2 }}>
              <label>Title</label>
              <input placeholder="e.g. Grocery shopping, Uber ride..."
                value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
            </div>
            <div className="form-field">
              <label>Amount (₹)</label>
              <input type="number" placeholder="0.00" min="0" step="0.01"
                value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} />
            </div>
            <div className="form-field">
              <label>Category</label>
              <select value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}>
                {/* Include the entry's current category even if it's a retired name not in the current list,
                    so editing a legacy entry shows its real category instead of silently falling back. */}
                {[...new Set([...categoriesForType(form.type), form.category])].map((c) => (
                  <option key={c} value={c}>{CAT_ICONS[c] || FALLBACK_CAT_ICON} {c}</option>
                ))}
              </select>
            </div>
            <div className="form-field">
              <label>Type</label>
              <select
                value={form.type}
                onChange={(e) => {
                  const type = e.target.value;
                  setForm((f) => ({ ...f, type, category: categoriesForType(type)[0] }));
                }}
              >
                <option value="Debit">🔴 Debit (money out)</option>
                <option value="Credit">🟢 Credit (refund/money back)</option>
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
              <input type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} />
            </div>
            <div className="form-field">
              <label>Note</label>
              <input placeholder="Optional note"
                value={form.note} onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))} />
            </div>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Saving…' : editingId ? 'Update' : 'Add'}
            </button>
            {editingId && (
              <button type="button" className="btn-ghost" onClick={handleCancelEdit}>Cancel</button>
            )}
          </div>
          {error && <div className="form-error">⚠ {error}</div>}
        </form>
      </div>

      <div className="form-card" style={{ marginTop: 20 }}>
        <h3>Monthly Budgets</h3>
        <div className="form-row">
          <div className="form-field">
            <label>Category</label>
            <select value={budgetForm.category} onChange={(e) => setBudgetForm((f) => ({ ...f, category: e.target.value }))}>
              {DEBIT_CATEGORIES.map((c) => <option key={c} value={c}>{CAT_ICONS[c]} {c}</option>)}
            </select>
          </div>
          <div className="form-field">
            <label>Monthly Limit (₹)</label>
            <input type="number" placeholder="0.00" min="0" step="0.01"
              value={budgetForm.limit} onChange={(e) => setBudgetForm((f) => ({ ...f, limit: e.target.value }))} />
          </div>
          <button type="button" className="btn-primary" disabled={savingBudget} onClick={handleSaveBudget}>
            {savingBudget ? 'Saving…' : 'Set Budget'}
          </button>
        </div>
        {budgetError && <div className="form-error">⚠ {budgetError}</div>}

        {budgets.length === 0 ? (
          <div className="empty-state" style={{ padding: '16px 0' }}>
            <div className="empty-state-icon">🎯</div><div>No budgets set yet</div>
          </div>
        ) : (
          <div className="cat-bars" style={{ marginTop: 16 }}>
            {budgets.map((b) => {
              const spent = monthlySpend[b.category] || 0;
              const pct = Math.min(100, (spent / b.limit) * 100);
              const over = spent > b.limit;
              const barColor = over ? 'var(--red)' : pct >= 80 ? 'var(--amber)' : 'var(--green)';
              return (
                <div className="cat-bar-row" key={b.category}>
                  <div className="cat-bar-meta">
                    <span className="cat-bar-label">
                      {CAT_ICONS[b.category] || FALLBACK_CAT_ICON} {b.category}
                      {over && <span style={{ color: 'var(--red)' }}> ⚠ over budget</span>}
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span className="cat-bar-amt" style={{ color: over ? 'var(--red)' : undefined }}>
                        ₹{spent.toFixed(2)} / ₹{b.limit.toFixed(2)}
                      </span>
                      <button className="btn-delete" onClick={() => onDeleteBudget(b.category)}>✕</button>
                    </span>
                  </div>
                  <div className="cat-bar-track">
                    <div className="cat-bar-fill" style={{ width: `${pct}%`, background: barColor }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="filter-chips">
        {['All', 'Debit', 'Credit'].map((t) => (
          <button key={t} className={`chip ${typeFilter === t ? 'active' : ''}`} onClick={() => setTypeFilter(t)}>
            {t === 'Debit' ? '🔴 Debit' : t === 'Credit' ? '🟢 Credit' : 'All'}
          </button>
        ))}
      </div>

      <div className="filter-chips">
        {['All', ...ALL_CATEGORIES].map((cat) => (
          <button key={cat} className={`chip ${filter === cat ? 'active' : ''}`} onClick={() => setFilter(cat)}>
            {cat !== 'All' ? (CAT_ICONS[cat] || FALLBACK_CAT_ICON) + ' ' : ''}{cat}
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
          filtered.map((e) => {
            const credit = isCredit(e);
            const method = e.paymentMethod || 'Cash';
            return (
              <div className="tx-item" key={e._id}>
                <div className="tx-icon" style={{ background: `${CAT_COLORS[e.category] || FALLBACK_CAT_COLOR}18` }}>{CAT_ICONS[e.category] || FALLBACK_CAT_ICON}</div>
                <div className="tx-info">
                  <div className="tx-desc">{e.title}</div>
                  <div className="tx-date">
                    {e.date} · {PAYMENT_ICONS[method]} {method}{e.note ? ` · ${e.note}` : ''}
                  </div>
                </div>
                <span className={`tx-badge ${credit ? 'credit' : 'expense'}`}>{e.category}</span>
                <div className={`tx-amount ${credit ? 'credit' : 'expense'}`}>
                  {credit ? '+' : '-'}₹{parseFloat(e.amount).toFixed(2)}
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
