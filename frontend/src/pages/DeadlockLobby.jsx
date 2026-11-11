import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import useSecurity from '../hooks/useSecurity';
import SceneBackground from '../components/Background/SceneBackground';
import TleLogo from '../components/TLE/TleLogo';
import celestiusLogo from '../assets/celestius-logo.png';
import larperOrCoderImg from '../assets/larper-or-coder.png';
import './DeadlockLobby.css';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "";

// Lightweight typing effect for matchmaking queue
const ScanningTypingStatus = ({ isMatchFound, opponentName }) => {
    const [text, setText] = useState('');
    const fullText = "SCANNING FOR DUO";

    useEffect(() => {
        if (isMatchFound) {
            setText(`MATCH FOUND // VS ${opponentName || 'OPFOR'}`);
            return;
        }

        let currentLength = 0;
        let isDeleting = false;
        let timer;

        const loop = () => {
            if (!isDeleting) {
                currentLength++;
                setText(fullText.slice(0, currentLength));
                if (currentLength === fullText.length) {
                    timer = setTimeout(() => {
                        isDeleting = true;
                        loop();
                    }, 1400);
                    return;
                }
                timer = setTimeout(loop, 90);
            } else {
                currentLength--;
                setText(fullText.slice(0, currentLength));
                if (currentLength === 0) {
                    isDeleting = false;
                    timer = setTimeout(loop, 400);
                    return;
                }
                timer = setTimeout(loop, 50);
            }
        };

        loop();
        return () => clearTimeout(timer);
    }, [isMatchFound, opponentName]);

    return (
        <div className={`scanning-typing-container ${isMatchFound ? 'matched' : ''}`}>
            <span className="scanning-typing-text">{text}</span>
            <span className="scanning-typing-cursor">_</span>
        </div>
    );
};

