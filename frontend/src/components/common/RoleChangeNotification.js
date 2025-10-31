import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

const RoleChangeNotification = () => {
    const { user } = useAuth();
    const [previousRole, setPreviousRole] = useState(null);

    useEffect(() => {
        if (!user) return;

        // Check if role has changed
        if (previousRole && previousRole !== user.role) {
            const isNowAdmin = user.role === 'admin' || user.role === 'system_admin';
            const wasAdmin = previousRole === 'admin' || previousRole === 'system_admin';

            if (isNowAdmin && !wasAdmin) {
                // User became admin
                toast.success(
                    `🎉 You've been promoted to ${user.role}! You now have access to admin features.`,
                    {
                        duration: 6000,
                        style: {
                            background: '#10B981',
                            color: 'white',
                        },
                    }
                );
            } else if (!isNowAdmin && wasAdmin) {
                // User lost admin privileges
                toast(
                    `Your role has been changed to ${user.role}. Admin features are no longer available.`,
                    {
                        duration: 6000,
                        style: {
                            background: '#F59E0B',
                            color: 'white',
                        },
                    }
                );
            } else {
                // Role changed but still admin or still regular user
                toast(`Your role has been updated to ${user.role}.`, {
                    duration: 4000,
                });
            }
        }

        setPreviousRole(user.role);
    }, [user, previousRole]);

    return null; // This component doesn't render anything
};

export default RoleChangeNotification;