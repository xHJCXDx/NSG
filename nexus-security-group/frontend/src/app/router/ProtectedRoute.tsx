import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../features/auth';

interface ProtectedRouteProps {
  children: ReactNode;
  requiredPermission?: `${string}:${string}`;
}

export function ProtectedRoute({ children, requiredPermission }: ProtectedRouteProps) {
  const { hasPermission, isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (requiredPermission) {
    const [resource, action] = requiredPermission.split(':');

    if (!hasPermission(resource, action)) {
      return (
        <div className="glass-card p-6 text-gray-300" role="alert">
          <h1 className="text-xl font-bold text-white">Access restricted</h1>
          <p className="mt-2 text-sm text-gray-400">
            Your current session does not include the {requiredPermission} permission. Frontend checks are UX-only; the backend remains authoritative.
          </p>
        </div>
      );
    }
  }

  return <>{children}</>;
}
