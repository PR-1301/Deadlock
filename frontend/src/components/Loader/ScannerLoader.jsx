import React, { useState, useEffect, useRef } from 'react';
import SceneBackground from '../Background/SceneBackground';
import './ScannerLoader.css';

const TOTAL_SEGMENTS = 24;

const DEFAULT_STAGES = [
  {
    threshold: 28,
    title: "BREACHING FIREWALL",
    sub: "> firewall-override: cracked",
    telemetry: "> telemetry: scanning duo memory space..."
  },
  {
    threshold: 62,
    title: "AUTHENTICATING DUO",
    sub: "> duo-crypto: operatives verified",
    telemetry: "> telemetry: synchronizing runtime state..."
  },
  {
    threshold: 92,
    title: "CODER DETECTED",
    sub: "> aura-status: maxed out // lock-in active",
    telemetry: "> telemetry: calibrating tug of aura grid..."
  },
  {
    threshold: 100,
    title: "WARPING TO ARENA",
    sub: "> clearance: granted // deploying operatives",
    telemetry: "> telemetry: warping operatives to round 01 lobby..."
  }
];

export default function ScannerLoader({
  onComplete,
  duration = 2400,
  stages = DEFAULT_STAGES,
  titleOverride = null,
  subOverride = null
}) {
  const [progress, setProgress] = useState(0);
  const [isGreen, setIsGreen] = useState(false);
  const completedRef = useRef(false);

  // Smooth ticker from 0 -> 99 -> 100%
  useEffect(() => {
    const startTime = performance.now();
    const loadingDuration = Math.max(duration - 600, 1200);

    const interval = setInterval(() => {
      const elapsed = performance.now() - startTime;
      const ratio = Math.min(elapsed / loadingDuration, 1);

      // Non-linear easing to 99%
      let target;
      if (ratio < 0.35) {
        target = Math.floor(ratio * 1.5 * 100);
      } else if (ratio < 0.6) {
        target = 52 + Math.floor((ratio - 0.35) * 60);
      } else if (ratio < 0.85) {
        target = 74 + Math.floor((ratio - 0.6) * 70);
      } else {
        target = 92 + Math.floor((ratio - 0.85) * 35);
      }

      const nextProgress = Math.min(Math.max(target, 0), 99);
      setProgress(nextProgress);

      if (ratio >= 1) {
        clearInterval(interval);
        setProgress(99);

        // Pause briefly at 99%, then snap to 100% and turn green
        setTimeout(() => {
          setProgress(100);
          setIsGreen(true);

          // After green flash / hold, call onComplete
          setTimeout(() => {
            if (!completedRef.current) {
              completedRef.current = true;
              onComplete?.();
            }
          }, 450);
        }, 320);
      }
    }, 35);

    return () => clearInterval(interval);
  }, [duration, onComplete]);

  // Current stage info based on progress
  const currentStage = stages.find(s => progress <= s.threshold) || stages[stages.length - 1];
  const activeSegmentsCount = Math.floor((progress / 100) * TOTAL_SEGMENTS);

  const displayTitle = titleOverride || currentStage.title;
  const displaySub = isGreen ? "> clearance: granted // ready to cook" : (subOverride || currentStage.sub);
  const displayTelemetry = currentStage.telemetry;

  return (
    <div className="scanner-loader-overlay" role="dialog" aria-modal="true">
      {/* Ambient background particles & code glyphs */}
      <SceneBackground />

      {/* Center Stage Container matching Intro Scanner */}
      <div className="scanner-loader-stage">
        {/* Refined Alert Banner - Exact replica of the Intro Alert Banner */}
        <div className="scanner-banner-wrapper">
          <span className={`scanner-handle left ${isGreen ? 'green' : ''}`} />
          <div className={`scanner-alert-banner ${isGreen ? 'green-mode' : ''}`}>
            <div className="scanner-title-row">
              <span className="scanner-alert-title">{displayTitle}</span>
            </div>
            <span className="scanner-alert-subline">{displaySub}</span>
          </div>
          <span className={`scanner-handle right ${isGreen ? 'green' : ''}`} />
        </div>

        {/* Large Percentage Counter (Orbitron 99%) */}
        <div className={`scanner-counter-row ${isGreen ? 'green-text' : ''}`}>
          <span>{progress}</span>
          <span className="scanner-counter-percent">%</span>
        </div>

        {/* Thick 24-Segment Progress Bar */}
        <div
          className={`scanner-segmented-bar ${isGreen ? 'green-mode' : ''}`}
          role="progressbar"
          aria-valuenow={progress}
          aria-valuemin="0"
          aria-valuemax="100"
        >
          {Array.from({ length: TOTAL_SEGMENTS }).map((_, i) => {
            const isFilled = i < activeSegmentsCount;
            const isTip = i === activeSegmentsCount - 1 && progress < 100;
            return (
              <div
                key={i}
                className={`scanner-segment-block ${isFilled ? 'filled' : ''} ${isTip ? 'tip' : ''}`}
              />
            );
          })}
        </div>

        {/* Telemetry Status Line */}
        <div className="scanner-telemetry-row">
          <span className="scanner-telemetry-text">{displayTelemetry}</span>
        </div>
      </div>
    </div>
  );
}

