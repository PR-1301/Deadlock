import { useState, useEffect, useCallback, useRef } from 'react';
import { io } from 'socket.io-client';
import { getSecuritySettings } from '../api/securityAdmin';
import './useSecurity.css';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "";

let lastPolicyToastTime = 0;
let lastAlertKey = "";
let lastAlertTime = 0;

const removeLegacyInlineStyles = () => {
    const legacyToast = document.getElementById('security-toast-styles');
    if (legacyToast) legacyToast.remove();
    const legacyGate = document.getElementById('security-fs-gate-styles');
    if (legacyGate) legacyGate.remove();
};

const useSecurity = (teamName) => {
    const [security, setSecurity] = useState({
        disableCopyPaste: false,
        forceFullscreen: false
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
            reconnectionDelayMax: 5000,
            timeout: 20000,
            transports: ['polling', 'websocket']
        });


        socketRef.current.on('connect', () => {
            socketRef.current.emit('join-team', teamName);
        });

        socketRef.current.on('security-settings-updated', (newSettings) => {
            setSecurity(newSettings);
            removeLegacyInlineStyles();

            const now = Date.now();
            if (now - lastPolicyToastTime < 500) return;
            lastPolicyToastTime = now;

            const toast = document.createElement('div');
            toast.className = 'loc-policy-toast';
            toast.innerHTML = `
                <span class="loc-toast-corner tl"></span>
                <span class="loc-toast-corner tr"></span>
                <span class="loc-toast-corner bl"></span>
                <span class="loc-toast-corner br"></span>
                <span class="loc-policy-chip"><span>SYNC</span></span>
                <span class="loc-policy-text">SECURITY POLICY UPDATED</span>
            `;
            document.body.appendChild(toast);
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.style.animation = 'securityToastOut 0.28s cubic-bezier(0.16, 1, 0.3, 1) forwards';
                    setTimeout(() => toast.remove(), 280);
                }
            }, 2200);
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

    // Retro-circuit security alert banner matching the LARPER OR CODER theme
    const showSecurityAlert = useCallback((message) => {
        removeLegacyInlineStyles();

        const now = Date.now();
        if (lastAlertKey === message && now - lastAlertTime < 500) return;
        lastAlertKey = message;
        lastAlertTime = now;

        const existingAlerts = document.querySelectorAll('[id^="security-alert-"]');
        existingAlerts.forEach((el) => el.remove());

        const id = 'security-alert-' + Math.random().toString(36).substr(2, 9);
        const container = document.createElement('div');
        container.id = id;

        const isTabViolation = message.toLowerCase().includes('tab');
        const descText = isTabViolation
            ? 'Window blur or tab switch logged to central referee console.'
            : 'Unauthorized action blocked and logged to central referee console.';

        container.innerHTML = `
            <div class="security-toast-card">
                <span class="loc-toast-corner tl"></span>
                <span class="loc-toast-corner tr"></span>
                <span class="loc-toast-corner bl"></span>
                <span class="loc-toast-corner br"></span>
                <div class="security-toast-header">
                    <div class="security-toast-tag">
                        <span class="security-toast-dot"></span>
                        <span>INTEGRITY ALERT</span>
                    </div>
                    <span class="security-toast-status">REPORTED // CORE</span>
                </div>
                <div class="security-toast-body">
                    <div class="security-toast-icon">
                        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#f27042" stroke-width="2.2" stroke-linecap="square" stroke-linejoin="miter">
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
            top: 22px;
            right: 22px;
            z-index: 2147483647;
            pointer-events: none;
            animation: securityToastIn 0.28s cubic-bezier(0.22, 1.18, 0.36, 1) forwards;
            font-family: 'JetBrains Mono', ui-monospace, Menlo, Consolas, monospace;
        `;

        document.body.appendChild(container);

        // Auto-remove after 6 seconds with smooth exit animation
        setTimeout(() => {
            if (container.parentNode) {
                container.style.animation = 'securityToastOut 0.32s cubic-bezier(0.16, 1, 0.3, 1) forwards';
                setTimeout(() => container.remove(), 320);
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

    // Enforce Admin "Turn Full Screen" policy across active player views
    useEffect(() => {
        const GATE_ID = 'security-fullscreen-gate';
        const getFullscreenElement = () =>
            document.fullscreenElement || document.webkitFullscreenElement || null;

        const enterFullscreen = () => {
            const el = document.documentElement;
            const req = el.requestFullscreen || el.webkitRequestFullscreen || el.msRequestFullscreen;
            if (!req) return Promise.resolve(false);
            try {
                return Promise.resolve(req.call(el)).then(() => true).catch(() => false);
            } catch {
                return Promise.resolve(false);
            }
        };

        const exitFullscreen = () => {
            if (!getFullscreenElement()) return;
            const exit = document.exitFullscreen || document.webkitExitFullscreen || document.msExitFullscreen;
            if (!exit) return;
            try {
                Promise.resolve(exit.call(document)).catch(() => {});
            } catch {
                // Ignore exit errors
            }
        };

        const removeGate = () => {
            const existing = document.getElementById(GATE_ID);
            if (existing) existing.remove();
        };

        const showGate = () => {
            if (document.getElementById(GATE_ID)) return;
            removeLegacyInlineStyles();

            const gate = document.createElement('div');
            gate.id = GATE_ID;

            gate.innerHTML = `
                <div class="loc-fs-card">
                    <span class="loc-fs-corner tl" aria-hidden="true"></span>
                    <span class="loc-fs-corner tr" aria-hidden="true"></span>
                    <span class="loc-fs-corner bl" aria-hidden="true"></span>
                    <span class="loc-fs-corner br" aria-hidden="true"></span>

                    <div class="loc-fs-divider" aria-hidden="true">
                        <span class="loc-fs-bracket">
                            <span class="loc-fs-hook left"></span>
                            <span class="loc-fs-dash"></span>
                            <span class="loc-fs-dash"></span>
                        </span>
                        <span class="loc-fs-parallelogram">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="square">
                                <polyline points="15 3 21 3 21 9"/>
                                <polyline points="9 21 3 21 3 15"/>
                                <line x1="21" y1="3" x2="14" y2="10"/>
                                <line x1="3" y1="21" x2="10" y2="14"/>
                            </svg>
                            <span>LOCK</span>
                        </span>
                        <span class="loc-fs-bracket">
                            <span class="loc-fs-dash"></span>
                            <span class="loc-fs-dash"></span>
                            <span class="loc-fs-hook right"></span>
                        </span>
                    </div>

                    <div class="loc-fs-title-top">FULLSCREEN</div>
                    <div class="loc-fs-title-sub">
                        <span>REQUIRED</span>
                        <span class="loc-fs-underscore" aria-hidden="true"></span>
                    </div>

                    <p class="loc-fs-desc">
                        The administrator enabled fullscreen lock for active players. Click anywhere or press any key to enter fullscreen.
                    </p>

                    <button type="button" id="${GATE_ID}-btn" class="loc-fs-btn">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="square" aria-hidden="true">
                            <polyline points="15 3 21 3 21 9"/>
                            <polyline points="9 21 3 21 3 15"/>
                            <line x1="21" y1="3" x2="14" y2="10"/>
                            <line x1="3" y1="21" x2="10" y2="14"/>
                        </svg>
                        <span>Enter Fullscreen</span>
                    </button>
                </div>
            `;

            gate.addEventListener('click', () => {
                enterFullscreen().then((ok) => {
                    if (ok) removeGate();
                });
            });

            document.body.appendChild(gate);
        };

        if (!security.forceFullscreen) {
            removeGate();
            exitFullscreen();
            return undefined;
        }

        let cancelled = false;
        let wasFullscreen = Boolean(getFullscreenElement());

        enterFullscreen().then((ok) => {
            if (cancelled) return;
            if (ok || getFullscreenElement()) {
                wasFullscreen = true;
                removeGate();
            } else {
                showGate();
            }
        });

        const handleUserGesture = () => {
            if (!security.forceFullscreen || getFullscreenElement()) return;
            enterFullscreen().then((ok) => {
                if (!cancelled && (ok || getFullscreenElement())) {
                    wasFullscreen = true;
                    removeGate();
                }
            });
        };

        const handleFullscreenChange = () => {
            if (cancelled) return;
            const isFs = Boolean(getFullscreenElement());
            if (isFs) {
                wasFullscreen = true;
                removeGate();
            } else if (security.forceFullscreen) {
                if (wasFullscreen) {
                    reportAction('ALERT', 'Exited fullscreen mode');
                    showSecurityAlert('Fullscreen mode required');
                }
                wasFullscreen = false;
                showGate();
            }
        };

        document.addEventListener('pointerdown', handleUserGesture, true);
        document.addEventListener('keydown', handleUserGesture, true);
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        document.addEventListener('webkitfullscreenchange', handleFullscreenChange);

        return () => {
            cancelled = true;
            document.removeEventListener('pointerdown', handleUserGesture, true);
            document.removeEventListener('keydown', handleUserGesture, true);
            document.removeEventListener('fullscreenchange', handleFullscreenChange);
            document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
            removeGate();
        };
    }, [security.forceFullscreen, reportAction, showSecurityAlert]);

    return { security, reportAction };
};

export default useSecurity;
