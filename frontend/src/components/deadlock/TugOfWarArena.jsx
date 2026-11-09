import React from 'react';
import Rope from './Rope';

const TugOfWarArena = ({
    tugPosition = 0,
    maxPull = 4,
    teamA,
    teamB,
    userTeam,
    scoreA = 0,
    scoreB = 0
}) => {
    const isInitialMountRef = React.useRef(true);
    const prevScoreARef = React.useRef(scoreA);
    const prevScoreBRef = React.useRef(scoreB);
    const [floatA, setFloatA] = React.useState(false);
    const [floatB, setFloatB] = React.useState(false);
    const [animKeyA, setAnimKeyA] = React.useState(0);
    const [animKeyB, setAnimKeyB] = React.useState(0);

    // Detect score increments for "+1 AURA" float animation
    React.useEffect(() => {
        if (isInitialMountRef.current) {
            prevScoreARef.current = scoreA;
            prevScoreBRef.current = scoreB;
            isInitialMountRef.current = false;
            return;
        }

        if (scoreA > prevScoreARef.current) {
            setAnimKeyA(k => k + 1);
            setFloatA(true);
        }
        prevScoreARef.current = scoreA;
    }, [scoreA]);

    React.useEffect(() => {
        if (isInitialMountRef.current) return;

        if (scoreB > prevScoreBRef.current) {
            setAnimKeyB(k => k + 1);
            setFloatB(true);
        }
        prevScoreBRef.current = scoreB;
    }, [scoreB]);

    React.useEffect(() => {
        if (floatA) {
            const timer = setTimeout(() => setFloatA(false), 1600);
            return () => clearTimeout(timer);
        }
    }, [floatA, animKeyA]);

    React.useEffect(() => {
        if (floatB) {
            const timer = setTimeout(() => setFloatB(false), 1600);
            return () => clearTimeout(timer);
        }
    }, [floatB, animKeyB]);

    const safeMax = (maxPull && maxPull > 0) ? maxPull : 4;
    const safeTug = (typeof tugPosition === 'number') ? tugPosition : 0;

    // Movement range: -38vw (Alpha win) to +38vw (Omega win)
    const offsetVw = (safeTug / safeMax) * 38;
    const clampedOffset = Math.max(-42, Math.min(42, offsetVw));

    const teamAName = teamA?.name || teamA?.teamName || "Alpha";
    const teamBName = teamB?.name || teamB?.teamName || "Omega";

    const isUserA = userTeam === 'A';
    const isUserB = userTeam === 'B';

    // Live plain English status instead of jargon
    let statusText = "Tied";
    if (safeTug < 0) {
        const lead = Math.abs(safeTug);
        statusText = `${teamAName} leads by ${lead}`;
    } else if (safeTug > 0) {
        const lead = Math.abs(safeTug);
        statusText = `${teamBName} leads by ${lead}`;
    }

    return (
        <section className="hero-tug-arena" aria-label="Tug of War Match Status">
            {/* Top Anchor Row: Teams anchored at each end, live status in center */}
            <div className="hero-anchor-row">
                {/* Team Alpha Anchor (Left - Celestius Brand Yellow) */}
                <div className={`team-anchor left ${isUserA ? 'is-user' : ''}`}>
                    <div className="anchor-name-row">
                        <span className="team-display-name alpha" title={teamAName}>
                            {teamAName}
                        </span>
                        {isUserA && <span className="you-pill">YOU</span>}
                    </div>
                    <div className="anchor-score-row">
                        <span className={`score-val ${floatA ? 'bump' : ''}`}>{scoreA}</span>
                        <span className="score-label">pts</span>
                        {floatA && (
                            <span key={animKeyA} className="floating-aura-badge alpha">
                                +1 AURA
                            </span>
                        )}
                    </div>
                </div>

                {/* Center Live Match Status */}
                <div className="hero-center-status">
                    <span className="live-status-pill">{statusText}</span>
                </div>

                {/* Team Omega Anchor (Right - Muted Opponent Slate) */}
                <div className={`team-anchor right ${isUserB ? 'is-user' : ''}`}>
                    <div className="anchor-score-row">
                        {floatB && (
                            <span key={animKeyB} className="floating-aura-badge omega">
                                +1 AURA
                            </span>
                        )}
                        <span className={`score-val ${floatB ? 'bump' : ''}`}>{scoreB}</span>
                        <span className="score-label">pts</span>
                    </div>
                    <div className="anchor-name-row right">
                        {isUserB && <span className="you-pill">YOU</span>}
                        <span className="team-display-name omega" title={teamBName}>
                            {teamBName}
                        </span>
                    </div>
                </div>
            </div>

            {/* Hero Track Stage: 2-3x Taller, Physics Weight, Marker Centered */}
            <div className="hero-track-stage">
                {/* Visual Track Groove */}
                <div className="hero-track-groove">
                    {/* Dynamic Pulled Rope / Beams & Heavy Marker */}
                    <Rope offsetVw={clampedOffset} safeTug={safeTug} />

                    {/* Milestone Tick Marks (-4 to +4) */}
                    <div className="hero-ticks-layer">
                        {[-4, -3, -2, -1, 0, 1, 2, 3, 4].map(pos => {
                            const isCenter = pos === 0;
                            const isEdge = Math.abs(pos) === 4;
                            return (
                                <div
                                    key={pos}
                                    className={`hero-tick ${isCenter ? 'center-notch' : ''} ${isEdge ? 'edge-notch' : ''}`}
                                    style={{ left: `calc(50% + ${(pos / 4) * 38}vw)` }}
                                />
                            );
                        })}
                    </div>
                </div>
            </div>
        </section>
    );
};

export default TugOfWarArena;
