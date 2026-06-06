import {
  API_BASE,
  RETRY_AFTER_REFRESH,
  buildAuthHeaders,
  clearSessionAndRedirect,
  decodeTokenPayload,
  ensureFreshToken,
  getToken,
  isTokenUsable,
  setToken,
  tryRefreshToken,
  type ApiRequestInit,
} from './auth-session';

export {
  clearSessionAndRedirect,
  consumeAuthRedirectMessage,
  decodeTokenPayload,
  ensureFreshToken,
  getToken,
  isTokenUsable,
  setToken,
  tryRefreshToken,
} from './auth-session';

export type { ApiRequestInit };

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function api<T>(path: string, init?: ApiRequestInit): Promise<T> {
  await ensureFreshToken();

  const doFetch = () =>
    fetch(`${API_BASE}${path}`, {
      ...init,
      headers: { ...buildAuthHeaders(), ...init?.headers },
    });

  let res = await doFetch();

  if (
    res.status === 401 &&
    !path.startsWith('/auth/') &&
    !init?.[RETRY_AFTER_REFRESH]
  ) {
    const hadToken = Boolean(getToken());
    if (hadToken && (await tryRefreshToken())) {
      return api(path, { ...init, [RETRY_AFTER_REFRESH]: true });
    }
    if (hadToken) {
      clearSessionAndRedirect('登录已过期，请重新登录');
      throw new ApiError('登录已过期，请重新登录', 401);
    }
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const message =
      (err as { message?: string }).message ??
      (res.status === 401 ? '未登录或登录已过期，请重新登录' : res.statusText);

    if (res.status === 401 && !path.startsWith('/auth/')) {
      const hadToken = Boolean(getToken());
      setToken(null);
      if (hadToken) {
        clearSessionAndRedirect('登录已过期，请重新登录');
      }
    }

    throw new ApiError(message, res.status);
  }

  return res.json() as Promise<T>;
}
