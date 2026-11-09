import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import DeadlockHeader from '../components/deadlock/DeadlockHeader';
import TugOfWarArena from '../components/deadlock/TugOfWarArena';
import QuestionPanel from '../components/deadlock/QuestionPanel';
import CodePanel from '../components/deadlock/CodePanel';
import SubmissionPanel from '../components/deadlock/SubmissionPanel';
import ResultOverlay from '../components/deadlock/ResultOverlay';
import WinnerBackground from '../components/deadlock/WinnerBackground';
import LoserBackground from '../components/deadlock/LoserBackground';
import ScannerLoader from '../components/Loader/ScannerLoader';
import '../components/deadlock/deadlock.css';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "";

import useSecurity from '../hooks/useSecurity';

const DeadlockPage = () => {
    const teamName = localStorage.getItem('teamName') || 'UNKNOWN';
    const { security, reportAction } = useSecurity(teamName);

    const context = JSON.parse(localStorage.getItem('deadlockContext') || '{}');

    const matchId = context.matchId;
    const navigate = useNavigate();

    // Game State
    const [match, setMatch] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isDismissed, setIsDismissed] = useState(false);
    const [tugPosition, setTugPosition] = useState(0);
    const [currentQuestion, setCurrentQuestion] = useState(null);

    // User State
    const [teamId, setTeamId] = useState(null);

    // Submission State
    const [language, setLanguage] = useState("python");
    const [codes, setCodes] = useState({
        python: "",
        cpp: "",
        java: ""
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submissionResult, setSubmissionResult] = useState(null);
    const lastQuestionIndex = React.useRef(-1);
    const isFetching = React.useRef(false);
    const isSubmittingRef = React.useRef(false);
    const submissionResultRef = React.useRef(null);

    // Sync refs with state
    useEffect(() => {
        isSubmittingRef.current = isSubmitting;
    }, [isSubmitting]);

    useEffect(() => {
        submissionResultRef.current = submissionResult;
    }, [submissionResult]);

    const handleCloseOverlay = useCallback(() => {
        setSubmissionResult(null);
    }, []);

    const fetchMatchState = useCallback(async () => {
        if (isFetching.current || isSubmittingRef.current) return;
        isFetching.current = true;
        try {
            const res = await axios.get(`${BASE_URL}/api/public/deadlock/match/${matchId}`);
            const data = res.data;

            // Detect if question advanced (opponent solved it)
            if (lastQuestionIndex.current !== -1 && data.currentQuestionIndex > lastQuestionIndex.current) {
                // If we aren't currently submitting AND we don't already have a local AC being displayed, show "Too Slow!"
                if (!isSubmittingRef.current && submissionResultRef.current?.verdict !== "AC") {
                    setSubmissionResult({ verdict: "CONFLICT", error: "Opponent solved it first!" });
                }
            }
            lastQuestionIndex.current = data.currentQuestionIndex;

            setMatch(prev => {
                if (JSON.stringify(prev) === JSON.stringify(data)) return prev;
                return data;
            });
            setTugPosition(data.tugPosition);
            setCurrentQuestion(prev => {
                if (prev?._id === data.currentQuestion?._id) return prev;
                return data.currentQuestion;
            });

            const storedTeamId = localStorage.getItem('teamId');
            if (storedTeamId) {
                setTeamId(storedTeamId);
                // Sync teamName if missing or update it
                if (data.teamA._id === storedTeamId) {
                    localStorage.setItem('teamName', data.teamA.name);
                } else if (data.teamB._id === storedTeamId) {
                    localStorage.setItem('teamName', data.teamB.name);
                }
            }

            setLoading(false);
        } catch (err) {
            if (err.response && err.response.status === 404) {
                setIsDismissed(true);
            } else {
                setError(err.response?.data?.message || "Failed to load match");
            }
            setLoading(false);
        } finally {
            isFetching.current = false;
        }
    }, [matchId]);

    useEffect(() => {
        if (match?.status === 'finished') return;

        fetchMatchState();
        const interval = setInterval(fetchMatchState, 500);
        return () => clearInterval(interval);
    }, [fetchMatchState, match?.status]);

    useEffect(() => {
        if (!currentQuestion) return;

        // Use templates from the question object
        setCodes({
            python: currentQuestion.templates?.python || "",
            cpp: currentQuestion.templates?.cpp || "",
            java: currentQuestion.templates?.java || ""
        });
    }, [currentQuestion?._id]);

    const handleCodeSubmit = async () => {
        if (!teamId) {
            alert("No team identified. Please join properly.");
            return;
        }

        setIsSubmitting(true);
        setSubmissionResult(null);

        try {
            const payload = {
                matchId,
                teamId,
                questionId: currentQuestion._id,
                language,
                code: codes[language]
            };

            const res = await axios.post(`${BASE_URL}/api/public/deadlock/submit`, payload);

            if (res.status === 200) {
                const data = res.data;
                if (data.success) {
                    setSubmissionResult({ verdict: "AC" });
                    setTugPosition(data.tugPosition);
                    // Update ref immediately to prevent poller race condition
                    lastQuestionIndex.current = data.nextQuestionIndex;

                    if (data.status === 'finished') {
                        setMatch(prev => ({
                            ...prev,
                            status: 'finished',
                            winner: data.winner,
                            loser: data.loser,
                            scoreA: data.scoreA,
                            scoreB: data.scoreB,
                            tugPosition: data.tugPosition
                        }));
                    } else {
                        fetchMatchState();
                    }
                } else {
                    setSubmissionResult({
                        verdict: data.verdict,
                        error: data.error
                    });
                }
            }
        } catch (err) {
            if (err.response && err.response.status === 409) {
                setSubmissionResult({ verdict: "CONFLICT", error: "The question has changed!" });
                fetchMatchState();
            } else {
                setSubmissionResult({ verdict: "ERROR", error: "Submission failed" });
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loading) {
        return (
            <ScannerLoader
                titleOverride="CALIBRATING ARENA"
                subOverride="> [TUG OF AURA] SYNCING ENGINE & TEST CASES"
            />
        );
    }
    if (error) return <div className="error-screen">{error}</div>;
    if (!match) return null;

    if (isDismissed) {
        return <DismissedView />;
    }

    if (match.status === 'finished') {
        return <ResultView match={match} teamId={teamId} userTeam={localStorage.getItem('team')} />;
    }

    return (
        <div className="deadlock-container">
            <div className="cyber-grid-bg"></div>
            <DeadlockHeader
                teamA={match.teamA}
                teamB={match.teamB}
                status={match.status}
                winner={match.winner}
                userTeam={localStorage.getItem('team')}
                scoreA={match.scoreA}
                scoreB={match.scoreB}
            />

            <TugOfWarArena
                tugPosition={tugPosition}
                maxPull={match.maxPull || 4}
            />

            <div className="game-lower-section">
                <QuestionPanel
                    question={currentQuestion}
                />

                <div className="editor-section">
                    <CodePanel
                        code={codes[language]}
                        setCode={(newCode) => setCodes(prev => ({ ...prev, [language]: newCode }))}
                        language={language}
                        setLanguage={setLanguage}
                        isLocked={match.status === 'finished' || isSubmitting}
                    />
                    <SubmissionPanel
                        onSubmit={handleCodeSubmit}
                        isSubmitting={isSubmitting}
                    />
                </div>
            </div>

            <ResultOverlay
                result={submissionResult}
                onClose={handleCloseOverlay}
            />
        </div>
    );
};

const ResultView = ({ match, teamId, userTeam }) => {
    const getTeamId = (team) => team?._id || team;
    const winnerId = getTeamId(match.winner);

    // Check winner against both string ID and team side (A/B)
    const isWinner = (winnerId && teamId && winnerId === teamId) ||
        (userTeam === 'A' && winnerId === getTeamId(match.teamA)) ||
        (userTeam === 'B' && winnerId === getTeamId(match.teamB));

    const teamName = localStorage.getItem('teamName') || (userTeam === 'A' ? "ALPHA" : "OMEGA");

    if (isWinner) {
        return (
            <div className="v2-emergency-fix winner-view">
                <WinnerBackground />
                <div className="cyber-grid-bg"></div>
                <div className="winner-container">
                    <div className="victory-crown">👑</div>
                    <h1 className="result-title winner-text title-v2">
                        MISSION ACCOMPLISHED
                    </h1>
                    <p className="result-subtitle">CONGRATULATIONS, TEAM {teamName}. YOU QUALIFIED FOR NEXT ROUND.</p>

                    <div className="mission-details table-v2">
                        <div className="detail-line">
                            <span className="detail-label">PROTOCOL:</span>
                            <span className="detail-value" style={{ color: '#00ff41' }}>DOMINATION_SUCCESS</span>
                        </div>
                        <div className="detail-line">
                            <span className="detail-label">ALPHA_SCORE:</span>
                            <span className="detail-value">{match.scoreA}</span>
                        </div>
                        <div className="detail-line">
                            <span className="detail-label">OMEGA_SCORE:</span>
                            <span className="detail-value">{match.scoreB}</span>
                        </div>
                    </div>

                    <div className="button-v2">
                        <a href="/crackTheCode" className="cyber-btn winner-btn">
                            CONTINUE TO DECRYPTION
                        </a>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="v2-emergency-fix loser-view">
            <LoserBackground />
            <div className="cyber-grid-bg"></div>
            <div className="loser-container">
                <h1 className="result-title loser-text title-v2">
                    CONNECTION SEVERED
                </h1>
                <p className="result-subtitle">THANK YOU FOR YOUR SERVICE, {teamName}.</p>

                <div className="mission-details red-details">
                    <div className="detail-line">
                        <span className="detail-label">STATUS:</span>
                        <span className="detail-value" style={{ color: '#ff4757' }}>ACCESS_REVOKED</span>
                    </div>
                    <div className="detail-line">
                        <span className="detail-label">FINAL_STRENGTH:</span>
                        <span className="detail-value">{userTeam === 'A' ? match.scoreA : match.scoreB}</span>
                    </div>
                </div>

                <div className="revoked-msg">
                    <p>Terminal session has been terminated by the central core.</p>
                </div>

                <div className="button-v2">
                    <a href="/crackTheCode" className="cyber-btn participation-btn">
                        END GAME SESSION
                    </a>
                </div>
            </div>
        </div>
    );
};

const DismissedView = () => {
    const navigate = useNavigate();
    const [countdown, setCountdown] = useState(5);

    useEffect(() => {
        const timer = setInterval(() => {
            setCountdown(prev => {
                if (prev <= 1) {
                    clearInterval(timer);
                    navigate('/deadlock/lobby');
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, [navigate]);

    return (
        <div className="v2-emergency-fix dismissed-view">
            <div className="cyber-grid-bg"></div>
            <div className="dismissed-container">
                <div className="warning-icon">⚠️</div>
                <h1 className="result-title winner-text title-v2 warning-text">
                    MATCH DISMISSED BY ADMIN
                </h1>
                <p className="result-subtitle">THE TERMINAL SESSION HAS BEEN REVOKED BY CENTRAL CONTROL.</p>

                <div className="dismissed-status">
                    <div className="status-pulse"></div>
                    <span>Returning to lobby safely in {countdown}s...</span>
                </div>

                <div className="progress-track">
                    <div className="progress-fill" style={{ width: `${(countdown / 5) * 100}%` }}></div>
                </div>

                <button className="cyber-btn winner-btn" onClick={() => navigate('/deadlock/lobby')}>
                    RETURN TO LOBBY NOW
                </button>
            </div>
        </div>
    );
};

export default DeadlockPage;
