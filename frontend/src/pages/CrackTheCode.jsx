import React, { useState, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import CrackCodeLobby from './CrackCodeLobby';
import celestiusLogo from '../assets/celestius-logo.png';
import larperOrCoderImg from '../assets/larper-or-coder.png';
import './CrackTheCode.css';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || `http://${window.location.hostname}:5000`;
const SUPPORTED_LANGUAGES = ['python', 'cpp', 'javascript', 'java'];

const getDraftStorageKey = (teamId, sessionId) =>
    `crackCodeDraft:${teamId || 'anon'}:${sessionId || 'default'}`;

const getLangStorageKey = (teamId, sessionId) =>
    `crackCodeLang:${teamId || 'anon'}:${sessionId || 'default'}`;

const readStoredDrafts = (teamId, sessionId) => {
    try {
        const raw = localStorage.getItem(getDraftStorageKey(teamId, sessionId));
        if (!raw) return {};
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== 'object') return {};
        const clean = {};
        for (const lang of SUPPORTED_LANGUAGES) {
            if (typeof parsed[lang] === 'string') {
                clean[lang] = parsed[lang];
            }
        }
        return clean;
    } catch {
        return {};
    }
};

const writeStoredDrafts = (teamId, sessionId, codeMapObj) => {
    try {
        localStorage.setItem(getDraftStorageKey(teamId, sessionId), JSON.stringify(codeMapObj));
    } catch {
        // Ignore storage quota errors
    }
};

// Question (starter code + visible test cases) is served by the backend with the session.
// Running and grading happen server-side; hidden test cases never reach the browser.

// --- Memoized Cinematic Components (Defined at top to avoid TDZ) ---

const HexagonGrid = React.memo(({ isFirst }) => {
    // Reduced from 15 to 8 for performance
    const hexagons = React.useMemo(() => Array.from({ length: 8 }).map(() => ({
        left: `${Math.random() * 100}%`,
        width: `${Math.random() * 40 + 20}px`,
        delay: `${Math.random() * 5}s`,
        duration: `${Math.random() * 4 + 6}s`,
    })), []);

    return (
        <div className="hexagon-grid">
            {hexagons.map((h, i) => (
                <svg key={i} className="hexagon" viewBox="0 0 100 100" style={{
                    position: 'absolute',
                    left: h.left,
                    width: h.width,
                    animationDelay: h.delay,
                    animationDuration: h.duration,
                    fill: 'none',
                    stroke: isFirst ? '#00ff41' : '#ff9d00',
                    strokeWidth: '1'
                }}>
                    <path d="M50 5 L90 27.5 L90 72.5 L50 95 L10 72.5 L10 27.5 Z" />
                </svg>
            ))}
        </div>
    );
});

const EmberField = React.memo(({ isFirst }) => {
    // Reduced from 30 to 15 for performance
    const embers = React.useMemo(() => Array.from({ length: 12 }).map(() => ({
        left: `${Math.random() * 100}%`,
        duration: `${Math.random() * 2 + 3}s`,
        delay: `${Math.random() * 3}s`,
        drift: `${(Math.random() - 0.5) * 150}px`,
        size: `${Math.random() * 2 + 2}px`,
    })), []);

    return (
        <div className="ember-field">
            {embers.map((e, i) => (
                <div
                    key={i}
                    className="ember"
                    style={{
                        left: e.left,
                        background: isFirst ? '#00ff41' : '#ff9d00',
                        boxShadow: `0 0 5px ${isFirst ? '#00ff41' : '#ff9d00'}`,
                        animationDuration: e.duration,
                        animationDelay: e.delay,
                        '--drift': e.drift,
                        width: e.size,
                        height: e.size
                    }}
                ></div>
            ))}
        </div>
    );
});

const DigitalRain = React.memo(({ isFirst }) => {
    // Reduced from 20 to 12
    const drops = React.useMemo(() => {
        const charset = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
        return Array.from({ length: 12 }).map(() => ({
            duration: `${Math.random() * 1.5 + 1}s`,
            delay: `${Math.random() * 1.5}s`,
            content: Array.from({ length: 12 }).map(() => charset[Math.floor(Math.random() * charset.length)]).join('')
        }));
    }, []);

    return (
        <div className="digital-rain">
            {drops.map((d, i) => (
                <span
                    key={i}
                    className="rain-drop"
                    style={{
                        animationDuration: d.duration,
                        animationDelay: d.delay,
                        color: isFirst ? '#00ff41' : '#ff9d00'
                    }}
                >
                    {d.content}
                </span>
            ))}
        </div>
    );
});

