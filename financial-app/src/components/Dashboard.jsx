import React from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

const CAT_COLORS = {
  Food: '#f59e0b', Transport: '#3b82f6', Housing: '#8b5cf6',
  Health: '#10b981', Entertainment: '#f97316', Shopping: '#ec4899',
  Education: '#06b6d4', Other: '#64748b',
};
const TYPE_ICONS = { Income: '💰', Expense: '💸', Savings: '🏦', Investment: '📈' };

export default function Dashboard({ financialEntries, expenses, passwords, setPage }) {
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

  const balance = fin.income - fin.expense - fin.savings - fin.investment;
  const totalSpent = expenses.reduce((s, e) => s + parseFloat(e.amount), 0);

  const catData = Object.entries(CAT_COLORS)
    .map(([name, color]) => ({
      name,
      value: expenses.filter((e) => e.category === name).reduce((s, e) => s + parseFloat(e.amount), 0),
      color,
    }))
    .filter((d) => d.value > 0);

  const recentTx = [...financialEntries].slice(0, 6);

  return (
    <div>
      <div className="page-header">
        <h1>Dashboard</h1>
        <p>Your financial overview at a glance</p>
      </div>

      <div className="balance-hero">
        <div className="balance-hero-label">Net Balance</div>
        <div className={`balance-hero-value ${balance >= 0 ? 'positive' : 'negative'}`}>
          {balance < 0 ? '-' : ''}${Math.abs(balance).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
        <div className="balance-hero-sub">
          Income ${fin.income.toFixed(2)} · Expenses ${fin.expense.toFixed(2)} · Savings ${fin.savings.toFixed(2)} · Investments ${fin.investment.toFixed(2)}
        </div>
      </div>

      <div className="stat-grid">
        <div className="stat-card green">
          <div className="stat-icon">💰</div>
          <div className="stat-label">Total Income</div>
          <div className="stat-value">${fin.income.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
        </div>
        <div className="stat-card red">
          <div className="stat-icon">💸</div>
          <div className="stat-label">Financial Expenses</div>
          <div className="stat-value">${fin.expense.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
        </div>
        <div className="stat-card blue">
          <div className="stat-icon">🏦</div>
          <div className="stat-label">Total Savings</div>
          <div className="stat-value">${fin.savings.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
        </div>
        <div className="stat-card violet">
          <div className="stat-icon">📈</div>
          <div className="stat-label">Investments</div>
          <div className="stat-value">${fin.investment.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
        </div>
        <div className="stat-card amber">
          <div className="stat-icon">🛒</div>
          <div className="stat-label">Total Spent</div>
          <div className="stat-value">${totalSpent.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
        </div>
        <div className="stat-card primary">
          <div className="stat-icon">🔑</div>
          <div className="stat-label">Passwords Saved</div>
          <div className="stat-value" style={{ color: 'var(--primary)' }}>{passwords.length}</div>
        </div>
      </div>

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
                  {e.type === 'Income' ? '+' : '-'}${parseFloat(e.amount).toFixed(2)}
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
                    formatter={(value) => `$${value.toFixed(2)}`}
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
