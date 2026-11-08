// Admin session helpers.
// The passcode is checked by the backend; the browser only keeps the signed token it returns.

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "";
const TOKEN_KEY = 'deadlockAdminToken';
const EXPIRES_KEY = 'deadlockAdminTokenExpiresAt';

const safeGet = (key) => {
    try { return localStorage.getItem(key); } catch { return null; }
};

export const getAdminToken = () => {
    const token = safeGet(TOKEN_KEY);
    const expiresAt = Number(safeGet(EXPIRES_KEY));
    if (!token || !expiresAt || Date.now() >= expiresAt) return null;
    return token;
};

export const isAdminAuthenticated = () => !!getAdminToken();

export const clearAdminSession = () => {
    try {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(EXPIRES_KEY);
        localStorage.removeItem('deadlockAdminAuth'); // legacy flag from the old client-side login
    } catch { /* storage unavailable */ }
};

// Called when the backend rejects the token (expired, passcode rotated, ...)
export const handleAdminUnauthorized = () => {
    clearAdminSession();
    if (!window.location.pathname.startsWith('/admin/login')) {
        window.location.assign('/admin/login');
    }
};

export const adminLogin = async (passcode) => {
    const response = await fetch(`${BASE_URL}/api/admin/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passcode }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
        throw new Error(data.message || 'ACCESS DENIED: INVALID CREDENTIALS');
    }
    localStorage.setItem(TOKEN_KEY, data.token);
    localStorage.setItem(EXPIRES_KEY, String(data.expiresAt));
    return data;
};

export const adminAuthHeaders = () => {
    const token = getAdminToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
};

// fetch() wrapper for admin endpoints: attaches the token, logs out on 401
export const adminFetch = async (url, options = {}) => {
    const response = await fetch(url, {
        ...options,
        headers: { ...(options.headers || {}), ...adminAuthHeaders() },
    });
    if (response.status === 401) handleAdminUnauthorized();
    return response;
};

// Attach the token to an axios instance used by admin pages
export const attachAdminAuth = (axiosInstance) => {
    axiosInstance.interceptors.request.use((config) => {
        const token = getAdminToken();
        if (token) config.headers.Authorization = `Bearer ${token}`;
        return config;
    });
    axiosInstance.interceptors.response.use(
        (response) => response,
        (error) => {
            if (error.response?.status === 401) handleAdminUnauthorized();
            return Promise.reject(error);
        }
    );
    return axiosInstance;
};
