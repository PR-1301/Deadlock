import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    getTeams,
    getMatches,
    purgeMatches,
    createMatch,
    updateMatchTeams,
    swapMatchTeams,
    resetMatch,
    finishMatch,
    startAllMatches,
    terminateSession
} from '../api/deadlockAdmin';
import TeamCard from '../components/TeamCard';
import './Admin.css';

const AdminPage = () => {
    const navigate = useNavigate();
    const [unassignedTeams, setUnassignedTeams] = useState([]);
    const [teamA, setTeamA] = useState([]);
    const [teamB, setTeamB] = useState([]); // Team OMEGA

    const [matchId, setMatchId] = useState(null);
    const [loading, setLoading] = useState(true);

    const [gameStarted, setGameStarted] = useState(false);
    const [initializationProgress, setInitializationProgress] = useState(0);

    const [draggedTeam, setDraggedTeam] = useState(null);
    const [sourceColumn, setSourceColumn] = useState(null);

    const [toast, setToast] = useState(null);

    useEffect(() => {
        document.title = "Deadlock // Admin";
        const fetchData = async () => {
            try {
                setLoading(true);
                const teamsData = await getTeams();
                setUnassignedTeams(teamsData.teams || []);
            } catch (err) {
                console.error(err);
                showToast("Failed to load data");
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    // Progress bar simulation for dramatic effect
    useEffect(() => {
        if (gameStarted && initializationProgress < 100) {
            const timer = setTimeout(() => {
                setInitializationProgress(prev => Math.min(prev + (Math.random() * 15), 100));
            }, 200);
            return () => clearTimeout(timer);
        }
    }, [gameStarted, initializationProgress]);

    // Redirection after initialization
    useEffect(() => {
        if (initializationProgress === 100) {
            const timer = setTimeout(() => {
                navigate('/admin/deadlock-tracker');
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [initializationProgress, navigate]);

    const showToast = (msg) => {
        setToast(msg);
        setTimeout(() => setToast(null), 3000);
    };

    const handleDragStart = (e, team, source) => {
        setDraggedTeam(team);
        setSourceColumn(source);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e) => {
        e.preventDefault();
    };

    const removeFromSource = () => {
        if (sourceColumn === 'unassigned') {
            setUnassignedTeams(prev => prev.filter(t => t._id !== draggedTeam._id));
        }
        if (sourceColumn === 'teamA') {
            setTeamA(prev => prev.filter(t => t._id !== draggedTeam._id));
        }
        if (sourceColumn === 'teamB') {
            setTeamB(prev => prev.filter(t => t._id !== draggedTeam._id));
        }
    };

    const handleDrop = (e, targetColumn, targetTeam = null) => {
        e.preventDefault();
        if (!draggedTeam) return;

        // If dropping on self in same column, do nothing
        if (sourceColumn === targetColumn && targetTeam && draggedTeam._id === targetTeam._id) return;

        const updateList = (prev) => {
            const filtered = prev.filter(t => t._id !== draggedTeam._id);
            if (targetTeam) {
                const targetIndex = filtered.findIndex(t => t._id === targetTeam._id);
                const newList = [...filtered];
                newList.splice(targetIndex, 0, draggedTeam); // Insert before target
                return newList;
            }
            return [...filtered, draggedTeam]; // Append if no specific target team
        };

        if (targetColumn === 'unassigned') {
            setUnassignedTeams(prev => updateList(prev));
            if (sourceColumn === 'teamA') setTeamA(prev => prev.filter(t => t._id !== draggedTeam._id));
            if (sourceColumn === 'teamB') setTeamB(prev => prev.filter(t => t._id !== draggedTeam._id));
        }

        if (targetColumn === 'teamA') {
            setTeamA(prev => updateList(prev));
            if (sourceColumn === 'unassigned') setUnassignedTeams(prev => prev.filter(t => t._id !== draggedTeam._id));
            if (sourceColumn === 'teamB') setTeamB(prev => prev.filter(t => t._id !== draggedTeam._id));
        }

        if (targetColumn === 'teamB') {
            setTeamB(prev => updateList(prev));
            if (sourceColumn === 'unassigned') setUnassignedTeams(prev => prev.filter(t => t._id !== draggedTeam._id));
            if (sourceColumn === 'teamA') setTeamA(prev => prev.filter(t => t._id !== draggedTeam._id));
        }

        setDraggedTeam(null);
        setSourceColumn(null);
    };

    const handleRandomMatch = () => {
        // Collect all teams from all columns
        const allTeams = [...unassignedTeams, ...teamA, ...teamB];

        if (allTeams.length < 2) {
            showToast("Not enough teams to match");
            return;
        }

        // Fisher-Yates shuffle
        const shuffled = [...allTeams];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }

        // Calculate distribution
        const total = shuffled.length;
        const isOdd = total % 2 !== 0;
        const pairsCount = Math.floor(total / 2);

        const newUnassigned = isOdd ? [shuffled[0]] : [];
        const startIdx = isOdd ? 1 : 0;

        const newTeamA = shuffled.slice(startIdx, startIdx + pairsCount);
        const newTeamB = shuffled.slice(startIdx + pairsCount);

        setUnassignedTeams(newUnassigned);
        setTeamA(newTeamA);
        setTeamB(newTeamB);

        showToast("Teams randomized and distributed.");
    };

    const handleSwap = async () => {
        const temp = teamA;
        setTeamA(teamB);
        setTeamB(temp);

        if (matchId) {
            try {
                await swapMatchTeams(matchId);
            } catch {
                showToast("Swap failed on server");
            }
        }
        if (teamA.length !== teamB.length || teamA.length === 0) {
            showToast("Invalid pairings: Columns must be balanced");
            return;
        }

        // Cross-check for duplicate IDs between A and B
        const aIds = new Set(teamA.map(t => t._id));
        const duplicateFound = teamB.some(t => aIds.has(t._id));
        if (duplicateFound) {
            showToast("Invalid pairings: Team found in both ALPHA and OMEGA");
            return;
        }
    };

    const handleClearBoard = async () => {
        if (!window.confirm("Nuclear Reset will wipe ALL match data and reset all teams to default 'pending' state. Proceed?")) return;
        try {
            await terminateSession();
            setTeamA([]);
            setTeamB([]);
            setUnassignedTeams([]);
            const teamsData = await getTeams();
            setUnassignedTeams(teamsData.teams || []);
            showToast("System Reset Complete: Baseline Restored.");
        } catch (err) {
            console.error(err);
            showToast("Nuclear Reset Failed");
        }
    };

    const handleStartAll = async () => {
        try {
            setLoading(true);
            const teamAIds = teamA.map(t => t._id);
            const teamBIds = teamB.map(t => t._id);

            await startAllMatches(teamAIds, teamBIds);
            setGameStarted(true); // Trigger the big transition
            setUnassignedTeams([]);
            setTeamA([]);
            setTeamB([]);
        } catch (err) {
            console.error(err);
            const backendError = err.response?.data?.error;
            const backendMessage = err.response?.data?.message;
            const errorMsg = backendError ? `Error: ${backendError}` : (backendMessage || err.message || "Failed to start all matches");
            showToast(errorMsg);
        } finally {
            setLoading(false);
        }
    };


    if (gameStarted) {
        return (
            <div className="admin-page-root game-started">
                <div className="admin-scanlines"></div>
                <div className="admin-grid-overlay"></div>

                <div className="initialization-overlay">
                    <div className="init-content">
                        <div className="tech-spinner">
                            <div className="spinner-inner"></div>
                            <div className="spinner-outer"></div>
                            <div className="spinner-center">
                                <div className="deadlock-icon">D</div>
                            </div>
                        </div>

                        <div className="status-container">
                            <h2 className="glitch-text" data-text="DEADLOCK INITIATED">DEADLOCK INITIATED</h2>
                            <div className="progress-bar-container">
                                <div className="progress-bar" style={{ width: `${initializationProgress}%` }}></div>
                                <div className="progress-percentage">{Math.floor(initializationProgress)}%</div>
                            </div>
                            <div className="status-log">
                                <p className={initializationProgress > 20 ? 'visible' : ''}>NEURAL LINK ESTABLISHED...</p>
                                <p className={initializationProgress > 45 ? 'visible' : ''}>MATCH PROTOCOLS LIVE...</p>
                                <p className={initializationProgress > 70 ? 'visible' : ''}>TERMINAL ACCESS GRANTED...</p>
                                <p className={initializationProgress > 90 ? 'visible' : ''}>SYSTEMS STABLE. BEGINNING...</p>
                                {initializationProgress === 100 && (
                                    <p className="visible redirect-msg blink" style={{ color: '#00ff41', marginTop: '1rem', fontWeight: 'bold' }}>
                                        REDIRECTING TO REALTIME STATUS TRACKER...
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="admin-page-root">
            <div className="admin-scanlines"></div>
            <div className="admin-grid-overlay"></div>

            <div className="admin-container">
                {toast && (() => {
                    const isError = toast.toLowerCase().includes('failed') || toast.toLowerCase().includes('invalid') || toast.toLowerCase().includes('not enough');
                    return (
                        <div className={`cyber-toast ${isError ? 'error' : 'success'}`} role="status">
                            <span className="admin-toast-corner tl" aria-hidden="true" />
                            <span className="admin-toast-corner tr" aria-hidden="true" />
                            <span className="admin-toast-corner bl" aria-hidden="true" />
                            <span className="admin-toast-corner br" aria-hidden="true" />
                            <span className="admin-toast-chip">
                                <span>{isError ? 'ERR' : 'OK'}</span>
                            </span>
                            <span className="admin-toast-text">{toast}</span>
                        </div>
                    );
                })()}

                <header className="admin-header">
                    <div className="header-brand">
                        <div className="brand-accent"></div>
                        <h1>DEADLOCK // SYSTEM ADMIN</h1>
                    </div>
                    <div className="admin-actions">
                        <button
                            onClick={handleStartAll}
                            className="cyber-btn primary"
                            disabled={loading || teamA.length === 0 || teamA.length !== teamB.length}
                        >
                            <span className="btn-glitch"></span>
                            INITIALIZE ALL MATCHES
                        </button>
                        <button
                            onClick={handleRandomMatch}
                            className="cyber-btn secondary"
                            disabled={loading || (unassignedTeams.length + teamA.length + teamB.length) < 2}
                        >
                            GROUP RANDOM MATCHES
                        </button>
                        <button
                            onClick={handleSwap}
                            className="cyber-btn secondary"
                            disabled={teamA.length === 0 && teamB.length === 0}
                        >
                            SWAP PROTOCOL
                        </button>
                        <button
                            onClick={handleClearBoard}
                            className="cyber-btn danger"
                        >
                            TERMINATE SESSION
                        </button>
                    </div>
                </header>

                <div className="board">
                    {/* UNASSIGNED */}
                    <div
                        className="column"
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDrop(e, 'unassigned')}
                    >
                        <div className="column-header">
                            Unassigned ({unassignedTeams.length})
                        </div>
                        <div className="column-content">
                            {loading ? "Loading..." :
                                unassignedTeams.map(team => (
                                    <TeamCard
                                        key={team._id}
                                        team={team}
                                        onDragStart={(e) =>
                                            handleDragStart(e, team, 'unassigned')
                                        }
                                        onDrop={(e) => handleDrop(e, 'unassigned', team)}
                                    />
                                ))
                            }
                        </div>
                    </div>

                    {/* TEAM ALPHA */}
                    <div
                        className="column column-alpha"
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDrop(e, 'teamA')}
                    >
                        <div className="column-header">TEAM ALPHA</div>
                        <div className="column-content">
                            {teamA.map(team => (
                                <TeamCard
                                    key={team._id}
                                    team={team}
                                    onDragStart={(e) =>
                                        handleDragStart(e, team, 'teamA')
                                    }
                                    onDrop={(e) => handleDrop(e, 'teamA', team)}
                                />
                            ))}
                        </div>
                    </div>

                    {/* TEAM OMEGA */}
                    <div
                        className="column column-omega"
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDrop(e, 'teamB')}
                    >
                        <div className="column-header">TEAM OMEGA</div>
                        <div className="column-content">
                            {teamB.map(team => (
                                <TeamCard
                                    key={team._id}
                                    team={team}
                                    onDragStart={(e) =>
                                        handleDragStart(e, team, 'teamB')
                                    }
                                    onDrop={(e) => handleDrop(e, 'teamB', team)}
                                />
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminPage;
