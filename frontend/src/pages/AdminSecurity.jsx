import React, { useState, useEffect, useMemo } from 'react';
import { useAdmin } from '../context/AdminContext';
import { getSecuritySettings, updateSecuritySettings } from '../api/securityAdmin';
import './AdminSecurity.css';

const FILTER_GROUPS = [
    { key: 'ALL', label: 'ALL', categories: null },
    { key: 'CLIPBOARD', label: 'COPY / PASTE', categories: ['COPY', 'PASTE', 'CUT'] },
    { key: 'FOCUS', label: 'TAB / WINDOW', categories: ['TAB_SWITCH', 'WINDOW_SWITCH'] },
    { key: 'DEVTOOLS', label: 'DEVTOOLS', categories: ['DEVTOOLS'] },
    { key: 'AI_ASSISTANT', label: 'AI / SIDE PANEL', categories: ['AI_ASSISTANT'] },
    { key: 'CONTEXT_MENU', label: 'CONTEXT MENU', categories: ['CONTEXT_MENU'] },
    { key: 'SHORTCUT', label: 'SHORTCUTS', categories: ['SHORTCUT'] },
    { key: 'FULLSCREEN', label: 'FULLSCREEN', categories: ['FULLSCREEN'] }
];

const resolveLogCategory = (log) => {
    if (log.category) return String(log.category).toUpperCase();
    const msg = String(log.message || '').toLowerCase();
    if (log.type === 'TAB_SWITCH' || msg.includes('tab')) return 'TAB_SWITCH';
    if (log.type === 'WINDOW_SWITCH' || msg.includes('window') || msg.includes('blur')) return 'WINDOW_SWITCH';
    if (msg.includes('paste') || msg.includes('drag')) return 'PASTE';
    if (msg.includes('copy')) return 'COPY';
    if (msg.includes('cut')) return 'CUT';
    if (msg.includes('context') || msg.includes('right-click')) return 'CONTEXT_MENU';
    if (msg.includes('gemini') || msg.includes('side panel') || msg.includes('ai assistant')) return 'AI_ASSISTANT';
    if (msg.includes('devtool') || msg.includes('inspect')) return 'DEVTOOLS';
    if (msg.includes('fullscreen')) return 'FULLSCREEN';
    if (msg.includes('shortcut') || msg.includes('print') || msg.includes('source')) return 'SHORTCUT';
    return 'OTHER';
};