const DeadlockLobby = ({ onMatchFound }) => {
    const teamName = localStorage.getItem('teamName') || 'UNKNOWN DUO';
    const { security } = useSecurity(teamName);

    const navigate = useNavigate();
    const [statusLoading, setStatusLoading] = useState(true);
    const [teamStatus, setTeamStatus] = useState(null);
    const [matchInfo, setMatchInfo] = useState(null);

    const storedMembers = localStorage.getItem('teamMembers');
    const apiMembers = teamStatus?.members;
    const members = useMemo(() => {
        if (Array.isArray(apiMembers) && apiMembers.length > 0) {
            return apiMembers;
        }
        try {
            return storedMembers ? JSON.parse(storedMembers) : [];
        } catch {
            return [];
        }
    }, [apiMembers, storedMembers]);

    const displayTeamName = teamStatus?.name || teamName;

    useEffect(() => {
        document.title = "LOBBY // TUG OF AURA // Celestius";
        const teamId = localStorage.getItem("teamId");
        if (!teamId) {
            setStatusLoading(false);
            return;
        }

        const pollMatchStatus = async () => {
            try {
                // 1. Check Team Status (with cache busting)
                const teamRes = await fetch(`${BASE_URL}/api/public/crack-code/team-status/${teamId}?cb=${Date.now()}`);
                if (teamRes.ok) {
                    const data = await teamRes.json();
                    setTeamStatus(data);

                    if (Array.isArray(data.members) && data.members.length > 0) {
                        localStorage.setItem('teamMembers', JSON.stringify(data.members));
                    }
                    if (data.name) {
                        localStorage.setItem('teamName', data.name);
                    }

                    if (data.currentRound === 'crack-the-code' || data.currentRound === 'eliminated') {
                        navigate('/crackTheCode');
                        return;
                    }
                }

                // 2. Check Match Assignment
                const matchRes = await fetch(`${BASE_URL}/api/public/deadlock/match/team/${teamId}?cb=${Date.now()}`);
                if (matchRes.ok) {
                    const data = await matchRes.json();

                    if (data.matchId) {
                        setMatchInfo(data);

                        // Update LocalStorage per game requirements
                        if (data.team) {
                            localStorage.setItem("team", data.team);
                        }
                        if (data.matchId) {
                            localStorage.setItem("deadlockContext", JSON.stringify({ matchId: data.matchId }));
                        }

                        setStatusLoading(false);

                        if (data.status === 'lobby' || data.status === 'ongoing') {
                            if (onMatchFound) onMatchFound(data);
                            // Brief delay so players see the match confirmation before warping
                            setTimeout(() => {
                                navigate("/deadlock/game");
                            }, 1600);
                        }
                    } else {
                        // No match yet, stay in waiting state
                        setStatusLoading(false);
                    }
                }
            } catch (error) {
                console.error("Matchmaking Polling Error:", error);
                setStatusLoading(false);
            }
        };

        pollMatchStatus();
        const intervalId = setInterval(pollMatchStatus, 2000);
        return () => clearInterval(intervalId);
    }, [onMatchFound, navigate]);

    if (statusLoading) {
        return (
            <div className="lobby-viewport initializing">
                <SceneBackground />
                <div className="lobby-loader-box">
                    <div className="lobby-radar-pulse"></div>
                    <div className="lobby-loader-text">INITIALIZING AURA GRID...</div>
                    <div className="lobby-loader-sub">CALIBRATING QUANTUM FREQUENCY</div>
                </div>
            </div>
        );
    }

    const isMatchFound = Boolean(matchInfo && matchInfo.matchId);

    return (
        <div className="lobby-viewport">
            {/* Ambient code glyph particle background */}
            <SceneBackground />

            {/* Top Navbar */}
            <header className="lobby-navbar">
                <div className="navbar-brand-left">
                    <img src={celestiusLogo} alt="Celestius" className="celestius-nav-logo" />
                </div>
                <div className="navbar-center-tag">
                    <span className="navbar-round-chip">
                        <span>ROUND 01</span>
                    </span>
                    <span className="navbar-round-sep" aria-hidden="true">//</span>
                    <span className="navbar-tag-text">TUG OF AURA</span>
                    <span className="live-pulse-dot" aria-hidden="true" />
                </div>
                <div className="navbar-brand-right">
                    <img src={larperOrCoderImg} alt="LARPER OR CODER" className="larper-coder-nav-logo" />
                </div>
            </header>

            {/* Scrollable / Responsive Container */}
            <main className="lobby-main-container">
                {/* Center TLE Title Branding */}
                <div className="lobby-hero-title">
                    <TleLogo showBadge={false} />
                </div>

                {/* Matchmaking Status: Typing effect of "SCANNING FOR DUO" only */}
                <ScanningTypingStatus
                    isMatchFound={isMatchFound}
                    opponentName={matchInfo?.opponentName}
                />

                {/* Duos Versus Stage */}
                <section className="duo-versus-stage">
                    {/* Your Duo Card */}
                    <div className="duo-card player-duo">
                        <span className="duo-corner tl" aria-hidden="true" />
                        <span className="duo-corner tr" aria-hidden="true" />
                        <span className="duo-corner bl" aria-hidden="true" />
                        <span className="duo-corner br" aria-hidden="true" />

                        <div className="duo-card-header">
                            <span className="duo-tag-parallelogram">
                                <span>YOUR DUO</span>
                            </span>
                            <span className="duo-aura-indicator">AURA 100%</span>
                        </div>
                        <h2 className="duo-team-name">
                            <span className="duo-team-name-text">{displayTeamName}</span>
                            <span className="duo-team-underscore" aria-hidden="true" />
                        </h2>
                        <div className="duo-members-list">
                            <div className="homie-chip">
                                <span className="homie-idx">01</span>
                                <span className="homie-name">{members[0] || 'Homie 1'}</span>
                            </div>
                            <div className="homie-chip">
                                <span className="homie-idx">02</span>
                                <span className="homie-name">{members[1] || 'Homie 2'}</span>
                            </div>
                        </div>
                        <div className="duo-card-footer">
                            <span className="duo-status-dot ready" />
                            <span className="duo-status-text">LOCKED IN &amp; READY</span>
                        </div>
                    </div>

                    {/* VS Energy Node */}
                    <div className="versus-node">
                        <div className="versus-ring">
                            <span className="versus-text">VS</span>
                        </div>
                        <div className="versus-beam" />
                    </div>

                    {/* Opponent Duo Card */}
                    <div className={`duo-card opponent-duo ${isMatchFound ? 'matched' : 'searching'}`}>
                        <span className="duo-corner tl opfor" aria-hidden="true" />
                        <span className="duo-corner tr opfor" aria-hidden="true" />
                        <span className="duo-corner bl opfor" aria-hidden="true" />
                        <span className="duo-corner br opfor" aria-hidden="true" />

                        <div className="duo-card-header">
                            <span className="duo-tag-parallelogram opfor">
                                <span>OPFOR DUO</span>
                            </span>
                            <span className="duo-aura-indicator opfor">
                                {isMatchFound ? 'AURA 100%' : 'SCANNING...'}
                            </span>
                        </div>
                        <h2 className="duo-team-name opfor">
                            <span className="duo-team-name-text">
                                {isMatchFound ? matchInfo.opponentName : '[ SEARCHING CHALLENGER ]'}
                            </span>
                            <span className="duo-team-underscore opfor" aria-hidden="true" />
                        </h2>
                        <div className="duo-members-list">
                            <div className="homie-chip opfor">
                                <span className="homie-idx">01</span>
                                <span className="homie-name">
                                    {isMatchFound ? (matchInfo?.opponentMembers?.[0] || 'Opponent 1') : 'Awaiting Match...'}
                                </span>
                            </div>
                            <div className="homie-chip opfor">
                                <span className="homie-idx">02</span>
                                <span className="homie-name">
                                    {isMatchFound ? (matchInfo?.opponentMembers?.[1] || 'Opponent 2') : 'Awaiting Match...'}
                                </span>
                            </div>
                        </div>
                        <div className="duo-card-footer">
                            <span className={`duo-status-dot ${isMatchFound ? 'ready' : 'pulsing'}`} />
                            <span className="duo-status-text">
                                {isMatchFound ? 'OPFOR LOCKED IN' : 'CONNECTING LIVE DUO...'}
                            </span>
                        </div>
                    </div>
                </section>
            </main>
        </div>
    );
};

export default DeadlockLobby;
