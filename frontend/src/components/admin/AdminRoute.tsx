import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../lib/auth';
import { ADMIN_RIGHTS } from '../../lib/adminRights';

interface AdminRouteProps {
  children: ReactNode;
  /** Any-of list of rights that grants access. Defaults to every admin right. */
  rights?: readonly string[];
}

export function AdminRoute({ children, rights = ADMIN_RIGHTS }: AdminRouteProps) {
  const { isAuthenticated, hasRight } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!rights.some((right) => hasRight(right))) return <Navigate to="/" replace />;
  return <>{children}</>;
}
