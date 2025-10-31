import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';

const SmartRoute = ({ adminComponent: AdminComponent, userComponent: UserComponent, ...props }) => {
    const { user, isAuthenticated } = useAuth();
    const [isAdmin, setIsAdmin] = useState(false);
    
    useEffect(() => {
        // Update admin status when user changes
        const adminStatus = user?.role === 'admin' || user?.role === 'system_admin';
        setIsAdmin(adminStatus);
        
        console.log('SmartRoute: User role changed', {
            userId: user?._id,
            role: user?.role,
            isAdmin: adminStatus
        });
    }, [user, isAuthenticated]);
    
    // Render admin component if user is admin, otherwise render user component
    if (isAdmin && AdminComponent) {
        return <AdminComponent {...props} />;
    }
    
    return <UserComponent {...props} />;
};

export default SmartRoute;