const AdminSecurity = () => {
    const { logs, logsLoading, refreshLogs, clearLogs, connected } = useAdmin();
    const [settings, setSettings] = useState({
        disableCopyPaste: false,
        disableTextSelection: false,
        allowDevTools: false,
        forceFullscreen: false,
        blockDevTools: false,
        blockAiAssistant: false,
        enableLogging: false
    });
    const [activeFilter, setActiveFilter] = useState('ALL');
    const [teamQuery, setTeamQuery] = useState('');
    const [clearing, setClearing] = useState(false);

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const res = await getSecuritySettings();
                if (res.success && res.settings) {
                    setSettings((prev) => ({
                        ...prev,
                        ...res.settings,
                        forceFullscreen: Boolean(res.settings.forceFullscreen),
                        blockDevTools: Boolean(res.settings.blockDevTools),
                        blockAiAssistant: Boolean(res.settings.blockAiAssistant),
                        enableLogging: Boolean(res.settings.enableLogging)
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
            setSettings(prev => ({ ...prev, [key]: !newValue }));
        }
    };

    const handleClearLogs = async () => {
        if (clearing || logs.length === 0) return;
        if (!window.confirm('Clear all stored security violation logs?')) return;
        setClearing(true);
        try {
            await clearLogs();
        } catch (err) {
            console.error(">>> [ADMIN_SECURITY] Failed to clear logs", err);
        } finally {
            setClearing(false);
        }
    };

    const enrichedLogs = useMemo(
        () => logs.map((log) => ({ ...log, resolvedCategory: resolveLogCategory(log) })),
        [logs]
    );

    const groupCounts = useMemo(() => {
        const counts = { ALL: enrichedLogs.length };
        FILTER_GROUPS.forEach((group) => {
            if (!group.categories) return;
            counts[group.key] = enrichedLogs.filter((l) => group.categories.includes(l.resolvedCategory)).length;
        });
        return counts;
    }, [enrichedLogs]);

    const filteredLogs = useMemo(() => {
        const group = FILTER_GROUPS.find((g) => g.key === activeFilter);
        const search = teamQuery.trim().toLowerCase();
        return enrichedLogs.filter((log) => {
            if (group?.categories && !group.categories.includes(log.resolvedCategory)) {
                return false;
            }
            if (search) {
                const haystack = `${log.teamName || ''} ${log.message || ''} ${log.action || ''} ${log.page || ''}`.toLowerCase();
                if (!haystack.includes(search)) return false;
            }
            return true;
        });
    }, [enrichedLogs, activeFilter, teamQuery]);

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
                                <span className="toggle-desc">Blocks & logs copy, cut, paste, drag-drop, and clipboard shortcuts</span>
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
                                <span className="toggle-desc">Forces fullscreen mode and logs Escape / F11 exit attempts</span>
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

                        <div className="toggle-item">
                            <div className="toggle-info">
                                <span className="toggle-label">BLOCK DEVTOOLS / INSPECT</span>
                                <span className="toggle-desc">Blocks right-click, inspect/source shortcuts, and locks screen if DevTools opens</span>
                            </div>
                            <label className="cyber-switch">
                                <input
                                    type="checkbox"
                                    checked={Boolean(settings.blockDevTools)}
                                    onChange={() => handleToggle('blockDevTools')}
                                />
                                <span className="slider"></span>
                            </label>
                        </div>

                        <div className="toggle-item">
                            <div className="toggle-info">
                                <span className="toggle-label">BLOCK AI / SIDE PANEL</span>
                                <span className="toggle-desc">Locks &amp; hides arena when Gemini/side panel opens or window loses focus; blocks Alt+G &amp; Ctrl+L</span>
                            </div>
                            <label className="cyber-switch">
                                <input
                                    type="checkbox"
                                    checked={Boolean(settings.blockAiAssistant)}
                                    onChange={() => handleToggle('blockAiAssistant')}
                                />
                                <span className="slider"></span>
                            </label>
                        </div>

                        <div className="toggle-item">
                            <div className="toggle-info">
                                <span className="toggle-label">ENABLE VIOLATION LOGGING</span>
                                <span className="toggle-desc">Records tab/window switches, copy/paste, DevTools &amp; shortcuts to DB (turn OFF while testing)</span>
                            </div>
                            <label className="cyber-switch">
                                <input
                                    type="checkbox"
                                    checked={Boolean(settings.enableLogging)}
                                    onChange={() => handleToggle('enableLogging')}
                                />
                                <span className="slider"></span>
                            </label>
                        </div>
                    </div>

                    <div className={`always-monitored-note ${settings.enableLogging ? 'is-live' : 'is-paused'}`}>
                        {settings.enableLogging
                            ? 'LOGGING ACTIVE: Saving all violations (copy/paste, tab/window switch, DevTools, context menu, shortcuts) to DB & live feed'
                            : 'LOGGING PAUSED (TEST MODE): No DB log writes or tab/window alerts while disabled — turn ON for the live event'}
                    </div>
                </div>

                <div className="logs-panel">
                    <div className="logs-header-row">
                        <h2 className="panel-title" style={{ marginBottom: 0 }}>
                            SECURITY VIOLATION LOG ({filteredLogs.length})
                        </h2>
                        <div className="logs-actions">
                            <button
                                type="button"
                                className="log-action-btn"
                                onClick={refreshLogs}
                                disabled={logsLoading}
                            >
                                {logsLoading ? 'SYNCING...' : 'REFRESH'}
                            </button>
                            <button
                                type="button"
                                className="log-action-btn danger"
                                onClick={handleClearLogs}
                                disabled={clearing || logs.length === 0}
                            >
                                CLEAR
                            </button>
                        </div>
                    </div>

                    <div className="logs-toolbar">
                        <input
                            type="text"
                            className="logs-search-input"
                            placeholder="Filter by team, action, page..."
                            value={teamQuery}
                            onChange={(e) => setTeamQuery(e.target.value)}
                        />
                        <div className="logs-filter-pills">
                            {FILTER_GROUPS.map((group) => (
                                <button
                                    key={group.key}
                                    type="button"
                                    className={`log-filter-pill ${activeFilter === group.key ? 'active' : ''}`}
                                    onClick={() => setActiveFilter(group.key)}
                                >
                                    <span>{group.label}</span>
                                    <span className="pill-count">{groupCounts[group.key] || 0}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="logs-viewport">
                        {logsLoading && logs.length === 0 && (
                            <div className="no-logs">LOADING STORED SECURITY TELEMETRY...</div>
                        )}
                        {!logsLoading && filteredLogs.length === 0 && (
                            <div className="no-logs">
                                {logs.length === 0 ? 'LISTENING FOR ACTIVITY...' : 'NO MATCHING VIOLATIONS'}
                            </div>
                        )}
                        {filteredLogs.map((log, i) => {
                            const cat = log.resolvedCategory || 'OTHER';
                            const rowClass = `${String(log.type || 'alert').toLowerCase()} cat-${cat.toLowerCase()}`;
                            return (
                                <div key={log._id || `${log.timestamp}-${i}`} className={`log-entry ${rowClass}`}>
                                    <span className="log-time">[{new Date(log.timestamp).toLocaleTimeString()}]</span>
                                    <span className={`log-cat-badge cat-${cat.toLowerCase()}`}>{cat}</span>
                                    {log.action && <span className="log-action-chip">{log.action}</span>}
                                    <span className="log-team">[{log.teamName || 'UNKNOWN'}]</span>
                                    {log.page && <span className="log-page">[{log.page}]</span>}
                                    <span className="log-msg">{log.message || log.type}</span>
                                    {log.blocked && <span className="log-blocked-tag">BLOCKED</span>}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminSecurity;
