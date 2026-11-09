import React from 'react';
import celestiusLogo from '../../assets/celestius-logo.png';
import larperOrCoderImg from '../../assets/larper-or-coder.png';

const DeadlockHeader = () => {
    return (
        <header className="arena-top-navbar">
            <div className="nav-col left">
                <img src={celestiusLogo} alt="Celestius" className="nav-celestius-logo" />
            </div>
            <div className="nav-col center">
                <div className="nav-round-badge">
                    <span className="nav-live-dot" />
                    <span className="nav-round-text">ROUND 01 // TUG OF AURA</span>
                </div>
            </div>
            <div className="nav-col right">
                <img src={larperOrCoderImg} alt="LARPER OR CODER" className="nav-larper-logo" />
            </div>
        </header>
    );
};

export default DeadlockHeader;
