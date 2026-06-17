import { useMemo } from 'react';
import { getToken, decodeTokenPayload } from '../api/auth-session';

export function useAuth() {
  const token = getToken();
  const payload = useMemo(() => (token ? decodeTokenPayload(token) : null), [token]);

  return {
    user: payload
      ? {
          id: payload.sub ?? '',
          role: payload.role ?? 'USER',
        }
      : null,
    isAuthenticated: Boolean(payload),
  };
}
