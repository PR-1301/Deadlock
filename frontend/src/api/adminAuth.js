// Admin session helpers.
// The passcode is checked by the backend; the browser only keeps the signed token in sessionStorage.

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "";
const TOKEN_KEY = 'deadlockAdminToken';
const EXPIRES_KEY = 'deadlockAdminTokenExpiresAt';

const safeGet = (key) => {
    try { return sessionStorage.getItem(key); } catch { return null; }
};

const parseTokenExp = (token) => {
    if (typeof token !== 'string') return 0;
    const [payload] = token.split('.');
    if (!payload) return 0;
    try {
        const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
        const json = atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, '='));
        const data = JSON.parse(json);
        return typeof data?.exp === 'number' ? data.exp : 0;
    } catch {
        return 0;
    }
};

export const clearAdminSession = () => {
    try {
        sessionStorage.removeItem(TOKEN_KEY);
        sessionStorage.removeItem(EXPIRES_KEY);
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(EXPIRES_KEY);
        localStorage.removeItem('deadlockAdminAuth'); // legacy flag from the old client-side login
    } catch { /* storage unavailable */ }
};

export const getAdminTokenExpiry = () => {
    const token = safeGet(TOKEN_KEY);
    if (!token) return 0;
    const tokenExp = parseTokenExp(token);
    const storedExp = Number(safeGet(EXPIRES_KEY));
    if (!tokenExp || !storedExp) return 0;
    return Math.min(tokenExp, storedExp);
};

export const getAdminToken = () => {
    const token = safeGet(TOKEN_KEY);
    const expiresAt = getAdminTokenExpiry();
    if (!token || !expiresAt || Date.now() >= expiresAt) {
        if (token) clearAdminSession();
        return null;
    }
    return token;
};

export const isAdminAuthenticated = () => !!getAdminToken();

// Called when the backend rejects the token (expired, revoked, passcode rotated, ...)
export const handleAdminUnauthorized = (reason = 'expired') => {
    clearAdminSession();
    if (!window.location.pathname.startsWith('/admin/login')) {
        const suffix = reason === 'expired' ? '?expired=1' : '';
        window.location.assign(`/admin/login${suffix}`);
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
    clearAdminSession();
    sessionStorage.setItem(TOKEN_KEY, data.token);
    sessionStorage.setItem(EXPIRES_KEY, String(data.expiresAt));
    return data;
};

export const verifyAdminSession = async () => {
    const token = getAdminToken();
    if (!token) return false;
    try {
        const response = await fetch(`${BASE_URL}/api/admin/auth/verify`, {
            method: 'GET',
            headers: { Authorization: `Bearer ${token}` },
        });
        if (response.status === 401 || response.status === 403) {
            clearAdminSession();
            return false;
        }
        return response.ok;
    } catch {
        // On transient network failure, rely on local signed token expiry
        return !!getAdminToken();
    }
};

export const adminLogout = async () => {
    const token = getAdminToken();
    clearAdminSession();
    if (!token) return;
    try {
        await fetch(`${BASE_URL}/api/admin/auth/logout`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
        });
    } catch {
        // Session already cleared locally
    }
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
