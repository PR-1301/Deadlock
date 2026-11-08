// client/src/components/Intro/Intro.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import styles from './Intro.module.css';
import ImageTypewriter from './ImageTypewriter.jsx';
import larperOrCoderImg from '../../assets/larper-or-coder.png';
import {
  INTRO_STATES,
  PRESENTER_NAME,
  TIMINGS,
  TOTAL_SEGMENTS,
  STATUS_LINE_LOADING,
  PARTICLES_PHONE,
  PARTICLES_TABLET,
  PARTICLES_DESKTOP,
  SESSION_KEYS,
  LOGO_REVEAL_BOXES,
  PRESENTED_REVEAL_BOXES,
} from './introConstants.js';

export default function Intro({ onComplete }) {
  // Sound enabled state: default ON on desktop, OFF on mobile/tablet unless user has a stored preference
  const [soundEnabled, setSoundEnabled] = useState(() => {
    try {
      const stored = sessionStorage.getItem(SESSION_KEYS.SOUND_ENABLED);
      if (stored !== null) {
        return stored === 'true';
      }
      if (typeof window !== 'undefined' && window.matchMedia) {
        return window.matchMedia('(hover: hover) and (pointer: fine) and (min-width: 1024px)').matches;
      }
      return false;
    } catch {
      return false;
    }
  });

  // Check prefers-reduced-motion
  const isReducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // State machine state
  const [state, setState] = useState(() =>
    isReducedMotion ? INTRO_STATES.SWAP : INTRO_STATES.LOADING
  );

  // Loading & status values
  const [progress, setProgress] = useState(0);

  // Logo typing states: active brand image & number of revealed boxes
  const [activeLogo, setActiveLogo] = useState(() => (isReducedMotion ? 'presented' : 'logo'));
  const [revealedCount, setRevealedCount] = useState(() =>
    isReducedMotion ? PRESENTED_REVEAL_BOXES.length : 0
  );

  const canvasRef = useRef(null);
  const audioCtxRef = useRef(null);
  const animationFrameRef = useRef(null);
  const containerRef = useRef(null);

  // Web Audio Context initialization & synthesis
  const getAudioCtx = useCallback(() => {
    try {
      if (!audioCtxRef.current) {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (AudioContextClass) {
          audioCtxRef.current = new AudioContextClass();
        }
      }
      if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
        audioCtxRef.current.resume().catch(() => {});
      }
      return audioCtxRef.current;
    } catch {
      return null;
    }
  }, []);

  const playTick = useCallback(() => {
    if (!soundEnabled) return;
    try {
      const ctx = getAudioCtx();
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1400, ctx.currentTime);
      gain.gain.setValueAtTime(0.025, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.015);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.018);
    } catch {
      // Audio safety
    }
  }, [soundEnabled, getAudioCtx]);

  const playAlarm = useCallback(() => {
    if (!soundEnabled) return;
    try {
      const ctx = getAudioCtx();
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      osc.frequency.setValueAtTime(620, ctx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.18);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.2);
    } catch {
      // Audio safety
    }
  }, [soundEnabled, getAudioCtx]);

  const playDing = useCallback((freq = 587, targetFreq = 880) => {
    if (!soundEnabled) return;
    try {
      const ctx = getAudioCtx();
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(targetFreq, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.38);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.4);
    } catch {
      // Audio safety
    }
  }, [soundEnabled, getAudioCtx]);

  const playKeyClick = useCallback(() => {
    if (!soundEnabled) return;
    try {
      const ctx = getAudioCtx();
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(750, ctx.currentTime);
      gain.gain.setValueAtTime(0.02, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.012);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.015);
    } catch {
      // Audio safety
    }
  }, [soundEnabled, getAudioCtx]);

  const cleanupAudio = useCallback(() => {
    if (audioCtxRef.current) {
      try {
        if (audioCtxRef.current.state !== 'closed') {
          audioCtxRef.current.close().catch(() => {});
        }
      } catch {
        // Audio safety
      }
      audioCtxRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      cleanupAudio();
    };
  }, [cleanupAudio]);


  const dismiss = useCallback(() => {
    cleanupAudio();
    onComplete?.();
  }, [onComplete, cleanupAudio]);

  const handleSkip = useCallback(() => {
    cleanupAudio();
    dismiss();
  }, [dismiss, cleanupAudio]);

  // Keyboard shortcut listener (Enter, Escape)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' || e.key === 'Enter') {
        e.preventDefault();
        handleSkip();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSkip]);

  // Canvas particle background with screen-scaled density & glyph size
  useEffect(() => {
    if (isReducedMotion) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const glyphs = ['{', '}', '<', '/', '>', ';', '_', '0', '1'];

    const calculateParticles = (w) => {
      let count = PARTICLES_PHONE;
      let scale = 1.0;
      if (w >= 1200) {
        count = PARTICLES_DESKTOP;
        scale = 1.12;
      } else if (w >= 768) {
        count = PARTICLES_TABLET;
        scale = 1.0;
      }

      return Array.from({ length: count }, () => ({
        x: Math.random() * w,
        y: Math.random() * window.innerHeight,
        vy: 0.28 + Math.random() * 0.45,
        char: glyphs[Math.floor(Math.random() * glyphs.length)],
        size: Math.round((12 + Math.random() * 4) * scale),
        alpha: 0.08 + Math.random() * 0.06,
        isOrange: Math.random() > 0.45,
      }));
    };

    let particles = calculateParticles(canvas.width);

    const handleResize = () => {
      if (canvas) {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        particles = calculateParticles(canvas.width);
      }
    };
    window.addEventListener('resize', handleResize);

    const isGreen = state === INTRO_STATES.TURN_GREEN || state === INTRO_STATES.COMPLETE;

    const render = () => {
      if (!document.hidden && canvas) {
        const w = canvas.width;
        const h = canvas.height;
        ctx.clearRect(0, 0, w, h);
        ctx.textAlign = 'center';

        particles.forEach((p) => {
          p.y += p.vy;
          if (p.y > h + 20) {
            p.y = -10;
            p.x = Math.random() * w;
          }

          if (isGreen) {
            ctx.fillStyle = `rgba(61, 220, 132, ${p.alpha * 1.3})`;
          } else if (p.isOrange) {
            ctx.fillStyle = `rgba(245, 117, 70, ${p.alpha})`;
          } else {
            ctx.fillStyle = `rgba(249, 237, 210, ${p.alpha})`;
          }

          ctx.font = `${p.size}px monospace`;
          ctx.fillText(p.char, p.x, p.y);
        });
      }
      animationFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isReducedMotion, state]);

  // Main state sequence controller (Phases 1 - 4)
  useEffect(() => {
    if (isReducedMotion) return;

    // 1. LOADING (0 to 1.5s): Non-linear climb to 99%
    if (state === INTRO_STATES.LOADING) {
      const startTime = performance.now();
      const tickTracker = { lastTick: 0 };

      const progressInterval = setInterval(() => {
        const elapsed = performance.now() - startTime;
        const ratio = Math.min(elapsed / TIMINGS.LOADING_DURATION, 1);

        let target;
        if (ratio < 0.35) {
          target = Math.floor(ratio * 1.5 * 100);
        } else if (ratio < 0.6) {
          target = 54 + Math.floor((ratio - 0.35) * 60);
        } else if (ratio < 0.85) {
          target = 76 + Math.floor((ratio - 0.6) * 70);
        } else {
          target = 94 + Math.floor((ratio - 0.85) * 33);
        }

        const nextProgress = Math.min(Math.max(target, 0), 99);
        setProgress(nextProgress);

        if (nextProgress > tickTracker.lastTick + 10) {
          tickTracker.lastTick = nextProgress;
          playTick();
        }

        if (ratio >= 1) {
          clearInterval(progressInterval);
          setProgress(99);
          setState(INTRO_STATES.ALERT);
        }
      }, 40);

      return () => clearInterval(progressInterval);
    }

    // 2. ALERT (1.5s to 2.7s): "LARPER DETECTED" banner appears above loader
    if (state === INTRO_STATES.ALERT) {
      playAlarm();
      const timer = setTimeout(() => {
        setState(INTRO_STATES.TURN_GREEN);
      }, TIMINGS.ALERT_DURATION);
      return () => clearTimeout(timer);
    }

    // 3. TURN_GREEN (2.7s to 4.1s): Banner & handles & bar turn green (#3DDC84)
    if (state === INTRO_STATES.TURN_GREEN) {
      playDing(587, 880);
      const greenStartTime = performance.now();

      const greenInterval = setInterval(() => {
        const elapsed = performance.now() - greenStartTime;
        const ratio = Math.min(elapsed / TIMINGS.TURN_GREEN_DURATION, 1);
        if (ratio >= 0.85) {
          setProgress(100);
        }
      }, 50);

      const timer = setTimeout(() => {
        clearInterval(greenInterval);
        setProgress(100);
        setState(INTRO_STATES.COMPLETE);
      }, TIMINGS.TURN_GREEN_DURATION);

      return () => {
        clearInterval(greenInterval);
        clearTimeout(timer);
      };
    }

    // 4. COMPLETE: Snaps to 100% with clean flash, then hands over immediately to login screen
    if (state === INTRO_STATES.COMPLETE) {
      playDing(880, 1174);
      const timer = setTimeout(() => {
        dismiss();
      }, TIMINGS.COMPLETE_HOLD);
      return () => clearTimeout(timer);
    }
  }, [state, isReducedMotion, playTick, playAlarm, playDing, dismiss]);

  const isGreenPhase = state === INTRO_STATES.TURN_GREEN || state === INTRO_STATES.COMPLETE;
  const isLoaderVisible =
    state === INTRO_STATES.LOADING ||
    state === INTRO_STATES.ALERT ||
    state === INTRO_STATES.TURN_GREEN ||
    state === INTRO_STATES.COMPLETE;
  const showAlert = state === INTRO_STATES.ALERT || state === INTRO_STATES.TURN_GREEN;
  const isLogoStage = state === INTRO_STATES.TYPE_LOGO || state === INTRO_STATES.SWAP;

  const displayProgress = state === INTRO_STATES.COMPLETE ? 100 : progress;
  const activeSegmentsCount = Math.floor((displayProgress / 100) * TOTAL_SEGMENTS);

  return (
    <div
      className={`${styles.overlay} ${state === INTRO_STATES.AUTO_ENTER ? styles.fadingOut : ''}`}
      role="dialog"
      aria-modal="true"
      aria-label="Story Introduction"
    >
      {/* Background canvas for floating code glyphs */}
      {!isReducedMotion && <canvas ref={canvasRef} className={styles.particleCanvas} />}

      {/* ALERT PHASE: 3 soft orange blinks */}
      {state === INTRO_STATES.ALERT && !isReducedMotion && (
        <div className={styles.orangeWash} aria-hidden="true" />
      )}

      {/* GREEN PHASE: 3 soft green blinks */}
      {state === INTRO_STATES.TURN_GREEN && !isReducedMotion && (
        <div className={styles.greenWash} aria-hidden="true" />
      )}

      {/* 100% COMPLETE: Clean white flash on snap */}
      {state === INTRO_STATES.COMPLETE && !isReducedMotion && (
        <div className={styles.completeFlash} aria-hidden="true" />
      )}

      {/* Center Stage */}
      <div className={styles.stage}>
        {/* Loader + Alert Banner */}
        {isLoaderVisible && (
          <div className={`${styles.loaderArea} ${state === INTRO_STATES.COMPLETE ? styles.clearing : ''}`}>
            {/* ALERT BANNER */}
            {showAlert && (
              <div className={styles.alertBannerWrapper}>
                <span className={styles.handleLeft} />
                <div
                  className={`${styles.alertBanner} ${
                    state === INTRO_STATES.TURN_GREEN ? styles.alertBannerGreen : ''
                  }`}
                >
                  <div className={styles.alertTitleRow}>
                    <span className={styles.alertText}>LARPER DETECTED</span>
                  </div>
                  <span className={styles.alertStatusSubline}>
                    {state === INTRO_STATES.TURN_GREEN
                      ? '> larper-scanner: cleared'
                      : '> larper-scanner: flagged'}
                  </span>
                </div>
                <span className={styles.handleRight} />
              </div>
            )}

            {/* Large Percentage Counter */}
            <div className={`${styles.counterRow} ${isGreenPhase ? styles.greenText : ''}`}>
              <span>{displayProgress}</span>
              <span className={styles.counterPercent}>%</span>
            </div>

            {/* Thick Segmented Bar */}
            <div
              className={`${styles.segmentedBar} ${isGreenPhase ? styles.greenMode : ''}`}
              aria-label="System verification progress"
            >
              {Array.from({ length: TOTAL_SEGMENTS }).map((_, idx) => {
                const isFilled = idx < activeSegmentsCount;
                const isTip = idx === activeSegmentsCount && displayProgress < 100;
                return (
                  <div
                    key={idx}
                    className={`${styles.segmentBlock} ${isFilled ? styles.filled : ''} ${
                      isTip ? styles.tip : ''
                    }`}
                  />
                );
              })}
            </div>

            {/* Single Muted Status Line */}
            <div className={styles.statusLineMuted}>
              {STATUS_LINE_LOADING}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

