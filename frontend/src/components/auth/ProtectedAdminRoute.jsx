import React, { useEffect, useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import {
    getAdminTokenExpiry,
    handleAdminUnauthorized,
    isAdminAuthenticated,
    verifyAdminSession,
} from '../../api/adminAuth';

const ProtectedAdminRoute = () => {
    const location = useLocation();
    const [sessionValid, setSessionValid] = useState(() => isAdminAuthenticated());

    useEffect(() => {
        if (!isAdminAuthenticated()) return undefined;

        let cancelled = false;

        const checkBackend = async () => {
            const ok = await verifyAdminSession();
            if (!cancelled && !ok) {
                setSessionValid(false);
                handleAdminUnauthorized('expired');
            }
        };

        checkBackend();

        const expiresAt = getAdminTokenExpiry();
        const remainingMs = expiresAt ? Math.max(0, expiresAt - Date.now()) : 0;
        const expiryTimer = setTimeout(() => {
            if (!cancelled) {
                setSessionValid(false);
                handleAdminUnauthorized('expired');
            }
        }, remainingMs);

        // Fallback heartbeat in case system sleep skews setTimeout
        const heartbeat = setInterval(() => {
            if (!isAdminAuthenticated()) {
                setSessionValid(false);
                handleAdminUnauthorized('expired');
            }
        }, 15000);

        return () => {
            cancelled = true;
            clearTimeout(expiryTimer);
            clearInterval(heartbeat);
        };
    }, [location.pathname]);

    if (!sessionValid || !isAdminAuthenticated()) {
        return <Navigate to="/admin/login" replace />;
    }

    return <Outlet />;
};

export default ProtectedAdminRoute;
