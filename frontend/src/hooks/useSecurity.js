import { useState, useEffect, useCallback, useRef } from 'react';
import { io } from 'socket.io-client';
import { getSecuritySettings } from '../api/securityAdmin';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "";

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

            if (!document.getElementById('security-fs-gate-styles')) {
                const style = document.createElement('style');
                style.id = 'security-fs-gate-styles';
                style.textContent = `
                    @keyframes locGateIn {
                        0% { opacity: 0; transform: translateY(10px) scale(0.96); }
                        100% { opacity: 1; transform: translateY(0) scale(1); }
                    }
                    @keyframes locCursorBlink {
                        0%, 49% { opacity: 1; }
                        50%, 100% { opacity: 0.25; }
                    }
                    #${GATE_ID} {
                        position: fixed;
                        inset: 0;
                        z-index: 2147483646;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        padding: 24px;
                        background:
                            radial-gradient(50vw 50vh at 50% 48%, rgba(242, 112, 66, 0.14), transparent 72%),
                            repeating-linear-gradient(0deg, rgba(245, 165, 36, 0.025) 0 1px, transparent 1px 24px),
                            repeating-linear-gradient(90deg, rgba(245, 165, 36, 0.025) 0 1px, transparent 1px 24px),
                            rgba(8, 9, 12, 0.9);
                        backdrop-filter: blur(12px);
                        -webkit-backdrop-filter: blur(12px);
                        font-family: 'JetBrains Mono', ui-monospace, Menlo, Consolas, monospace;
                    }
                    .loc-fs-card {
                        position: relative;
                        max-width: 448px;
                        width: 100%;
                        padding: 28px 28px 26px;
                        background: linear-gradient(180deg, #12131b 0%, #090a0f 100%);
                        border: 2px solid #f27042;
                        border-radius: 4px;
                        box-shadow:
                            inset 0 0 0 3px #090a0f,
                            inset 0 0 0 4px rgba(245, 165, 36, 0.35),
                            6px 6px 0 #4a1c10,
                            0 28px 70px rgba(0, 0, 0, 0.85);
                        text-align: center;
                        color: #faf1dc;
                        animation: locGateIn 0.24s cubic-bezier(0.22, 1.18, 0.36, 1) both;
                    }
                    .loc-fs-corner {
                        position: absolute;
                        width: 12px;
                        height: 12px;
                        border-color: #f5a524;
                        border-style: solid;
                        pointer-events: none;
                    }
                    .loc-fs-corner.tl { top: -6px; left: -6px; border-width: 2px 0 0 2px; }
                    .loc-fs-corner.tr { top: -6px; right: -6px; border-width: 2px 2px 0 0; }
                    .loc-fs-corner.bl { bottom: -6px; left: -6px; border-width: 0 0 2px 2px; }
                    .loc-fs-corner.br { bottom: -6px; right: -6px; border-width: 0 2px 2px 0; }
                    .loc-fs-divider {
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        gap: 8px;
                        margin-bottom: 18px;
                    }
                    .loc-fs-bracket {
                        display: inline-flex;
                        align-items: center;
                        gap: 5px;
                    }
                    .loc-fs-dash {
                        width: 16px;
                        height: 3px;
                        background: #f5a524;
                        border-radius: 1px;
                    }
                    .loc-fs-hook {
                        width: 10px;
                        height: 10px;
                        border-top: 2.5px solid #f5a524;
                    }
                    .loc-fs-hook.left { border-left: 2.5px solid #f5a524; }
                    .loc-fs-hook.right { border-right: 2.5px solid #f5a524; }
                    .loc-fs-parallelogram {
                        display: inline-flex;
                        align-items: center;
                        gap: 6px;
                        padding: 6px 16px;
                        background: #faf1dc;
                        color: #16110e;
                        border: 2px solid #f5a524;
                        box-shadow: 3px 3px 0 #b8680a;
                        transform: skewX(-16deg);
                        font-size: 11px;
                        font-weight: 800;
                        letter-spacing: 0.14em;
                        text-transform: uppercase;
                    }
                    .loc-fs-parallelogram > * {
                        transform: skewX(16deg);
                    }
                    .loc-fs-title-top {
                        font-family: 'Anton', Impact, 'Arial Narrow Bold', sans-serif;
                        font-size: 30px;
                        line-height: 1;
                        letter-spacing: 0.08em;
                        color: #f27042;
                        text-shadow:
                            2px 2px 0 #3a150b,
                            0 0 18px rgba(242, 112, 66, 0.35);
                        margin-bottom: 4px;
                    }
                    .loc-fs-title-sub {
                        display: inline-flex;
                        align-items: baseline;
                        justify-content: center;
                        gap: 4px;
                        font-family: 'Anton', Impact, 'Arial Narrow Bold', sans-serif;
                        font-size: 24px;
                        line-height: 1.05;
                        letter-spacing: 0.12em;
                        color: #faf1dc;
                        text-shadow: 2px 2px 0 #1f1a16;
                        margin-bottom: 14px;
                    }
                    .loc-fs-underscore {
                        display: inline-block;
                        width: 14px;
                        height: 4px;
                        background: #f5a524;
                        box-shadow: 0 0 8px rgba(245, 165, 36, 0.7);
                        animation: locCursorBlink 1s steps(1) infinite;
                    }
                    .loc-fs-desc {
                        font-size: 12px;
                        color: #b7b1a6;
                        line-height: 1.65;
                        margin: 0 auto 22px;
                        max-width: 36ch;
                    }
                    .loc-fs-btn {
                        display: inline-flex;
                        align-items: center;
                        justify-content: center;
                        gap: 9px;
                        padding: 11px 22px;
                        background: #f27042;
                        color: #110b08;
                        border: 2px solid #f5a524;
                        border-radius: 3px;
                        box-shadow: 0 4px 0 #8a2f14, 0 10px 24px rgba(242, 112, 66, 0.28);
                        font: 800 12.5px/1 'JetBrains Mono', ui-monospace, monospace;
                        letter-spacing: 0.1em;
                        text-transform: uppercase;
                        cursor: pointer;
                        outline: none;
                        -webkit-tap-highlight-color: transparent;
                        transition: transform 0.12s ease, background 0.15s ease, box-shadow 0.12s ease;
                    }
                    .loc-fs-btn:focus,
                    .loc-fs-btn:focus-visible,
                    #${GATE_ID}:focus,
                    #${GATE_ID}:focus-visible,
                    #${GATE_ID} *:focus,
                    #${GATE_ID} *:focus-visible {
                        outline: none;
                    }
                    .loc-fs-btn:hover {
                        background: #ff8257;
                        box-shadow: 0 4px 0 #a33818, 0 12px 28px rgba(242, 112, 66, 0.42);
                    }
                    .loc-fs-btn:active {
                        transform: translateY(2px);
                        box-shadow: 0 2px 0 #8a2f14;
                    }
                `;
                document.head.appendChild(style);
            }

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
