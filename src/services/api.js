/**
 * RetailKhata Production API Client
 * Manages JWT authorization tokens and communication with the SQLite backend.
 */

const API_BASE = '/api';

export const getStoredToken = () => {
  return localStorage.getItem('retail_jwt_token');
};

export const setStoredToken = (token) => {
  if (token) {
    localStorage.setItem('retail_jwt_token', token);
  } else {
    localStorage.removeItem('retail_jwt_token');
  }
};

const request = async (endpoint, options = {}) => {
  const token = getStoredToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  try {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      const errorMsg = data.error || `HTTP ${res.status}: ${res.statusText}`;
      const err = new Error(errorMsg);
      err.status = res.status;
      err.data = data;
      throw err;
    }

    return data;
  } catch (err) {
    console.warn(`API Error [${endpoint}]:`, err.message);
    throw err;
  }
};

// Authentication & Profile Endpoints
export const authApi = {
  login: (email, password) => request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password })
  }),
  register: (payload) => request('/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload)
  }),
  getMe: () => request('/auth/me'),
  updateProfile: (payload) => request('/auth/profile', {
    method: 'PUT',
    body: JSON.stringify(payload)
  })
};

// Products Catalog Endpoints
export const productsApi = {
  getAll: () => request('/products'),
  add: (product) => request('/products', {
    method: 'POST',
    body: JSON.stringify(product)
  }),
  update: (id, product) => request(`/products/${id}`, {
    method: 'PUT',
    body: JSON.stringify(product)
  }),
  delete: (id) => request(`/products/${id}`, {
    method: 'DELETE'
  })
};

// End-Of-Day Z-Reports Endpoints
export const zReportsApi = {
  getAll: (month) => request(`/z-reports${month ? `?month=${month}` : ''}`),
  getByDate: (date) => request(`/z-reports/${date}`),
  save: (reportData) => request('/z-reports', {
    method: 'POST',
    body: JSON.stringify(reportData)
  }),
  delete: (id) => request(`/z-reports/${id}`, {
    method: 'DELETE'
  })
};

// Backup, Export, Import & Server Persistence Endpoints
export const backupApi = {
  exportData: () => request('/backup/export'),
  importData: (payload) => request('/backup/import', {
    method: 'POST',
    body: JSON.stringify(payload)
  }),
  getStatus: () => request('/backup/status'),
  bulkSync: (payload) => request('/sync/bulk', {
    method: 'POST',
    body: JSON.stringify(payload)
  })
};
