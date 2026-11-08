import React, { useState, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import CrackCodeLobby from './CrackCodeLobby';
import './CrackTheCode.css';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || `http://${window.location.hostname}:5000`;

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
        <header className="main-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h1 style={{
                background: 'linear-gradient(90deg, #00C9FF 0%, #92FE9D 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                textTransform: 'uppercase',
                fontSize: '2rem',
                fontWeight: '800',
                margin: 0
            }}>Crack The Code</h1>

            <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                {canActivate && (
                    <button
                        className="glitch-activate-btn"
                        onClick={onActivateGlitch}
                        style={{
                            background: 'red',
                            color: 'white',
                            border: '2px solid #ff0000',
                            padding: '8px 16px',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            animation: 'pulse 1s infinite'
                        }}
                    >
                        Unleash First Blood Skill 🩸
                    </button>
                )}
                {glitchStatus?.active && (
                    <div style={{ color: 'red', fontWeight: 'bold', animation: 'blink 0.5s infinite' }}>
                        SYSTEM UNDER ATTACK
                    </div>
                )}

                <div className="timer" style={{
                    fontSize: '1.5em',
                    fontWeight: 'bold',
                    marginRight: '20px',
                    fontFamily: 'monospace'
                }}>
                    <span style={{ color: 'aliceblue' }}>Time Left: </span>
                    <span style={{ color: secondsLeft > 1200 ? '#28a745' : (secondsLeft > 300 ? '#e67300' : '#dc3545') }}>
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
    // { language, code } of the last run that passed every visible + hidden case
    const [lastValidated, setLastValidated] = useState(null);

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
        setLanguage(e.target.value);
    }, []);

    const handleCodeChange = React.useCallback((value) => {
        setCodeMap((prev) => ({
            ...prev,
            [language]: value
        }));
    }, [language]);

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
            alert("Team ID not found. Please login again.");
            return;
        }

        const code = codeMap[language] || "";
        setIsRunning(true);
        setTestResults({});
        setHiddenTestResult(null);

        try {
            const response = await fetch(`${BASE_URL}/api/public/crack-code/run`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ teamId, language, code }),
            });
            const data = await response.json();

            if (!response.ok) {
                const failed = {};
                testCases.forEach((_, i) => {
                    failed[i] = { log: data.message || "Execution failed", result: "Error", isCorrect: false, status: "error" };
                });
                setTestResults(failed);
                return;
            }

            const results = {};
            data.results.forEach((r, i) => { results[i] = { ...r, status: "success" }; });
            setTestResults(results);

            if (data.hiddenPassed === true) setHiddenTestResult("Hidden Test Case Passed!");
            else if (data.hiddenPassed === false) setHiddenTestResult("Hidden Test Case Failed");

            setLastValidated(data.validated ? { language, code } : null);
        } catch (error) {
            const failed = {};
            testCases.forEach((_, i) => {
                failed[i] = { log: "Network Error", result: error.message, isCorrect: false, status: "error" };
            });
            setTestResults(failed);
        } finally {
            setIsRunning(false);
        }
    }, [language, codeMap, testCases]);

    const handleSubmit = React.useCallback(async (isAutoSubmit = false) => {
        const teamId = localStorage.getItem("teamId");
        if (!teamId || !sessionId) {
            if (!isAutoSubmit) alert("Session information missing.");
            return;
        }

        setIsSubmitting(true);
        try {
            const response = await fetch(`${BASE_URL}/api/public/crack-code/submit`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    teamId,
                    sessionId: sessionId,
                    submittedLogic: codeMap[language] || "",
                    language,
                    autoSubmit: isAutoSubmit
                }),
            });

            const data = await response.json();
            if (response.ok) {
                setSubmissionResult({
                    isFirst: data.isFirst,
                    message: data.message
                });
            } else {
                if (!isAutoSubmit) alert(data.message || "Submission failed");
            }
        } catch (error) {
            console.error("Submission error:", error);
            if (!isAutoSubmit) alert("Network error during submission");
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
        && lastValidated.code === codeMap[language];

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
                    setTestCases(sessionData.question.testCases || []);
                    setCodeMap(sessionData.question.starterCode || {});
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
                />

                <RightPanel
                    language={language}
                    code={codeMap[language] || ""}
                    isRunning={isRunning}
                    isSubmitting={isSubmitting}
                    isSubmitEnabled={isSubmitEnabled}
                    activeTestCase={activeTestCase}
                    testResults={testResults}
                    handleLanguageChange={handleLanguageChange}
                    handleRun={handleRun}
                    handleSubmit={handleSubmit}
                    handleCodeChange={handleCodeChange}
                    handleEditorDidMount={handleEditorDidMount}
                    security={security}
                />
            </div>
        </div>
    );
};

