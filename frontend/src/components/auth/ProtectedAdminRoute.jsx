import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { isAdminAuthenticated } from '../../api/adminAuth';

const ProtectedAdminRoute = () => {
    // Token presence/expiry only; the backend still verifies the token on every admin request
    const isAuthenticated = isAdminAuthenticated();

    if (!isAuthenticated) {
        return <Navigate to="/admin/login" replace />;
    }

    return <Outlet />;
};

export default ProtectedAdminRoute;
