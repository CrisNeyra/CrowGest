import { auth } from '../firebase';

const API_BASE = import.meta.env.VITE_API_URL?.replace(/\/$/, '') || '';

export function isApiEnabled() {
  return Boolean(API_BASE);
}

async function authHeaders() {
  const user = auth.currentUser;
  const headers = { 'Content-Type': 'application/json' };
  if (user) {
    const token = await user.getIdToken();
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

export async function apiFetch(path, options = {}) {
  if (!API_BASE) {
    throw new Error('VITE_API_URL no configurada');
  }
  const headers = await authHeaders();
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { ...headers, ...options.headers },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detail = data?.detail;
    const message =
      typeof detail === 'string'
        ? detail
        : detail?.detail || data?.message || `Error HTTP ${response.status}`;
    const error = new Error(message);
    error.code = typeof detail === 'object' ? detail?.code : data?.code;
    error.status = response.status;
    throw error;
  }
  return data;
}
