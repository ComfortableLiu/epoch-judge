import { Navigate, useLocation } from 'react-router-dom';
import { getToken, isTokenUsable } from '../api/client';

export function AuthGuard({
  children,
  adminOnly,
}: {
  children: React.ReactNode;
  adminOnly?: boolean;
}) {
  const location = useLocation();
  const token = getToken();

  if (!isTokenUsable(token)) {
    const redirect = encodeURIComponent(
      `${location.pathname}${location.search}`,
    );
    return <Navigate to={`/login?redirect=${redirect}`} replace />;
  }

  if (adminOnly) {
    try {
      const payload = JSON.parse(atob(token.split('.')[1] ?? ''));
      if (payload.role !== 'ADMIN') return <Navigate to="/" replace />;
    } catch {
      return <Navigate to="/" replace />;
    }
  }
  return <>{children}</>;
}
