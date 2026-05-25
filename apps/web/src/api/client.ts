const API_BASE = '/api/v1';

function headers(): HeadersInit {
  const token = localStorage.getItem('epoch.token');
  const locale = localStorage.getItem('epoch.locale') ?? 'zh-CN';
  return {
    'Content-Type': 'application/json',
    'X-Locale': locale,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export async function api<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { ...headers(), ...init?.headers },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message ?? res.statusText);
  }
  return res.json() as Promise<T>;
}

export function setToken(token: string | null) {
  if (token) localStorage.setItem('epoch.token', token);
  else localStorage.removeItem('epoch.token');
}

export function getToken() {
  return localStorage.getItem('epoch.token');
}
