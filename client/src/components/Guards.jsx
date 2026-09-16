import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function Loader() {
  return <div className="loader" aria-label="Loading" />;
}

export function RequireAuth() {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <Loader />;
  if (!user) return <Navigate to={`/login?next=${encodeURIComponent(location.pathname)}`} replace />;
  return <Outlet />;
}

export function RequireAdmin() {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <Loader />;
  if (!user) return <Navigate to={`/login?next=${encodeURIComponent(location.pathname)}`} replace />;
  if (user.role !== 'admin') return <Navigate to="/" replace />;
  return <Outlet />;
}
