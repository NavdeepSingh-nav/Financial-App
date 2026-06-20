// In dev: requests go to /api (Vite proxies → localhost:5001).
// In production: VITE_API_URL must be set to the backend URL.
const BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : '/api';

function token() {
  return localStorage.getItem('fh_token');
}

async function req(method, path, body) {
  let res;
  try {
    res = await fetch(`${BASE}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token() ? { Authorization: `Bearer ${token()}` } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error('Cannot reach server. Make sure the backend is running on port 5001.');
  }

  if (res.status === 401) {
    localStorage.removeItem('fh_token');
    window.dispatchEvent(new Event('auth:expired'));
  }

  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Request failed');
  return data;
}

export const api = {
  // Auth
  register:  (email, pw) => req('POST', '/auth/register', { email, password: pw }),
  login:     (email, pw) => req('POST', '/auth/login',    { email, password: pw }),
  me:        ()          => req('GET',  '/auth/me'),

  // Financial
  getFinancial:    ()     => req('GET',    '/financial'),
  addFinancial:    (data) => req('POST',   '/financial', data),
  deleteFinancial: (id)   => req('DELETE', `/financial/${id}`),

  // Expenses
  getExpenses:    ()     => req('GET',    '/expenses'),
  addExpense:     (data) => req('POST',   '/expenses', data),
  deleteExpense:  (id)   => req('DELETE', `/expenses/${id}`),

  // Passwords
  getPasswords:    ()     => req('GET',    '/passwords'),
  addPassword:     (data) => req('POST',   '/passwords', data),
  deletePassword:  (id)   => req('DELETE', `/passwords/${id}`),
};
