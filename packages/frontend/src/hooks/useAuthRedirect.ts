import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

/**
 * Custom hook to handle authentication-based redirects
 */
export const useAuthRedirect = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Don't redirect while still loading
    if (isLoading) return;

    // If on login page and authenticated, redirect to intended destination
    if (isAuthenticated && location.pathname === '/login') {
      const from = location.state?.from?.pathname || '/map';
      navigate(from, { replace: true });
    }

    // If not authenticated and not on login page, redirect to login
    if (!isAuthenticated && location.pathname !== '/login') {
      navigate('/login', { 
        state: { from: location },
        replace: true 
      });
    }
  }, [isAuthenticated, isLoading, location, navigate]);

  return { isAuthenticated, isLoading };
};

export default useAuthRedirect;