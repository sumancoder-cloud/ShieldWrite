import { useEffect } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '../context/AuthContext';
import { PageLoader } from './common/Loader';

export function AuthGuard({ children }) {
  const { isAuthenticated, loading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      setLocation('/login');
    }
  }, [isAuthenticated, loading, setLocation]);

  if (loading) return <PageLoader />;
  if (!isAuthenticated) return null;
  return children;
}

export function GuestGuard({ children }) {
  const { isAuthenticated, loading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!loading && isAuthenticated) {
      setLocation('/dashboard');
    }
  }, [isAuthenticated, loading, setLocation]);

  if (loading) return <PageLoader />;
  if (isAuthenticated) return null;
  return children;
}
