import axios from 'axios';
import { attachAdminAuth } from './adminAuth';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "";
const API_URL = `${BASE_URL}/api/admin/deadlock`;

const api = attachAdminAuth(axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
}));

export const getSecuritySettings = async () => {
    try {
        const response = await api.get('/security-settings');
        return response.data;
    } catch (error) {
        console.error("Error fetching security settings:", error);
        throw error;
    }
};

export const updateSecuritySettings = async (settings) => {
    try {
        const response = await api.post('/security-settings', settings);
        return response.data;
    } catch (error) {
        console.error("Error updating security settings:", error);
        throw error;
    }
};

export const getSecurityLogs = async (params = {}) => {
    try {
        const response = await api.get('/security-logs', { params });
        return response.data;
    } catch (error) {
        console.error("Error fetching security logs:", error);
        throw error;
    }
};

export const clearSecurityLogs = async () => {
    try {
        const response = await api.delete('/security-logs');
        return response.data;
    } catch (error) {
        console.error("Error clearing security logs:", error);
        throw error;
    }
};

export const postSecurityLog = async (payload) => {
    const response = await fetch(`${API_URL}/security-logs`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        keepalive: true,
    });
    if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
    }
    return response.json();
};

export default api;
