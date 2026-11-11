import React from 'react';
import './DismissalOverlay.css';

const DismissalOverlay = () => {
    return (
        <div className="dismissal-overlay-root" role="alertdialog" aria-modal="true" aria-labelledby="dismissal-title">
            <div className="dismissal-scanlines" aria-hidden="true"></div>

            <div className="dismissal-content">
                <span className="dismissal-corner tl" aria-hidden="true"></span>
                <span className="dismissal-corner tr" aria-hidden="true"></span>
                <span className="dismissal-corner bl" aria-hidden="true"></span>
                <span className="dismissal-corner br" aria-hidden="true"></span>

                <div className="dismissal-divider" aria-hidden="true">
                    <span className="dismissal-bracket">
                        <span className="dismissal-hook left"></span>
                        <span className="dismissal-dash"></span>
                        <span className="dismissal-dash"></span>
                    </span>
                    <span className="dismissal-parallelogram">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="square">
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                        <span>HALT</span>
                    </span>
                    <span className="dismissal-bracket">
                        <span className="dismissal-dash"></span>
                        <span className="dismissal-dash"></span>
                        <span className="dismissal-hook right"></span>
                    </span>
                </div>

                <h1 id="dismissal-title" className="dismissal-title-top">SYSTEM</h1>
                <div className="dismissal-title-sub">
                    <span>HALTED</span>
                    <span className="dismissal-underscore" aria-hidden="true"></span>
                </div>

                <div className="dismissal-subtext">
                    [ ACCESS REVOKED BY OVERRIDE ]
                </div>

                <div className="reason-box">
                    <span className="reason-label">MESSAGE:</span>{' '}
                    <span className="reason-value">GAME DISMISSED BY THE ADMIN</span>
                </div>

                <div className="deauth-container">
                    <div className="deauth-label">DE-AUTHENTICATING UNIT...</div>
                    <div className="deauth-progress-wrapper">
                        <div className="deauth-progress-bar"></div>
                    </div>
                </div>

                <div className="terminal-halt-logs">
                    <p><span className="log-gt">&gt;</span> SIGTERM RECEIVED</p>
                    <p><span className="log-gt">&gt;</span> PURGING SESSION_CACHE...</p>
                    <p><span className="log-gt">&gt;</span> DISCONNECTING NEURAL_LINK...</p>
                    <p><span className="log-gt">&gt;</span> RETURN_TO_LOBBY: INITIATED</p>
                </div>
            </div>
        </div>
    );
};

export default DismissalOverlay;
