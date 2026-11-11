import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import { getAdminToken, handleAdminUnauthorized } from '../api/adminAuth';
import { getSecurityLogs, clearSecurityLogs as clearSecurityLogsApi } from '../api/securityAdmin';

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
    const [logsLoading, setLogsLoading] = useState(true);
    const [connected, setConnected] = useState(false);
    const socketRef = useRef();

    const refreshLogs = useCallback(async () => {
        setLogsLoading(true);
        try {
            const res = await getSecurityLogs({ limit: 300 });
            if (res.success && Array.isArray(res.logs)) {
                setLogs(res.logs);
            }
        } catch (err) {
            console.error(">>> [ADMIN_CONTEXT] Failed to load persisted logs:", err);
        } finally {
            setLogsLoading(false);
        }
    }, []);

    const clearLogs = useCallback(async () => {
        await clearSecurityLogsApi();
        setLogs([]);
    }, []);

    useEffect(() => {
        let active = true;
        getSecurityLogs({ limit: 300 })
            .then((res) => {
                if (active && res.success && Array.isArray(res.logs)) {
                    setLogs(res.logs);
                }
            })
            .catch((err) => {
                console.error(">>> [ADMIN_CONTEXT] Failed to load persisted logs:", err);
            })
            .finally(() => {
                if (active) setLogsLoading(false);
            });

        const socketHost = import.meta.env.VITE_API_BASE_URL || `http://${window.location.hostname}:5000`;

        socketRef.current = io(socketHost, {
            transports: ['polling', 'websocket']
        });

        socketRef.current.on('connect', () => {
            setConnected(true);
            socketRef.current.emit('join-admin', getAdminToken());
        });

        socketRef.current.on('new-log', (log) => {
            setLogs((prev) => {
                if (log?._id && prev.some((item) => item._id === log._id)) {
                    return prev;
                }
                return [log, ...prev].slice(0, 300);
            });
        });

        socketRef.current.on('security-logs-cleared', () => {
            setLogs([]);
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
            active = false;
            if (socketRef.current) {
                socketRef.current.disconnect();
            }
        };
    }, []);

    const value = {
        logs,
        logsLoading,
        refreshLogs,
        clearLogs,
        connected,
        socket: socketRef.current
    };

    return (
        <AdminContext.Provider value={value}>
            {children}
        </AdminContext.Provider>
    );
};
