import { useState, useEffect, useCallback, useRef } from 'react';
import { io } from 'socket.io-client';
import { getSecuritySettings } from '../api/securityAdmin';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "";

const useSecurity = (teamName) => {
    const [security, setSecurity] = useState({
        disableCopyPaste: false
    });
    const socketRef = useRef();

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const res = await getSecuritySettings();
                if (res.success) {
                    setSecurity(prev => {
                        if (JSON.stringify(prev) !== JSON.stringify(res.settings)) {
                            return res.settings;
                        }
                        return prev;
                    });
                }
            } catch (err) {
                console.error(">>> [SECURITY_HOOK] Fetch failed:", err);
            }
        };

        // Initial fetch
        fetchSettings();

        // Polling fallback (every 10 seconds)
        const pollInterval = setInterval(fetchSettings, 10000);

        // Socket setup
        const socketHost = BASE_URL;

        socketRef.current = io(socketHost, {
            reconnection: true,
            reconnectionAttempts: Infinity,
            reconnectionDelay: 1000,
            timeout: 20000,
            transports: ['websocket', 'polling']
        });


        socketRef.current.on('connect', () => {
            socketRef.current.emit('join-team', teamName);
        });

        socketRef.current.on('security-settings-updated', (newSettings) => {
            setSecurity(newSettings);
            // Visual feedback for admin testing
            const toast = document.createElement('div');
            toast.textContent = "SECURITY POLICY UPDATED";
            toast.style.cssText = "position:fixed;top:10px;right:10px;background:red;color:white;padding:10px;z-index:9999;font-family:monospace;border:2px solid gold;box-shadow:0 0 10px gold;";
            document.body.appendChild(toast);
            setTimeout(() => toast.remove(), 2000);
        });

        socketRef.current.on('connect_error', (error) => {
            console.error(">>> [SECURITY_HOOK] Connection error:", error);
        });

        return () => {
            clearInterval(pollInterval);
            if (socketRef.current) {
                socketRef.current.disconnect();
            }
        };
    }, [teamName]);




    const reportAction = useCallback((type, message) => {
        if (socketRef.current) {
            socketRef.current.emit(type === 'ALERT' ? 'report-illegal-action' : 'report-tab-switch', {
                teamName,
                message,
                timestamp: new Date()
            });
        }
    }, [teamName]);

    // Sleek security alert banner matching the dark modern UI of the platform
    const showSecurityAlert = useCallback((message) => {
        const id = 'security-alert-' + Math.random().toString(36).substr(2, 9);
        const container = document.createElement('div');
        container.id = id;

        const isTabViolation = message.toLowerCase().includes('tab');
        const descText = isTabViolation
            ? 'Window blur or tab switch logged to central referee console.'
            : 'Unauthorized action blocked and logged to central referee console.';

        container.innerHTML = `
            <div class="security-toast-card">
                <div class="security-toast-header">
                    <div class="security-toast-tag">
                        <span class="security-toast-dot"></span>
                        <span>INTEGRITY ALERT</span>
                    </div>
                    <span class="security-toast-status">REPORTED // CORE</span>
                </div>
                <div class="security-toast-body">
                    <div class="security-toast-icon">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FF4757" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                            <line x1="12" y1="8" x2="12" y2="12"/>
                            <line x1="12" y1="16" x2="12.01" y2="16"/>
                        </svg>
                    </div>
                    <div class="security-toast-content">
                        <div class="security-toast-title">${message.toUpperCase()}</div>
                        <div class="security-toast-desc">${descText}</div>
                    </div>
                </div>
                <div class="security-toast-progress">
                    <div class="security-toast-bar"></div>
                </div>
            </div>
        `;

        container.style.cssText = `
            position: fixed;
            top: 24px;
            right: 24px;
            z-index: 2147483647;
            pointer-events: none;
            animation: securityToastIn 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards;
            font-family: 'JetBrains Mono', 'Fira Code', 'Courier New', monospace;
        `;

        if (!document.getElementById('security-toast-styles')) {
            const style = document.createElement('style');
            style.id = 'security-toast-styles';
            style.innerHTML = `
                @keyframes securityToastIn {
                    from {
                        opacity: 0;
                        transform: translateY(-16px) scale(0.96);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0) scale(1);
                    }
                }
                @keyframes securityToastOut {
                    from {
                        opacity: 1;
                        transform: translateY(0) scale(1);
                    }
                    to {
                        opacity: 0;
                        transform: translateY(-12px) scale(0.96);
                    }
                }
                @keyframes securityPulseDot {
                    0%, 100% { opacity: 1; transform: scale(1); }
                    50% { opacity: 0.35; transform: scale(0.85); }
                }
                @keyframes securityBarDrain {
                    from { width: 100%; }
                    to { width: 0%; }
                }
                .security-toast-card {
                    background: #141418;
                    border: 1px solid rgba(255, 71, 87, 0.35);
                    border-radius: 8px;
                    padding: 14px 16px 12px 16px;
                    min-width: 340px;
                    max-width: 420px;
                    box-shadow: 0 16px 40px rgba(0, 0, 0, 0.65), 0 0 0 1px rgba(255, 71, 87, 0.12);
                    position: relative;
                    overflow: hidden;
                    backdrop-filter: blur(12px);
                    font-family: 'JetBrains Mono', 'Fira Code', 'Courier New', monospace;
                }
                .security-toast-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 10px;
                }
                .security-toast-tag {
                    display: inline-flex;
                    align-items: center;
                    gap: 6px;
                    padding: 2px 8px;
                    background: rgba(255, 71, 87, 0.12);
                    border: 1px solid rgba(255, 71, 87, 0.28);
                    border-radius: 4px;
                    font-size: 10px;
                    font-weight: 700;
                    letter-spacing: 0.8px;
                    color: #FF4757;
                }
                .security-toast-dot {
                    width: 6px;
                    height: 6px;
                    border-radius: 50%;
                    background: #FF4757;
                    animation: securityPulseDot 1.5s ease-in-out infinite;
                }
                .security-toast-status {
                    font-size: 10px;
                    font-weight: 600;
                    color: #8E8A82;
                    letter-spacing: 0.5px;
                }
                .security-toast-body {
                    display: flex;
                    align-items: flex-start;
                    gap: 12px;
                }
                .security-toast-icon {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    width: 32px;
                    height: 32px;
                    border-radius: 6px;
                    background: rgba(255, 71, 87, 0.1);
                    border: 1px solid rgba(255, 71, 87, 0.22);
                    flex-shrink: 0;
                    margin-top: 1px;
                }
                .security-toast-content {
                    flex: 1;
                    min-width: 0;
                }
                .security-toast-title {
                    font-size: 13px;
                    font-weight: 700;
                    color: #F6ECD6;
                    letter-spacing: 0.5px;
                    line-height: 1.3;
                    margin-bottom: 3px;
                }
                .security-toast-desc {
                    font-size: 11px;
                    color: #8E8A82;
                    line-height: 1.4;
                    font-family: 'Inter', system-ui, -apple-system, sans-serif;
                }
                .security-toast-progress {
                    position: absolute;
                    bottom: 0;
                    left: 0;
                    right: 0;
                    height: 2px;
                    background: rgba(255, 255, 255, 0.06);
                }
                .security-toast-bar {
                    height: 100%;
                    background: #FF4757;
                    width: 100%;
                    animation: securityBarDrain 6s linear forwards;
                }
            `;
            document.head.appendChild(style);
        }

        document.body.appendChild(container);

        // Auto-remove after 6 seconds with smooth exit animation
        setTimeout(() => {
            if (container.parentNode) {
                container.style.animation = 'securityToastOut 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards';
                setTimeout(() => container.remove(), 400);
            }
        }, 6000);
    }, []);

    useEffect(() => {
        // Tab Visibility Change Detection
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'hidden') {
                reportAction('TAB_SWITCH', 'Switched tabs or minimized window');
                showSecurityAlert('Tab switch detected');
            }
        };
        document.addEventListener('visibilitychange', handleVisibilityChange);

        // Global Clipboard Interception (Paste, Copy, Cut)
        const handleClipboard = (e) => {
            if (security.disableCopyPaste) {
                e.preventDefault();
                e.stopPropagation();
                reportAction('ALERT', `Blocked ${e.type} attempt`);
                showSecurityAlert(`Action Restricted: ${e.type}`);
            }
        };
        document.addEventListener('paste', handleClipboard, true);
        document.addEventListener('copy', handleClipboard, true);
        document.addEventListener('cut', handleClipboard, true);

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            document.removeEventListener('paste', handleClipboard, true);
            document.removeEventListener('copy', handleClipboard, true);
            document.removeEventListener('cut', handleClipboard, true);
        };

    }, [security, reportAction, showSecurityAlert]);






    return { security, reportAction };
};

export default useSecurity;