// --- Memoized Panel Components ---

const LeftPanel = React.memo(({ testCases, activeTestCase, setActiveTestCase, testResults, hiddenTestResult }) => {
    return (
        <div className="panel left-panel">
            <div className="panel-header">
                <h2>Testcases</h2>
            </div>
            <div className="testcase-tabs">
                {testCases.map((_, index) => {
                    const result = testResults[index];
                    let statusClass = '';
                    if (result) {
                        statusClass = result.isCorrect ? 'success' : 'error';
                    }

                    return (
                        <button
                            key={index}
                            className={`tab-btn ${activeTestCase === index ? 'active' : ''} ${statusClass}`}
                            onClick={() => setActiveTestCase(index)}
                            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                        >
                            Case {index + 1}
                            {result?.isCorrect !== undefined && (
                                <span style={{
                                    color: result.isCorrect ? '#28a745' : '#dc3545',
                                    fontSize: '1.2em'
                                }}>
                                    {result.isCorrect ? '✔' : '✘'}
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>
            <div className="testcase-content">
                <div className="io-group">
                    <span className="label">Input =</span>
                    <div className="io-box">{testCases[activeTestCase]?.input}</div>
                </div>
                <div className="io-group">
                    <span className="label">Output =</span>
                    <div className="io-box">{testCases[activeTestCase]?.output}</div>
                </div>
            </div>

            {hiddenTestResult && (
                <div style={{
                    padding: '15px',
                    margin: '10px 20px',
                    background: hiddenTestResult.includes('Passed') ? 'rgba(40, 167, 69, 0.2)' : 'rgba(220, 53, 69, 0.2)',
                    border: `1px solid ${hiddenTestResult.includes('Passed') ? '#28a745' : '#dc3545'}`,
                    borderRadius: '8px',
                    color: hiddenTestResult.includes('Passed') ? '#28a745' : '#dc3545',
                    fontWeight: 'bold',
                    textAlign: 'center'
                }}>
                    {hiddenTestResult}
                </div>
            )}
        </div>
    );
});

const RightPanel = React.memo(({
    language, code, isRunning, isSubmitting, isSubmitEnabled,
    activeTestCase, testResults, handleLanguageChange, handleRun,
    handleSubmit, handleCodeChange, handleEditorDidMount,
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
        setLocalCode(value);
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
                    <select value={language} onChange={handleLanguageChange}>
                        <option value="python">Python</option>
                        <option value="cpp">C++</option>
                        <option value="javascript">JavaScript</option>
                        <option value="java">Java</option>
                    </select>
                </div>
                <div className="actions">
                    <button className="btn run-btn" onClick={handleRun} disabled={isRunning}>
                        {isRunning ? (
                            <div className="loading-container">
                                <div className="loading-bar"></div>
                            </div>
                        ) : 'Run'}
                    </button>
                    <button
                        className="btn submit-btn"
                        onClick={() => handleSubmit()}
                        disabled={!isSubmitEnabled || isSubmitting}
                        title={!isSubmitEnabled ? "Pass all test cases (including hidden) to submit" : "Submit your code"}
                    >
                        {isSubmitting ? "Uploading..." : "Submit"}
                    </button>
                </div>
            </div>
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

            <div className="output-section">

                <div className="console-box">
                    <div style={{ color: '#aaa', marginBottom: '5px', fontSize: '0.85rem' }}>Console Output:</div>
                    <pre style={{ margin: 0, color: '#e0e0e0' }}>
                        {testResults[activeTestCase]?.log || "Run code to see output..."}
                    </pre>
                </div>
                <div className="result-box" style={{
                    border: testResults[activeTestCase]?.isCorrect === undefined
                        ? '1px solid rgba(255, 255, 255, 0.1)'
                        : (testResults[activeTestCase]?.isCorrect ? '2px solid #28a745' : '2px solid #dc3545')
                }}>
                    <div style={{ color: '#aaa', marginBottom: '5px', fontSize: '0.85rem' }}>Return Value:</div>
                    <pre style={{ margin: 0, color: '#e0e0e0' }}>
                        {testResults[activeTestCase]?.result || ""}
                    </pre>
                </div>
            </div>
        </div>
    );
});

export default CrackTheCode;
