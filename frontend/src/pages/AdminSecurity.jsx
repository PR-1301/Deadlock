import React, { useState, useEffect } from 'react';
import { useAdmin } from '../context/AdminContext';
import { getSecuritySettings, updateSecuritySettings } from '../api/securityAdmin';
import './AdminSecurity.css';

const AdminSecurity = () => {
    const { logs, connected } = useAdmin();
    const [settings, setSettings] = useState({
        disableCopyPaste: false,
        disableTextSelection: false,
        allowDevTools: true,
        forceFullscreen: false
    });

    useEffect(() => {
        // Fetch initial settings
        const fetchSettings = async () => {
            try {
                const res = await getSecuritySettings();
                if (res.success && res.settings) {
                    setSettings((prev) => ({
                        ...prev,
                        ...res.settings,
                        forceFullscreen: Boolean(res.settings.forceFullscreen)
                    }));
                }
            } catch (err) {
                console.error(">>> [ADMIN_SECURITY] Failed to fetch settings", err);
            }
        };
        fetchSettings();
    }, []);


    const handleToggle = async (key) => {
        const newValue = !settings[key];
        const newSettings = { ...settings, [key]: newValue };
        setSettings(newSettings);
        try {
            await updateSecuritySettings(newSettings);
        } catch (err) {
            console.error(">>> [ADMIN_SECURITY] Failed to update settings", err);
            // Revert on error
            setSettings(prev => ({ ...prev, [key]: !newValue }));
        }
    };


    return (
        <div className="admin-security-container">
            <div className="cyber-bg"></div>
            <div className="cyber-header">
                <h1 className="cyber-title glitch" data-text="SECURITY OVERRIDE">SECURITY OVERRIDE</h1>
                <div className={`connection-status ${connected ? 'stable' : 'offline'}`}>
                    {connected ? 'CORE CONNECTED' : 'CORE OFFLINE'}
                </div>
            </div>

            <div className="security-content">
                <div className="settings-panel">
                    <h2 className="panel-title">CONTROL PARAMETERS</h2>
                    <div className="toggle-group">
                        <div className="toggle-item">
                            <div className="toggle-info">
                                <span className="toggle-label">DISABLE COPY/PASTE</span>
                                <span className="toggle-desc">Blocks all paste events in code editors</span>
                            </div>
                            <label className="cyber-switch">
                                <input
                                    type="checkbox"
                                    checked={Boolean(settings.disableCopyPaste)}
                                    onChange={() => handleToggle('disableCopyPaste')}
                                />
                                <span className="slider"></span>
                            </label>
                        </div>

                        <div className="toggle-item">
                            <div className="toggle-info">
                                <span className="toggle-label">TURN FULL SCREEN</span>
                                <span className="toggle-desc">Forces all active player screens into fullscreen mode</span>
                            </div>
                            <label className="cyber-switch">
                                <input
                                    type="checkbox"
                                    checked={Boolean(settings.forceFullscreen)}
                                    onChange={() => handleToggle('forceFullscreen')}
                                />
                                <span className="slider"></span>
                            </label>
                        </div>

                    </div>
                </div>

                <div className="logs-panel">
                    <h2 className="panel-title">REAL-TIME ACTIVITY LOG</h2>
                    <div className="logs-viewport">
                        {logs.length === 0 && <div className="no-logs">LISTENING FOR ACTIVITY...</div>}
                        {logs.map((log, i) => (
                            <div key={i} className={`log-entry ${log.type.toLowerCase()}`}>
                                <span className="log-time">[{new Date(log.timestamp).toLocaleTimeString()}]</span>
                                <span className="log-team">[{log.teamName || 'UNKNOWN'}]</span>
                                <span className="log-msg">{log.message || log.type}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminSecurity;
