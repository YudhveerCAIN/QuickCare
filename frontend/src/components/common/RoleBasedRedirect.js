import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const RoleBasedRedirect = ({ children }) => {
    const { user, isAuthenticated } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        if (!isAuthenticated || !user) return;

        const isAdmin = user.role === 'admin' || user.role === 'system_admin';
        const currentPath = location.pathname;

        // If user just became admin and is on a regular page, don't redirect immediately
        // Let them navigate naturally, but ensure admin routes show admin pages

        // Only redirect if they're on old admin routes to new enhanced routes
        if (isAdmin) {
            if (currentPath === '/admin' && location.pathname === '/admin') {
                // If they're on /admin, redirect to enhanced dashboard
                navigate('/dashboard', { replace: true });
            } else if (currentPath === '/admin/users') {
                navigate('/users', { replace: true });
            } else if (currentPath === '/admin/analytics') {
                navigate('/analytics', { replace: true });
            }
        }
    }, [user, isAuthenticated, navigate, location]);

    return children;
};

export default RoleBasedRedirect;