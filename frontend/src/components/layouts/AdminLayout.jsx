import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import './AdminLayout.css';
import { clearAdminSession } from '../../api/adminAuth';

const AdminLayout = () => {
    const navigate = useNavigate();

    const handleLogout = () => {
        if (window.confirm('Terminate Admin Session?')) {
            clearAdminSession();
            navigate('/admin/login');
        }
    };

    return (
        <div className="admin-layout-root">
            <div className="layout-scanlines"></div>

            <aside className="admin-sidebar">
                <div className="sidebar-header">
                    <h2 className="sidebar-brand">DEADLOCK <span>ADMIN CONSOLE</span></h2>
                </div>

                <nav className="sidebar-nav">
                    <NavLink to="/admin/dashboard" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                        Dashboard
                    </NavLink>
                    <NavLink to="/admin/deadlock-tracker" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                        Live Tracker
                    </NavLink>
                    <NavLink to="/admin/security" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                        Security Check
                    </NavLink>
                    <NavLink to="/admin/deadlock/shuffle" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                        Shuffle Question
                    </NavLink>
                    <NavLink to="/admin/deadlock/promote" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                        Promote Team
                    </NavLink>
                    <NavLink to="/admin/crack-code" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                        Crack-The-Code
                    </NavLink>
                </nav>

                <div className="sidebar-footer">
                    <button onClick={handleLogout} className="logout-btn">
                        LOGOUT
                    </button>
                </div>
            </aside>

            <main className="admin-main-content">
                <div className="content-wrapper">
                    <Outlet />
                </div>
            </main>
        </div>
    );
};

export default AdminLayout;
