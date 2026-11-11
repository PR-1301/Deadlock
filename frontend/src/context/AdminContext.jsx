import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { getAdminToken, handleAdminUnauthorized } from '../api/adminAuth';

const AdminContext = createContext();

export const useAdmin = () => {
    const context = useContext(AdminContext);
    if (!context) {
        throw new Error('useAdmin must be used within an AdminProvider');
    }
    return context;
};

export const AdminProvider = ({ children }) => {
    const [logs, setLogs] = useState([]);
    const [connected, setConnected] = useState(false);
    const socketRef = useRef();

    useEffect(() => {
        const socketHost = import.meta.env.VITE_API_BASE_URL || `http://${window.location.hostname}:5000`;

        socketRef.current = io(socketHost, {
            transports: ['polling', 'websocket']
        });

        socketRef.current.on('connect', () => {
            setConnected(true);
            socketRef.current.emit('join-admin', getAdminToken());
        });

        socketRef.current.on('new-log', (log) => {
            setLogs(prev => [log, ...prev].slice(0, 100)); // Keep last 100 logs
        });

        socketRef.current.on('admin-auth-error', () => {
            setConnected(false);
            handleAdminUnauthorized('expired');
        });

        socketRef.current.on('connect_error', (err) => {
            console.error(">>> [ADMIN_CONTEXT] Socket error:", err);
            setConnected(false);
        });

        socketRef.current.on('disconnect', () => {
            setConnected(false);
        });

        return () => {
            if (socketRef.current) {
                socketRef.current.disconnect();
            }
        };
    }, []);

    const value = {
        logs,
        connected,
        socket: socketRef.current
    };

    return (
        <AdminContext.Provider value={value}>
            {children}
        </AdminContext.Provider>
    );
};
