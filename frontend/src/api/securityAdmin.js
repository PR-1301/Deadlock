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

export default api;
