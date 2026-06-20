const BASE = `${import.meta.env.VITE_API_URL || 'http://localhost:5001'}/api`;

function token() {
  return localStorage.getItem('fh_token');
}

async function req(method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token() ? { Authorization: `Bearer ${token()}` } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

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
  status:    ()   => req('GET',  '/auth/status'),
  setup:     (pw) => req('POST', '/auth/setup', { password: pw }),
  login:     (pw) => req('POST', '/auth/login', { password: pw }),
  me:        ()   => req('GET',  '/auth/me'),

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
