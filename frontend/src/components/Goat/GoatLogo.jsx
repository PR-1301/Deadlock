import React from 'react';
import goatImg from '../../assets/whos-the-goat.png';
import './GoatLogo.css';

export default function GoatLogo({ className = "" }) {
    return (
        <div className={`goat-logo-container ${className}`}>
            <div className="goat-logo-wrapper">
                {/* 1. Sharp Base PNG (Crystal Clear, 100% Transparent Background) */}
                <img
                    src={goatImg}
                    alt="Who's The GOAT"
                    className="goat-logo-base"
                />

                {/* 2. Clear Glitch Slice 1 (Upper Horizontal Slice Jitter) */}
                <img
                    src={goatImg}
                    alt=""
                    aria-hidden="true"
                    className="goat-glitch-slice goat-slice-upper"
                />

                {/* 3. Clear Glitch Slice 2 (Lower Horizontal Slice Jitter) */}
                <img
                    src={goatImg}
                    alt=""
                    aria-hidden="true"
                    className="goat-glitch-slice goat-slice-lower"
                />

                {/* 4. Sharp Neon Glitch Accent Bars (TLE Signature Style) */}
                <div aria-hidden="true" className="goat-laser-cyan" />
                <div aria-hidden="true" className="goat-laser-orange" />
            </div>
        </div>
    );
}