const GameHeader = React.memo(({ initialTime, isGameStarted, submissionResult, onExpire, glitchStatus, onActivateGlitch }) => {
    const [secondsLeft, setSecondsLeft] = React.useState(initialTime);

    // Sync initialTime if it changes (e.g. on lobby transition)
    React.useEffect(() => {
        setSecondsLeft(initialTime);
    }, [initialTime]);

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    React.useEffect(() => {
        if (!isGameStarted || secondsLeft <= 0 || submissionResult) return;

        const timerId = setInterval(() => {
            setSecondsLeft(prev => {
                if (prev <= 1) {
                    clearInterval(timerId);
                    onExpire();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timerId);
    }, [isGameStarted, submissionResult, onExpire]);

    const teamId = localStorage.getItem('teamId');
    const isOwner = glitchStatus?.ownerId === teamId;
    const canActivate = isOwner && !glitchStatus?.glitchUsed;

    return (
        <header className="main-header">
            <div className="lc-header-brand">
                <img src={celestiusLogo} alt="Celestius" className="lc-brand-logo" />
                <img src={larperOrCoderImg} alt="LARPER OR CODER" className="lc-larper-logo" />
                <span className="lc-brand-divider" aria-hidden="true" />
                <h1 className="lc-header-title">Who&apos;s the GOAT?</h1>
            </div>

            <div className="lc-header-right">
                {canActivate && (
                    <button
                        className="glitch-activate-btn"
                        onClick={onActivateGlitch}
                    >
                        Use First Blood Skill
                    </button>
                )}
                {glitchStatus?.active && (
                    <div className="lc-attack-notice">
                        SYSTEM UNDER ATTACK
                    </div>
                )}

                <div className="lc-timer">
                    <svg className="lc-timer-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <circle cx="12" cy="12" r="10" />
                        <polyline points="12 6 12 12 16 14" />
                    </svg>
                    <span className="lc-timer-label">Time Left</span>
                    <span
                        className="lc-timer-value"
                        style={{ color: secondsLeft > 1200 ? '#2cbb5d' : (secondsLeft > 300 ? '#f5a21f' : '#ef4743') }}
                    >
                        {formatTime(secondsLeft)}
                    </span>
                </div>
            </div>
        </header>
    );
});

// --- Main Component ---

import useSecurity from '../hooks/useSecurity';
import GlitchOverlay from '../components/crack/GlitchOverlay';
import DismissalOverlay from '../components/crack/DismissalOverlay';

const CrackTheCode = () => {
    const teamName = localStorage.getItem('teamName') || 'UNKNOWN';
    const { security, reportAction } = useSecurity(teamName);

    const [language, setLanguage] = useState('python');

    const [testCases, setTestCases] = useState([]);
    const [codeMap, setCodeMap] = useState({});
    const [activeTestCase, setActiveTestCase] = useState(0);

    // Timer State
    const [timeLeft, setTimeLeft] = useState(30 * 60); // 30 minutes in seconds
    const [isGameStarted, setIsGameStarted] = useState(false);
    const [sessionId, setSessionId] = useState(null);
    const [submissionResult, setSubmissionResult] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [isRunning, setIsRunning] = useState(false);
    const [testResults, setTestResults] = useState({});
    const [hiddenTestResult, setHiddenTestResult] = useState(null);
    const [leftTab, setLeftTab] = useState('testcase');
    const [runError, setRunError] = useState(null);
    const [submitError, setSubmitError] = useState(null);
    // { language, code } of the last run that passed every visible + hidden case
    const [lastValidated, setLastValidated] = useState(null);
    const latestCodeRef = React.useRef({});

    useEffect(() => {
        if (isGameStarted) {
            document.title = "Who's the GOAT? // Celestius";
        }
    }, [isGameStarted]);

    // DISMISSAL STATE
    const [isDismissed, setIsDismissed] = useState(false);

    // GLITCH STATE
    const [glitchStatus, setGlitchStatus] = useState({
        active: false,
        ownerId: null,
        glitchUsed: false
    });

    // --- GLITCH LOGIC ---
    useEffect(() => {
        const fetchGlitchStatus = async () => {
            try {
                // 1. Check Global Status for Dismissal
                const globalRes = await fetch(`${BASE_URL}/api/public/crack-code/global-status`);
                if (globalRes.ok) {
                    const globalData = await globalRes.json();
                    // If game was started but now global session is gone -> ADMIN DISMISSED
                    if (isGameStarted && !globalData.started && !submissionResult) {
                        setIsDismissed(true);
                        // Transition back after 5 seconds
                        setTimeout(() => {
                            window.location.reload(); // Simple way to reset state and return to lobby
                        }, 5000);
                        return; // Stop polling glitch if dismissed
                    }
                }

                // 2. Check Glitch Status
                const res = await fetch(`${BASE_URL}/api/public/glitch/status`);
                if (res.ok) {
                    const data = await res.json();
                    setGlitchStatus({
                        active: data.active,
                        ownerId: data.ownerId,
                        glitchUsed: data.glitchUsed,
                        remainingTime: data.remainingTime
                    });
                }
            } catch (err) {
                console.error("Poll error:", err);
            }
        };

        fetchGlitchStatus(); // Initial check
        const interval = setInterval(fetchGlitchStatus, 2000);
        return () => clearInterval(interval);
    }, [isGameStarted, submissionResult]);

    const handleActivateGlitch = async () => {
        const teamId = localStorage.getItem("teamId");
        if (!teamId) return;

        if (!window.confirm("WARNING: INITIATING CYBER-ATTACK WILL DISRUPT ALL OPPONENTS FOR 15 SECONDS. EXECUTE?")) return;

        try {
            const res = await fetch(`${BASE_URL}/api/public/glitch/activate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ teamId })
            });
            const data = await res.json();
            if (data.success) {
                alert("CYBER-ATTACK INITIATED. TARGETS LOCKED.");
            } else {
                alert("ACTIVATION FAILED: " + data.message);
            }
        } catch (err) {
            console.error("Glitch activation error:", err);
            alert("SYSTEM ERROR");
        }
    };
    // --------------------

    // --- Callback Stability Ref Pattern ---
    // This prevents high-frequency renders (keystrokes) from resetting the timer
    const handleSubmitRef = React.useRef();

    const handleLanguageChange = React.useCallback((e) => {
        const nextLang = e.target.value;
        setLanguage(nextLang);
        try {
            const teamId = localStorage.getItem('teamId');
            localStorage.setItem(getLangStorageKey(teamId, sessionId), nextLang);
        } catch {
            // Ignore storage errors
        }
    }, [sessionId]);

    const handleCodeChange = React.useCallback((value) => {
        latestCodeRef.current[language] = value;
        const teamId = localStorage.getItem('teamId');
        writeStoredDrafts(teamId, sessionId, latestCodeRef.current);
        setCodeMap((prev) => ({
            ...prev,
            [language]: value
        }));
    }, [language, sessionId]);

    const handleCodeImmediate = React.useCallback((lang, value) => {
        latestCodeRef.current[lang] = value;
        const teamId = localStorage.getItem('teamId');
        writeStoredDrafts(teamId, sessionId, latestCodeRef.current);
    }, [sessionId]);

    const handleEditorDidMount = React.useCallback((editor, monaco) => {
        monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions({
            noSemanticValidation: false,
            noSyntaxValidation: false,
        });

        monaco.languages.typescript.javascriptDefaults.setCompilerOptions({
            target: monaco.languages.typescript.ScriptTarget.ES2016,
            allowNonTsExtensions: true,
            moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
            module: monaco.languages.typescript.ModuleKind.CommonJS,
            noEmit: true,
            lib: ["esnext", "dom"],
            typeRoots: ["node_modules/@types"]
        });

        monaco.languages.typescript.javascriptDefaults.addExtraLib(`
            declare var console: {
                log(...data: any[]): void;
                error(...data: any[]): void;
                warn(...data: any[]): void;
                info(...data: any[]): void;
            };
        `, 'ts:filename/console.d.ts');
    }, []);

    const handleRun = React.useCallback(async () => {
        const teamId = localStorage.getItem("teamId");
        if (!teamId) {
            setRunError("Team ID not found. Please log in again.");
            setLeftTab('result');
            return;
        }

        const code = latestCodeRef.current[language] ?? codeMap[language] ?? "";
        setCodeMap((prev) => (prev[language] === code ? prev : { ...prev, [language]: code }));
        setIsRunning(true);
        setLeftTab('result');
        setRunError(null);
        setSubmitError(null);
        setTestResults({});
        setHiddenTestResult(null);

        try {
            const response = await fetch(`${BASE_URL}/api/public/crack-code/run`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ teamId, language, code }),
            });
            const data = await response.json().catch(() => ({}));

            if (!response.ok) {
                const detail = [data.message, data.error].filter(Boolean).join(": ");
                const errMsg = detail || `Execution failed (HTTP ${response.status})`;
                setRunError(errMsg);
                const failed = {};
                testCases.forEach((_, i) => {
                    failed[i] = { log: errMsg, result: "Error", isCorrect: false, status: "error" };
                });
                setTestResults(failed);
                setLastValidated(null);
                return;
            }

            const results = {};
            (data.results || []).forEach((r, i) => {
                const isErr = r.result === "Runtime Error" || r.result === "Error";
                results[i] = { ...r, status: isErr ? "error" : "success" };
            });
            setTestResults(results);
            setLastValidated(data.validated ? { language, code } : null);
        } catch (error) {
            const errMsg = error?.message ? `Network Error: ${error.message}` : "Network error while executing code.";
            setRunError(errMsg);
            const failed = {};
            testCases.forEach((_, i) => {
                failed[i] = { log: errMsg, result: "Error", isCorrect: false, status: "error" };
            });
            setTestResults(failed);
            setLastValidated(null);
        } finally {
            setIsRunning(false);
        }
    }, [language, codeMap, testCases]);

    const handleSubmit = React.useCallback(async (isAutoSubmit = false) => {
        const teamId = localStorage.getItem("teamId");
        if (!teamId || !sessionId) {
            if (!isAutoSubmit) setSubmitError("Session information missing. Please refresh and try again.");
            return;
        }

        const code = latestCodeRef.current[language] ?? codeMap[language] ?? "";
        setCodeMap((prev) => (prev[language] === code ? prev : { ...prev, [language]: code }));
        setIsSubmitting(true);
        setSubmitError(null);
        if (!isAutoSubmit) {
            setLeftTab('result');
            setRunError(null);
            setHiddenTestResult(null);
        }

        try {
            const response = await fetch(`${BASE_URL}/api/public/crack-code/submit`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    teamId,
                    sessionId: sessionId,
                    submittedLogic: code,
                    language,
                    autoSubmit: isAutoSubmit
                }),
            });

            const data = await response.json().catch(() => ({}));
            if (response.ok) {
                if (data.passed === false && !isAutoSubmit) {
                    if (Array.isArray(data.results)) {
                        const results = {};
                        data.results.forEach((r, i) => {
                            const isErr = r.result === "Runtime Error" || r.result === "Error";
                            results[i] = { ...r, status: isErr ? "error" : "success" };
                        });
                        setTestResults(results);
                    }
                    if (data.failedStage === 'hidden') {
                        setHiddenTestResult("Failed hidden testcase");
                        setRunError(data.message || "Failed hidden testcase. Handle edge cases and try again.");
                    } else {
                        setRunError(data.message || "Visible testcases failed.");
                    }
                    setLastValidated(null);
                    return;
                }

                setSubmissionResult({
                    isFirst: data.isFirst,
                    message: data.message
                });
            } else {
                const errMsg = [data.message, data.error].filter(Boolean).join(": ") || `Submission failed (HTTP ${response.status})`;
                if (!isAutoSubmit) setSubmitError(errMsg);
            }
        } catch (error) {
            console.error("Submission error:", error);
            if (!isAutoSubmit) setSubmitError(error?.message ? `Network Error: ${error.message}` : "Network error during submission.");
        } finally {
            setIsSubmitting(false);
        }
    }, [language, codeMap, sessionId]);

    // Keep the ref updated with the latest handleSubmit closure
    React.useEffect(() => {
        handleSubmitRef.current = handleSubmit;
    }, [handleSubmit]);

    // Fully stable handleExpire - reference NEVER changes
    const handleExpire = React.useCallback(() => {
        if (handleSubmitRef.current) {
            handleSubmitRef.current(true);
        }
    }, []);

    // Server is the source of truth on submit; this only gates the button.
    const isSubmitEnabled = !!lastValidated
        && lastValidated.language === language
        && lastValidated.code === (latestCodeRef.current[language] ?? codeMap[language]);

    if (!isGameStarted) {
        return <CrackCodeLobby onGameReady={(sessionData) => {
            if (sessionData && sessionData.startedAt) {
                const startTime = new Date(sessionData.startedAt).getTime();
                const now = Date.now();
                const elapsedSeconds = Math.floor((now - startTime) / 1000);
                const totalDuration = 30 * 60;
                const remaining = Math.max(0, totalDuration - elapsedSeconds);
                setTimeLeft(remaining);
                setSessionId(sessionData.sessionId);
                if (sessionData.question) {
                    const teamId = localStorage.getItem("teamId");
                    const starter = sessionData.question.starterCode || {};
                    const savedDrafts = readStoredDrafts(teamId, sessionData.sessionId);
                    const mergedCode = { ...starter, ...savedDrafts };
                    latestCodeRef.current = { ...mergedCode };
                    setTestCases(sessionData.question.testCases || []);
                    setCodeMap(mergedCode);

                    try {
                        const savedLang = localStorage.getItem(getLangStorageKey(teamId, sessionData.sessionId));
                        if (savedLang && SUPPORTED_LANGUAGES.includes(savedLang)) {
                            setLanguage(savedLang);
                        }
                    } catch {
                        // Ignore storage errors
                    }
                }
                if (sessionData.submission) {
                    setSubmissionResult(sessionData.submission);
                }
            }
            setIsGameStarted(true);
        }} />;
    }

    // --- Performance Optimization: Unmount main UI on result ---
    if (submissionResult) {
        return (
            <div className={`crack-page ending`}>
                <div className={`cyber-modal-overlay ${submissionResult.isFirst ? 'winner chromatic-pulse' : 'slower'}`}>
                    <div className="neon-scanner" style={{
                        background: `linear-gradient(90deg, transparent, ${submissionResult.isFirst ? 'rgba(0, 255, 65, 0.8)' : 'rgba(255, 157, 0, 0.8)'}, transparent)`,
                        boxShadow: `0 0 20px ${submissionResult.isFirst ? 'rgba(0, 255, 65, 0.5)' : 'rgba(255, 157, 0, 0.5)'}`
                    }}></div>

                    <HexagonGrid isFirst={submissionResult.isFirst} />
                    <div className={`god-rays ${submissionResult.isFirst ? 'green' : 'amber'}`}></div>
                    <EmberField isFirst={submissionResult.isFirst} />
                    <div className="digital-noise"></div>
                    <DigitalRain isFirst={submissionResult.isFirst} />

                    <div className={`cyber-modal-content ${submissionResult.isFirst ? 'winner' : 'slower'}`}>
                        {submissionResult.isFirst && (
                            <>
                                <div className="cyber-crown-container">
                                    <svg className="cyber-crown-svg" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M10 80L20 40L40 60L50 20L60 60L80 40L90 80H10Z" fill="#00ff41" fillOpacity="0.2" stroke="#00ff41" strokeWidth="2" />
                                        <circle cx="50" cy="20" r="3" fill="#00ff41" />
                                        <circle cx="20" cy="40" r="3" fill="#00ff41" />
                                        <circle cx="80" cy="40" r="3" fill="#00ff41" />
                                        <circle cx="10" cy="80" r="3" fill="#00ff41" />
                                        <circle cx="90" cy="80" r="3" fill="#00ff41" />
                                    </svg>
                                </div>
                                <div className="victory-shockwave">
                                    <div className="shock-ring shock-1"></div>
                                    <div className="shock-ring shock-2"></div>
                                    <div className="shock-ring shock-3"></div>
                                </div>
                            </>
                        )}
                        <div className="scanline"></div>
                        <div className="glitch-wrapper">
                            {submissionResult.isFirst && <div className="critical-status">// CRITICAL VICTORY //</div>}
                            <h2 className="cyber-title glitch" data-text={
                                submissionResult.isFirst
                                    ? "SYSTEM OVERRIDE"
                                    : submissionResult.message.includes("APPRECIATED")
                                        ? "CODE CRACKED"
                                        : "BREACH DETECTED"
                            }>
                                {submissionResult.isFirst
                                    ? "SYSTEM OVERRIDE"
                                    : submissionResult.message.includes("APPRECIATED")
                                        ? "CODE CRACKED"
                                        : "BREACH DETECTED"}
                            </h2>
                        </div>
                        <p className="cyber-message">
                            {(submissionResult?.message || "").split('\n').map((line, index) => (
                                <span key={index} className={index === 0 ? (submissionResult?.isFirst ? "winner-highlight" : "participation-highlight") : ""}>
                                    {line}
                                    {index === 0 && <br />}
                                </span>
                            ))}
                        </p>
                        <div className="infinite-lock-text">
                            // SESSION PERSISTENCE ACTIVE //
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    const teamId = localStorage.getItem('teamId');
    const isVictim = glitchStatus?.active && glitchStatus?.ownerId !== teamId;

    return (
        <div className="crack-page">
            {isDismissed && <DismissalOverlay />}

            {isVictim && !isDismissed && (
                <GlitchOverlay
                    ownerName={glitchStatus?.ownerId ? "RIVAL TEAM" : "UNKNOWN"}
                    remaining={glitchStatus?.remainingTime}
                />
            )}

            <GameHeader
                initialTime={timeLeft}
                isGameStarted={isGameStarted}
                submissionResult={submissionResult}
                onExpire={handleExpire}
                glitchStatus={glitchStatus}
                onActivateGlitch={handleActivateGlitch}
            />

            <div className="crack-container">
                <LeftPanel
                    testCases={testCases}
                    activeTestCase={activeTestCase}
                    setActiveTestCase={setActiveTestCase}
                    testResults={testResults}
                    hiddenTestResult={hiddenTestResult}
                    isRunning={isRunning}
                    isSubmitting={isSubmitting}
                    leftTab={leftTab}
                    setLeftTab={setLeftTab}
                    runError={runError}
                />

                <RightPanel
                    language={language}
                    code={codeMap[language] || ""}
                    isRunning={isRunning}
                    isSubmitting={isSubmitting}
                    isSubmitEnabled={isSubmitEnabled}
                    submitError={submitError}
                    clearSubmitError={() => setSubmitError(null)}
                    handleLanguageChange={handleLanguageChange}
                    handleRun={handleRun}
                    handleSubmit={handleSubmit}
                    handleCodeChange={handleCodeChange}
                    handleCodeImmediate={handleCodeImmediate}
                    handleEditorDidMount={handleEditorDidMount}
                    security={security}
                />
            </div>
        </div>
    );
};

// --- Memoized Panel Components ---

const CaseStatusIcon = ({ isCorrect }) => (
    <span className={`tc-status-icon ${isCorrect ? 'pass' : 'fail'}`} aria-hidden="true">
        {isCorrect ? (
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                <path d="M3.5 8.5L6.5 11.5L12.5 4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
        ) : (
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                <path d="M4.5 4.5L11.5 11.5M11.5 4.5L4.5 11.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
        )}
    </span>
);

const LeftPanel = React.memo(({
    testCases,
    activeTestCase,
    setActiveTestCase,
    testResults,
    hiddenTestResult,
    isRunning,
    isSubmitting,
    leftTab,
    setLeftTab,
    runError
}) => {
    const isBusy = isRunning || isSubmitting;
    const activeResult = testResults[activeTestCase];
    const hasResults = Object.keys(testResults).length > 0;
    const allVisiblePassed = hasResults && testCases.every((_, i) => testResults[i]?.isCorrect);

    const isCaseError = Boolean(
        activeResult && (
            activeResult.status === 'error' ||
            activeResult.result === 'Runtime Error' ||
            activeResult.result === 'Error'
        )
    );

    const getVerdictInfo = () => {
        if (hiddenTestResult && hiddenTestResult.toLowerCase().includes('failed')) {
            return { label: 'Failed Hidden Testcase', cls: 'error' };
        }
        if (runError) return { label: 'Execution Error', cls: 'error' };
        if (activeResult) {
            if (activeResult.result === 'Runtime Error') return { label: 'Runtime Error', cls: 'error' };
            if (activeResult.status === 'error' || activeResult.result === 'Error') return { label: 'Compile / Execution Error', cls: 'error' };
            if (!activeResult.isCorrect) return { label: 'Wrong Answer', cls: 'error' };
            if (allVisiblePassed) return { label: 'Accepted', cls: 'accepted' };
            return { label: 'Wrong Answer', cls: 'error' };
        }
        return null;
    };

    const verdict = getVerdictInfo();

    const passedCount = hasResults ? testCases.filter((_, i) => testResults[i]?.isCorrect).length : 0;

    return (
        <div className="panel left-panel">
            <div className="lc-panel-tabs" role="tablist">
                <button
                    type="button"
                    role="tab"
                    aria-selected={leftTab === 'testcase'}
                    className={`lc-mode-tab ${leftTab === 'testcase' ? 'active' : ''}`}
                    onClick={() => setLeftTab('testcase')}
                >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <polyline points="4 17 10 11 4 5" />
                        <line x1="12" y1="19" x2="20" y2="19" />
                    </svg>
                    <span>Testcase</span>
                </button>
                <button
                    type="button"
                    role="tab"
                    aria-selected={leftTab === 'result'}
                    className={`lc-mode-tab ${leftTab === 'result' ? 'active' : ''}`}
                    onClick={() => setLeftTab('result')}
                >
                    {isBusy ? (
                        <span className="lc-spinner sm" aria-hidden="true" />
                    ) : (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <polyline points="9 11 12 14 22 4" />
                            <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                        </svg>
                    )}
                    <span>Test Result</span>
                </button>
            </div>

            <div className="lc-left-body">
                {leftTab === 'testcase' && (
                    <div className="lc-prompt-hint">
                        Deduce the hidden logic from the sample inputs and outputs, then implement <code>decodeLogic</code>.
                    </div>
                )}

                {leftTab === 'result' && (
                    <div className="lc-verdict-row">
                        <div className="lc-verdict-main">
                            {isBusy ? (
                                <span className="lc-verdict-text running">
                                    <span className="lc-spinner" aria-hidden="true" />
                                    {isSubmitting
                                        ? 'Submitting and running all testcases (including hidden)...'
                                        : 'Running testcases...'}
                                </span>
                            ) : verdict ? (
                                <>
                                    <span className={`lc-verdict-text ${verdict.cls}`}>{verdict.label}</span>
                                    {hasResults && (!runError || hiddenTestResult) && (
                                        <span className="lc-pass-count">
                                            {passedCount}/{testCases.length} visible passed
                                        </span>
                                    )}
                                </>
                            ) : (
                                <span className="lc-empty-state">Run your code to see test results.</span>
                            )}
                        </div>
                    </div>
                )}

                <div className="testcase-tabs">
                    {testCases.map((_, index) => {
                        const result = testResults[index];
                        return (
                            <button
                                key={index}
                                type="button"
                                className={`tab-btn ${activeTestCase === index ? 'active' : ''}`}
                                onClick={() => setActiveTestCase(index)}
                            >
                                {isBusy ? (
                                    <span className="lc-spinner sm" aria-label={`Running Case ${index + 1}`} />
                                ) : (
                                    result?.isCorrect !== undefined && <CaseStatusIcon isCorrect={result.isCorrect} />
                                )}
                                <span>Case {index + 1}</span>
                            </button>
                        );
                    })}
                </div>

                {leftTab === 'testcase' ? (
                    <div className="testcase-content">
                        <div className="io-group">
                            <span className="label">Input</span>
                            <pre className="io-box">{testCases[activeTestCase]?.input || ""}</pre>
                        </div>
                        <div className="io-group">
                            <span className="label">Expected Output</span>
                            <pre className="io-box">{testCases[activeTestCase]?.output ?? ""}</pre>
                        </div>
                    </div>
                ) : (
                    <div className="testcase-content">
                        {!isBusy && runError && (
                            <div className="io-group">
                                <span className="label">Error Message</span>
                                <pre className="lc-error-box">{runError}</pre>
                            </div>
                        )}

                        {!isBusy && !runError && isCaseError && (
                            <div className="io-group">
                                <span className="label">Error Details</span>
                                <pre className="lc-error-box">
                                    {activeResult?.log || activeResult?.result || "Execution failed."}
                                </pre>
                            </div>
                        )}

                        <div className="io-group">
                            <span className="label">Input</span>
                            <pre className="io-box">{testCases[activeTestCase]?.input || ""}</pre>
                        </div>

                        {!isBusy && !isCaseError && activeResult?.log && (
                            <div className="io-group">
                                <span className="label">Stdout</span>
                                <pre className="io-box">{activeResult.log}</pre>
                            </div>
                        )}

                        {!isBusy && !isCaseError && activeResult && (
                            <div className="io-group">
                                <span className="label">Output</span>
                                <pre className={`io-box ${activeResult.isCorrect ? 'output-pass' : 'output-fail'}`}>
                                    {activeResult.result || ""}
                                </pre>
                            </div>
                        )}

                        <div className="io-group">
                            <span className="label">Expected</span>
                            <pre className="io-box">{testCases[activeTestCase]?.output ?? ""}</pre>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
});

const RightPanel = React.memo(({
    language, code, isRunning, isSubmitting, isSubmitEnabled,
    submitError, clearSubmitError,
    handleLanguageChange, handleRun,
    handleSubmit, handleCodeChange, handleCodeImmediate, handleEditorDidMount,
    security
}) => {
    // Local state for debounced editor updates
    const [localCode, setLocalCode] = useState(code);

    // Sync local code when language changes
    useEffect(() => {
        setLocalCode(code);
    }, [language, code]);

    // Handle high-frequency changes locally
    const onInternalChange = (value) => {
        const next = value ?? "";
        setLocalCode(next);
        handleCodeImmediate(language, next);
    };

    // Debounce the global state sync
    useEffect(() => {
        const timer = setTimeout(() => {
            if (localCode !== code) {
                handleCodeChange(localCode);
            }
        }, 500);
        return () => clearTimeout(timer);
    }, [localCode, handleCodeChange, code]);

    return (
        <div className="panel right-panel">
            <div className="editor-header">
                <div className="lang-selector">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <polyline points="16 18 22 12 16 6" />
                        <polyline points="8 6 2 12 8 18" />
                    </svg>
                    <select value={language} onChange={handleLanguageChange}>
                        <option value="python">Python</option>
                        <option value="cpp">C++</option>
                        <option value="javascript">JavaScript</option>
                        <option value="java">Java</option>
                    </select>
                </div>
                <div className="actions">
                    <span className="lc-saved-note">Saved locally</span>
                    <button className="btn run-btn" onClick={handleRun} disabled={isRunning || isSubmitting}>
                        {isRunning ? (
                            <span className="lc-spinner sm" aria-hidden="true" />
                        ) : (
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                                <polygon points="5 3 19 12 5 21 5 3" />
                            </svg>
                        )}
                        <span>{isRunning ? 'Running' : 'Run'}</span>
                    </button>
                    <button
                        className="btn submit-btn"
                        onClick={() => handleSubmit()}
                        disabled={!isSubmitEnabled || isRunning || isSubmitting}
                        title={!isSubmitEnabled ? "Pass all visible testcases via Run to enable Submit" : "Submit and run all testcases including hidden"}
                    >
                        {isSubmitting ? (
                            <span className="lc-spinner sm" aria-hidden="true" />
                        ) : (
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                <path d="M22 2L11 13" />
                                <path d="M22 2L15 22L11 13L2 9L22 2Z" />
                            </svg>
                        )}
                        <span>{isSubmitting ? "Submitting..." : "Submit"}</span>
                    </button>
                </div>
            </div>

            {submitError && (
                <div className="lc-inline-banner-error" role="alert">
                    <span>{submitError}</span>
                    <button type="button" className="lc-inline-banner-close" onClick={clearSubmitError}>
                        Dismiss
                    </button>
                </div>
            )}

            <div className="monaco-wrapper" style={{ display: 'flex', flexDirection: 'column' }}>
                <Editor
                    height="100%"
                    language={language === 'cpp' ? 'cpp' : language}
                    theme="vs-dark"
                    value={localCode}
                    onChange={onInternalChange}
                    onMount={handleEditorDidMount}
                    options={{
                        minimap: { enabled: false },
                        fontSize: 14,
                        scrollBeyondLastLine: false,
                        automaticLayout: true,
                        quickSuggestions: { other: true, comments: true, strings: true },
                        parameterHints: { enabled: true },
                        suggestOnTriggerCharacters: true,
                        acceptSuggestionOnEnter: "on",
                        tabCompletion: "on",
                        contextmenu: !security.disableCopyPaste && !security.disableTextSelection,
                        copySelection: !security.disableCopyPaste,
                        links: false,
                        dragAndDrop: false,
                        selectionClipboard: false
                    }}
                />
            </div>
        </div>
    );
});

export default CrackTheCode;
