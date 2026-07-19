import React from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from 'recharts';

// Debit/expense categories only — matches ExpenseTracker's DEBIT_CATEGORIES.
const CAT_COLORS = {
  'Food & Dining': '#f59e0b', Fuel: '#f97316', Shopping: '#ec4899', Travel: '#3b82f6',
  Rent: '#8b5cf6', Bills: '#eab308', Medical: '#10b981', Entertainment: '#f43f5e',
  Education: '#06b6d4', EMI: '#ef4444', Subscription: '#a855f7', Investment: '#14b8a6',
  Family: '#d946ef', Other: '#64748b',
  // Retired category names — kept so entries saved before the category rename still render.
  Food: '#f59e0b', Transport: '#3b82f6', Housing: '#8b5cf6', Health: '#10b981',
};
const FALLBACK_CAT_COLOR = '#64748b';
const TYPE_ICONS = { Income: '💰', Expense: '💸', Savings: '🏦', Investment: '📈' };
const PAYMENT_METHODS = ['Cash', 'Bank Account', 'Debit Card', 'Credit Card', 'UPI', 'Wallet'];
const PAYMENT_ICONS = { Cash: '💵', 'Bank Account': '🏦', 'Debit Card': '💳', 'Credit Card': '💳', UPI: '📱', Wallet: '👛' };

// Savings/Investment build Net Worth (an asset), not a reduction of Net Balance —
// only Expense (EMI, bills, credit card payments...) is real money leaving the system.
const isOutflow = (type) => type === 'Expense';

// How much of each entry actually moves through the named account, sign included —
// Savings/Investment count as money leaving the account (into an asset elsewhere),
// same as Expense, even though they don't reduce Net Worth.
function accountDelta(type, isExpenseTrackerCredit) {
  if (isExpenseTrackerCredit !== undefined) return isExpenseTrackerCredit ? 1 : -1;
  if (type === 'Income') return 1;
  return -1; // Expense, Savings, Investment all move money out of the account
}

