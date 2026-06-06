const API_BASE = '/api/v1';

/** 距过期不足该时长则主动 refresh */
const REFRESH_BEFORE_MS = 15 * 60 * 1000;

const RETRY_AFTER_REFRESH = '__epoch_retry_after_refresh';

let refreshInFlight: Promise<boolean> | null = null;

export function getLocaleHeader(): string {
  return localStorage.getItem('epoch.locale') ?? 'zh-CN';
}

export function getToken(): string | null {
  return localStorage.getItem('epoch.token');
}

export function setToken(token: string | null) {
  if (token) localStorage.setItem('epoch.token', token);
  else localStorage.removeItem('epoch.token');
}

export function decodeTokenPayload(
  token: string,
): { exp?: number; role?: string; sub?: string } | null {
  try {
    const part = token.split('.')[1];
    if (!part) return null;
    return JSON.parse(atob(part)) as { exp?: number; role?: string; sub?: string };
  } catch {
    return null;
  }
}

export function isTokenUsable(token: string | null | undefined): token is string {
  if (!token) return false;
  const payload = decodeTokenPayload(token);
  if (!payload) return false;
  if (payload.exp != null && payload.exp * 1000 <= Date.now()) return false;
  return true;
}

function tokenNeedsProactiveRefresh(token: string): boolean {
  const payload = decodeTokenPayload(token);
  if (!payload?.exp) return false;
  return payload.exp * 1000 - Date.now() < REFRESH_BEFORE_MS;
}

/** 清除登录态并跳转登录页（保留 redirect） */
export function clearSessionAndRedirect(message?: string) {
  setToken(null);
  if (typeof window === 'undefined') return;

  if (message) {
    sessionStorage.setItem('epoch.authMessage', message);
  }

  const { pathname, search } = window.location;
  if (pathname === '/login' || pathname === '/register') return;

  const redirect = encodeURIComponent(`${pathname}${search}`);
  window.location.replace(`/login?redirect=${redirect}`);
}

/** 消费登录页一次性提示（401 跳转后展示） */
export function consumeAuthRedirectMessage(): string | null {
  const msg = sessionStorage.getItem('epoch.authMessage');
  if (msg) sessionStorage.removeItem('epoch.authMessage');
  return msg;
}

/** 用当前 accessToken 换取新 token（允许多请求并发时只刷新一次） */
export async function tryRefreshToken(): Promise<boolean> {
  const token = getToken();
  if (!token) return false;

  if (!refreshInFlight) {
    refreshInFlight = (async () => {
      try {
        const res = await fetch(`${API_BASE}/auth/refresh`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            'X-Locale': getLocaleHeader(),
          },
        });
        if (!res.ok) return false;
        const data = (await res.json()) as { accessToken?: string };
        if (!data.accessToken) return false;
        setToken(data.accessToken);
        return true;
      } catch {
        return false;
      } finally {
        refreshInFlight = null;
      }
    })();
  }

  return refreshInFlight;
}

export async function ensureFreshToken(): Promise<void> {
  const token = getToken();
  if (!token || !tokenNeedsProactiveRefresh(token)) return;
  await tryRefreshToken();
}

export function buildAuthHeaders(extra?: HeadersInit): HeadersInit {
  const token = getToken();
  return {
    'Content-Type': 'application/json',
    'X-Locale': getLocaleHeader(),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...extra,
  };
}

export type ApiRequestInit = RequestInit & {
  [RETRY_AFTER_REFRESH]?: boolean;
};

export { RETRY_AFTER_REFRESH, API_BASE };
