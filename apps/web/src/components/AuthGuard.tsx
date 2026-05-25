import { Navigate } from 'react-router-dom';
import { getToken } from '../api/client';

export function AuthGuard({
  children,
  adminOnly,
}: {
  children: React.ReactNode;
  adminOnly?: boolean;
}) {
  const token = getToken();
  if (!token) return <Navigate to="/login" replace />;
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