export default function Dashboard({ financialEntries, expenses, passwords, budgets, setPage }) {
  const fin = financialEntries.reduce(
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

  const netWorth = fin.savings + fin.investment;
  const balance = fin.income - fin.expense;
  const totalDebit = expenses.filter((e) => e.type !== 'Credit').reduce((s, e) => s + parseFloat(e.amount), 0);
  const totalCredit = expenses.filter((e) => e.type === 'Credit').reduce((s, e) => s + parseFloat(e.amount), 0);
  const totalSpent = totalDebit - totalCredit;

  // Union of known categories with whatever's actually in the data, so entries saved
  // under a retired category name still show up instead of silently disappearing.
  const debitCategoriesPresent = [...new Set([...Object.keys(CAT_COLORS), ...expenses.filter((e) => e.type !== 'Credit').map((e) => e.category)])];
  const catData = debitCategoriesPresent
    .map((name) => {
      const inCat = expenses.filter((e) => e.category === name);
      const debit = inCat.filter((e) => e.type !== 'Credit').reduce((s, e) => s + parseFloat(e.amount), 0);
      const credit = inCat.filter((e) => e.type === 'Credit').reduce((s, e) => s + parseFloat(e.amount), 0);
      return { name, value: Math.max(0, debit - credit), color: CAT_COLORS[name] || FALLBACK_CAT_COLOR };
    })
    .filter((d) => d.value > 0);

  const recentTx = [...financialEntries].slice(0, 6);

  const currentMonth = new Date().toISOString().slice(0, 7);
  const monthlyExpenses = expenses.filter((e) => e.date && e.date.startsWith(currentMonth) && e.type !== 'Credit');
  const overBudget = (budgets || []).filter((b) => {
    const spent = monthlyExpenses.filter((e) => e.category === b.category).reduce((s, e) => s + parseFloat(e.amount), 0);
    return spent > b.limit;
  });

  // Account Balances: how much has actually moved through each payment method,
  // computed from every entry that named it — no separate ledger to keep in sync.
  const accountBalances = PAYMENT_METHODS.map((method) => {
    const finTotal = financialEntries
      .filter((e) => (e.paymentMethod || 'Cash') === method)
      .reduce((s, e) => s + accountDelta(e.type) * parseFloat(e.amount), 0);
    const expTotal = expenses
      .filter((e) => (e.paymentMethod || 'Cash') === method)
      .reduce((s, e) => s + accountDelta(null, e.type === 'Credit') * parseFloat(e.amount), 0);
    return { method, balance: finTotal + expTotal };
  }).filter((a) => a.balance !== 0);

  // Last 6 months of Income vs Expense, for a quick trend view.
  const trendData = Array.from({ length: 6 }, (_, i) => {
    const d = new Date();
    d.setDate(1); // pin to the 1st first so setMonth can't roll into the wrong month
    d.setMonth(d.getMonth() - (5 - i));
    const key = d.toISOString().slice(0, 7);
    const label = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
    const income = financialEntries.filter((e) => e.type === 'Income' && e.date?.startsWith(key)).reduce((s, e) => s + parseFloat(e.amount), 0);
    const expense = financialEntries.filter((e) => e.type === 'Expense' && e.date?.startsWith(key)).reduce((s, e) => s + parseFloat(e.amount), 0);
    return { month: label, Income: income, Expense: expense };
  });
  const hasTrendData = trendData.some((d) => d.Income > 0 || d.Expense > 0);

  return (
    <div>
      <div className="page-header">
        <h1>Dashboard</h1>
        <p>Your financial overview at a glance</p>
      </div>

      {overBudget.length > 0 && (
        <div className="form-error" style={{ marginBottom: 20 }}>
          ⚠ Over budget this month in {overBudget.length} {overBudget.length === 1 ? 'category' : 'categories'}: {overBudget.map((b) => b.category).join(', ')}
          {' — '}
          <button className="btn-primary" style={{ fontSize: '0.75rem', padding: '4px 10px', marginLeft: 4 }} onClick={() => setPage('expense')}>
            Review
          </button>
        </div>
      )}

      <div className="balance-hero">
        <div className="balance-hero-label">Net Balance</div>
        <div className={`balance-hero-value ${balance >= 0 ? 'positive' : 'negative'}`}>
          {balance < 0 ? '-' : ''}₹{Math.abs(balance).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
        <div className="balance-hero-sub">
          Income ₹{fin.income.toFixed(2)} · Expenses ₹{fin.expense.toFixed(2)} · Net Worth (Savings + Investments) ₹{netWorth.toFixed(2)}
        </div>
      </div>

      <div className="stat-grid">
        <div className="stat-card green">
          <div className="stat-icon">💰</div>
          <div className="stat-label">Total Income</div>
          <div className="stat-value">₹{fin.income.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
        </div>
        <div className="stat-card red">
          <div className="stat-icon">💸</div>
          <div className="stat-label">Financial Expenses</div>
          <div className="stat-value">₹{fin.expense.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
        </div>
        <div className="stat-card blue">
          <div className="stat-icon">🏦</div>
          <div className="stat-label">Total Savings</div>
          <div className="stat-value">₹{fin.savings.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
        </div>
        <div className="stat-card violet">
          <div className="stat-icon">📈</div>
          <div className="stat-label">Investments</div>
          <div className="stat-value">₹{fin.investment.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
        </div>
        <div className="stat-card cyan">
          <div className="stat-icon">💎</div>
          <div className="stat-label">Net Worth</div>
          <div className="stat-value">₹{netWorth.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
        </div>
        <div className="stat-card amber">
          <div className="stat-icon">🛒</div>
          <div className="stat-label">Total Spent</div>
          <div className="stat-value" style={totalSpent < 0 ? { color: 'var(--green)' } : undefined}>
            {totalSpent < 0 ? '+' : ''}₹{Math.abs(totalSpent).toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
        </div>
        <div className="stat-card primary">
          <div className="stat-icon">🔑</div>
          <div className="stat-label">Passwords Saved</div>
          <div className="stat-value" style={{ color: 'var(--primary)' }}>{passwords.length}</div>
        </div>
      </div>

      {accountBalances.length > 0 && (
        <div className="col-card" style={{ marginBottom: 24 }}>
          <h3>Account Balances</h3>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: -4, marginBottom: 12 }}>
            How much has moved through each account — Income/Credit adds, Expense/Savings/Investment/Debit subtracts.
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            {accountBalances.map((a) => (
              <div key={a.method} style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px',
                background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)',
              }}>
                <span style={{ fontSize: '1.1rem' }}>{PAYMENT_ICONS[a.method]}</span>
                <div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{a.method}</div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 700, color: a.balance >= 0 ? 'var(--green)' : 'var(--red)' }}>
                    {a.balance < 0 ? '-' : ''}₹{Math.abs(a.balance).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {hasTrendData && (
        <div className="col-card" style={{ marginBottom: 24 }}>
          <h3>Monthly Trend — Income vs Expense</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="month" stroke="var(--text-muted)" fontSize={12} />
              <YAxis stroke="var(--text-muted)" fontSize={12} />
              <Tooltip
                formatter={(value) => `₹${value.toFixed(2)}`}
                contentStyle={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)' }}
              />
              <Legend wrapperStyle={{ fontSize: '0.8rem' }} />
              <Bar dataKey="Income" fill="#10b981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Expense" fill="#ef4444" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="two-col">
        <div className="col-card">
          <h3>Recent Transactions</h3>
          {recentTx.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📋</div>
              <div>No transactions yet</div>
              <button className="btn-primary" style={{ marginTop: 12, fontSize: '0.8rem', padding: '7px 16px' }} onClick={() => setPage('financial')}>
                Add your first entry
              </button>
            </div>
          ) : (
            recentTx.map((e) => (
              <div className="tx-item" key={e._id}>
                <div className={`tx-icon ${e.type.toLowerCase()}`}>{TYPE_ICONS[e.type]}</div>
                <div className="tx-info">
                  <div className="tx-desc">{e.description}</div>
                  <div className="tx-date">{e.date}</div>
                </div>
                <span className={`tx-badge ${e.type.toLowerCase()}`}>{e.type}</span>
                <div className={`tx-amount ${e.type.toLowerCase()}`}>
                  {isOutflow(e.type) ? '-' : '+'}₹{parseFloat(e.amount).toFixed(2)}
                </div>
              </div>
            ))
          )}
        </div>

        <div className="col-card">
          <h3>Expense Breakdown</h3>
          {catData.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">🥧</div>
              <div>No expenses logged yet</div>
              <button className="btn-primary" style={{ marginTop: 12, fontSize: '0.8rem', padding: '7px 16px' }} onClick={() => setPage('expense')}>
                Track expenses
              </button>
            </div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={catData} cx="50%" cy="50%" innerRadius={52} outerRadius={80} paddingAngle={3} dataKey="value">
                    {catData.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
                  </Pie>
                  <Tooltip
                    formatter={(value) => `₹${value.toFixed(2)}`}
                    contentStyle={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)' }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 14px', marginTop: 8 }}>
                {catData.map((d) => (
                  <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: d.color, flexShrink: 0 }} />
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{d.name}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
