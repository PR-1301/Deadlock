import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import SceneBackground from '../components/Background/SceneBackground';
import celestiusLogo from '../assets/celestius-logo.png';
import larperOrCoderImg from '../assets/larper-or-coder.png';
import './CrackCodeLobby.css';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || `http://${window.location.hostname}:5000`;

const CrackCodeLobby = ({ onGameReady }) => {
    const navigate = useNavigate();
    const [gameStatusLoading, setGameStatusLoading] = useState(true);
    const [teamStatus, setTeamStatus] = useState(null);
    const [globalStarted, setGlobalStarted] = useState(false);

    const teamId = localStorage.getItem("teamId");
    const teamName = localStorage.getItem("teamName") || "ALPHA DUO";

    const storedMembers = localStorage.getItem('teamMembers');
    const members = useMemo(() => {
        try {
            return storedMembers ? JSON.parse(storedMembers) : [];
        } catch {
            return [];
        }
    }, [storedMembers]);

    useEffect(() => {
        document.title = "ROUND 02 // WHO'S THE GOAT? // Celestius";
        if (!teamId) {
            setGameStatusLoading(false);
            return;
        }

        const pollEverything = async () => {
            try {
                // 1. Fetch Global Round 02 Status
                const globalRes = await fetch(`${BASE_URL}/api/public/crack-code/global-status?cb=${Date.now()}`);
                if (globalRes.ok) {
                    const data = await globalRes.json();
                    setGlobalStarted(data.started);
                }

                // 2. Fetch Duo Match Status
                let currentTeamStatus = teamStatus;
                const teamRes = await fetch(`${BASE_URL}/api/public/crack-code/team-status/${teamId}?cb=${Date.now()}`);
                if (teamRes.ok) {
                    const data = await teamRes.json();
                    currentTeamStatus = data;
                    setTeamStatus(data);
                }

                // 3. Check Session Eligibility and Transition
                const isEligible = currentTeamStatus?.deadlockResult === 'win' || currentTeamStatus?.deadlockResult === 'winner';

                if (isEligible) {
                    const sessionRes = await fetch(`${BASE_URL}/api/public/crack-code/session/${teamId}?cb=${Date.now()}`);
                    if (sessionRes.ok) {
                        const data = await sessionRes.json();
                        onGameReady(data);
                    } else if (sessionRes.status === 403 || sessionRes.status === 404) {
                        setGameStatusLoading(false);
                    }
                } else if (currentTeamStatus && currentTeamStatus.deadlockResult !== 'pending') {
                    // Team is either 'lose' or 'eliminated'
                    setGameStatusLoading(false);
                }
            } catch (error) {
                console.error("Crack The Code Lobby Polling Error:", error);
                setGameStatusLoading(false);
            }
        };

        // Initial check
        pollEverything();

        // Polling interval
        const intervalId = setInterval(pollEverything, 2000);
        return () => clearInterval(intervalId);
    }, [teamId, onGameReady]);

    if (gameStatusLoading) {
        return (
            <div className="crack-lobby-viewport initializing">
                <SceneBackground />
                <div className="crack-lobby-loading-box">
                    <div className="crack-radar-pulse" />
                    <div className="crack-loader-title">INITIALIZING WHO'S THE GOAT?...</div>
                    <div className="crack-loader-sub">CALIBRATING DUO CLEARANCE & SESSION MATRIX</div>
                </div>
            </div>
        );
    }

    const result = teamStatus?.deadlockResult;
    const isWinner = result === 'win' || result === 'winner';
    const isLoser = result === 'lose';
    const isWaiting = !result || result === 'pending';

    return (
        <div className="crack-lobby-viewport">
            {/* Ambient code glyph particle background */}
            <SceneBackground />

            {/* Top Navbar matching the rest of the platform */}
            <header className="crack-lobby-navbar">
                <div className="navbar-brand-left">
                    <img src={celestiusLogo} alt="Celestius" className="celestius-nav-logo" />
                </div>
                <div className="navbar-center-tag">
                    <span className={`live-pulse-dot ${isWinner ? 'active' : isLoser ? 'error' : 'pending'}`} />
                    <span className="navbar-tag-text">ROUND 02 // WHO'S THE GOAT?</span>
                </div>
                <div className="navbar-brand-right">
                    <img src={larperOrCoderImg} alt="LARPER OR CODER" className="larper-coder-nav-logo" />
                </div>
            </header>

            {/* Main Stage */}
            <main className="crack-lobby-main">
                {/* Hero Section */}
                <div className="crack-lobby-hero">
                    <div className="hero-phase-badge">
                        <span className="badge-dot" />
                        <span>LOGIC DECRYPTION PROTOCOL</span>
                    </div>
                    <h1 className="hero-title">Who's the GOAT?</h1>
                    <div className="hero-status-tag">
                        {isWinner ? (
                            globalStarted ? (
                                <span className="status-highlight ready">
                                    [ SESSION READY // WARPING INTO DECRYPTION PROTOCOL ]
                                </span>
                            ) : (
                                <span className="status-highlight standby">
                                    [ QUALIFIED DUO VERIFIED // AWAITING REFEREE SIGNAL ]
                                </span>
                            )
                        ) : isLoser ? (
                            <span className="status-highlight terminated">
                                [ ROUND 01 CONCLUDED // SESSION FINISHED ]
                            </span>
                        ) : (
                            <span className="status-highlight waiting">
                                [ STANDBY // SYNCHRONIZING WITH CENTRAL SERVER ]
                            </span>
                        )}
                    </div>
                </div>

                {/* 2-Column Content Grid */}
                <div className="crack-lobby-grid">
                    {/* Left Column: Team Dossier & Telemetry Core */}
                    <div className="crack-column-left">
                        {/* Duo Dossier Card */}
                        <div className="crack-card dossier-card">
                            <div className="card-top-bar">
                                <span className="card-sub-tag">UNIT DOSSIER</span>
                                <span className={`card-status-pill ${isWinner ? 'winner' : isLoser ? 'loser' : 'pending'}`}>
                                    {isWinner ? 'QUALIFIED // ROUND 02' : isLoser ? 'ROUND 01 COMPLETED' : 'AWAITING AUDIT'}
                                </span>
                            </div>

                            <div className="team-header-row">
                                <div className="team-avatar-badge">
                                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                                        <circle cx="9" cy="7" r="4" />
                                        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                                        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                                    </svg>
                                </div>
                                <div className="team-meta-info">
                                    <span className="team-meta-label">DUO NAME</span>
                                    <h2 className="team-display-name">{teamName}</h2>
                                </div>
                            </div>

                            {/* Duo Operatives Chips */}
                            <div className="team-operatives-group">
                                <span className="operatives-label">REGISTERED DUO OPERATIVES</span>
                                <div className="operatives-list">
                                    <div className="operative-chip">
                                        <span className="operative-idx">01</span>
                                        <span className="operative-name">{members[0] || 'Operative 1'}</span>
                                    </div>
                                    <div className="operative-chip">
                                        <span className="operative-idx">02</span>
                                        <span className="operative-name">{members[1] || 'Operative 2'}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Status Information Box */}
                            <div className={`qualification-banner ${isWinner ? 'winner' : isLoser ? 'loser' : 'standby'}`}>
                                <div className="banner-icon">
                                    {isWinner ? (
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3DDC84" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                            <polyline points="20 6 9 17 4 12" />
                                        </svg>
                                    ) : isLoser ? (
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FF4757" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                            <line x1="18" y1="6" x2="6" y2="18" />
                                            <line x1="6" y1="6" x2="18" y2="18" />
                                        </svg>
                                    ) : (
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#F5A21F" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                            <circle cx="12" cy="12" r="10" />
                                            <polyline points="12 6 12 12 16 14" />
                                        </svg>
                                    )}
                                </div>
                                <div className="banner-content">
                                    <div className="banner-title">
                                        {isWinner
                                            ? (globalStarted ? 'SESSION ACTIVE // ACCESS UNLOCKED' : 'QUALIFICATION VERIFIED')
                                            : isLoser
                                                ? 'MISSION FINISHED'
                                                : 'AWAITING ARENA RESULT'}
                                    </div>
                                    <div className="banner-desc">
                                        {isWinner
                                            ? (globalStarted
                                                ? 'Decryption environment is ready. Synchronizing problem logic...'
                                                : 'Your victory in Round 01 is confirmed. Waiting for central referee to globally begin Round 02.')
                                            : isLoser
                                                ? 'Great fight in Round 01. Your team is not advancing to Round 02.'
                                                : 'Match results are currently being recorded and confirmed.'}
                                    </div>
                                </div>
                            </div>

                            {isLoser && (
                                <div className="dossier-actions">
                                    <button onClick={() => navigate('/')} className="exit-lobby-btn">
                                        EXIT TO HOME
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right Column: Qualification Announcement or Farewell Card */}
                    <div className="crack-column-right">
                        {(!globalStarted || isWinner) && !isLoser ? (
                            <div className="crack-card qualified-card">
                                <div className="card-top-bar">
                                    <span className="card-sub-tag">ROUND 02 CLEARANCE</span>
                                    <span className="card-status-pill winner">QUALIFIED</span>
                                </div>

                                <div className="qualified-card-content">
                                    <div className="qualified-trophy-badge">
                                        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#F5A21F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
                                            <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
                                            <path d="M4 22h16" />
                                            <path d="M10 14.66V17c0 .55-.45 1-1 1H7c-.55 0-1-.45-1-1v-2.34" />
                                            <path d="M14 14.66V17c0 .55.45 1 1 1h2c.55 0 1-.45 1-1v-2.34" />
                                            <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
                                        </svg>
                                    </div>

                                    <h2 className="qualified-title">CONGRATULATIONS!</h2>
                                    <p className="qualified-main-msg">
                                        YOU ARE QUALIFIED FOR THE NEXT ROUND.
                                    </p>

                                    <div className="qualified-wait-box">
                                        <div className="wait-box-pulse">
                                            <span className="wait-pulse-ring" />
                                            <span className="wait-pulse-core" />
                                        </div>
                                        <div className="wait-box-text">
                                            <div className="wait-box-primary">WAIT UNTIL THE ADMIN LETS YOU IN.</div>
                                            <div className="wait-box-secondary">
                                                Session is locked until referee authorizes round launch. Editor will initialize automatically.
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="directives-card-footer">
                                    <div className="footer-status-item">
                                        <span className="footer-dot green" />
                                        <span>INTEGRITY MONITOR: ACTIVE</span>
                                    </div>
                                    <div className="footer-status-item">
                                        <span className="footer-dot yellow" />
                                        <span>STANDBY // AWAITING HOST SIGNAL</span>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="crack-card farewell-card">
                                <div className="farewell-badge">
                                    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#F5A21F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
                                        <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
                                        <path d="M4 22h16" />
                                        <path d="M10 14.66V17c0 .55-.45 1-1 1H7c-.55 0-1-.45-1-1v-2.34" />
                                        <path d="M14 14.66V17c0 .55.45 1 1 1h2c.55 0 1-.45 1-1v-2.34" />
                                        <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
                                    </svg>
                                </div>
                                <h2 className="farewell-title">THANK YOU FOR COMPETING</h2>
                                <p className="farewell-subtitle">
                                    CELESTIUS 2026 // LARPER OR CODER
                                </p>
                                <div className="farewell-description">
                                    Your duo fought hard in Round 01. Results have been finalized and recorded in the central tournament registry.
                                </div>
                                <div className="farewell-actions">
                                    <button onClick={() => navigate('/')} className="exit-lobby-btn primary">
                                        RETURN TO HOMEPAGE &rarr;
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
};

export default CrackCodeLobby;
