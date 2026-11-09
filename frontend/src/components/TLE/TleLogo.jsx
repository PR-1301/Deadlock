import React from 'react';
import './TleLogo.css';

export default function TleLogo({ showBadge = true }) {
  return (
    <div className="tle-logo-container">
      {/* Terminal prompt line
      <div className="tle-terminal-prompt">
        <span className="tle-prompt-path">~/tle $</span>
        <span className="tle-prompt-cmd">sudo ./lock-in --no-cap --aura=max</span>
        <span className="tle-cur" />
      </div> */}

      {/* Main Glitch TLE Title */}
      <div className="tle-title-wrapper">
        {/* Layer 1: Orange chromatic aberration */}
        <div aria-hidden="true" className="tle-layer tle-or">
          TLE
        </div>

        {/* Layer 2: Cyan chromatic aberration */}
        <div aria-hidden="true" className="tle-layer tle-cyan">
          TLE
        </div>

        {/* Layer 3: Main Base Text */}
        <h1 className="tle-layer tle-base">
          TLE
        </h1>

        {/* Layer 4: Upper Glitch Slice */}
        <div aria-hidden="true" className="tle-layer tle-s1">
          TLE
        </div>

        {/* Layer 5: Lower Glitch Slice */}
        <div aria-hidden="true" className="tle-layer tle-s2">
          TLE
        </div>

        {/* Glitch Cut Accent Bars */}
        <div aria-hidden="true" className="tle-bar-cyan" />
        <div aria-hidden="true" className="tle-bar-orange" />
      </div>

      {/* Abbreviation title in matching TLE glitch/terminal style */}
      <div className="tle-abbreviation">
        THINK, LOCK IN, EXECUTE
      </div>

      {/* Sub-label banner: ROUND 01 // TUG OF AURA */}
      {showBadge && (
        <div className="tle-badge-row">
          <span className="tle-round-tag">ROUND 01</span>
          <span className="tle-dot">//</span>
          <span className="tle-round-name">TUG OF AURA</span>
        </div>
      )}
    </div>
  );
}
