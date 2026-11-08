import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import ImageTypewriter from "../components/Intro/ImageTypewriter.jsx";
import { LOGO_REVEAL_BOXES } from "../components/Intro/introConstants.js";
import logoTypingImg from "../assets/logo-typing.png";
import celestiusLogo from "../assets/celestius-logo.png";
import Intro from "../components/Intro/Intro.jsx";
import SceneBackground from "../components/Background/SceneBackground.jsx";
import "../style/login.css";

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "";

// Debounce helper
const useDebounce = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
};

const Deadlock = () => {
  const navigate = useNavigate();
  const [teamName, setTeamName] = useState("");
  const debouncedTeamName = useDebounce(teamName, 300);

  const [members, setMembers] = useState(["", "", ""]);
  const [teamExists, setTeamExists] = useState(false);
  const [isTeamAvailable, setIsTeamAvailable] = useState(false);
  const [existingTeamData, setExistingTeamData] = useState(null);

  // Loading / Intro state
  const [isLoading, setIsLoading] = useState(true);

  // Image Typewriter Reveal State (above Team Name on Login Screen)
  const [revealedCount, setRevealedCount] = useState(0);
  const [isLogoComplete, setIsLogoComplete] = useState(false);

  // Redirect State
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [redirectStep, setRedirectStep] = useState(0);
  const redirectMessages = [
    "ACCESS GRANTED",
    "ESTABLISHING UPLINK...",
    "BREACHING FIREWALL...",
    "WELCOME, OPERATIVE."
  ];

  // Deployment State
  const [isDeploying, setIsDeploying] = useState(false);
  const [isResuming, setIsResuming] = useState(false);

  // Notification State
  const [notification, setNotification] = useState(null);

  useEffect(() => {
    document.title = "LARPER OR CODER // Celestius";
  }, []);

  // Image Typewriter Sequence: Continuously repeats the logo typing animation
  useEffect(() => {
    if (isLoading) return;

    let isCancelled = false;
    let timerId = null;
    const total = LOGO_REVEAL_BOXES.length; // 13 reveal boxes
    const TYPE_SPEED = 95; // ms per box
    const BACKSPACE_SPEED = 38; // ms per box
    const HOLD_FULL = 2400; // ms to pause at full logo before backspacing
    const HOLD_EMPTY = 400; // ms to pause before typing again

    const runLoop = () => {
      let current = 0;
      setIsLogoComplete(false);
      setRevealedCount(0);

      const typeStep = () => {
        if (isCancelled) return;
        current++;
        setRevealedCount(current);

        if (current < total) {
          timerId = setTimeout(typeStep, TYPE_SPEED);
        } else {
          // Full logo revealed - mark complete and hold
          setIsLogoComplete(true);
          timerId = setTimeout(() => {
            if (isCancelled) return;
            setIsLogoComplete(false);
            backspaceStep();
          }, HOLD_FULL);
        }
      };

      const backspaceStep = () => {
        if (isCancelled) return;
        current--;
        setRevealedCount(Math.max(0, current));

        if (current > 0) {
          timerId = setTimeout(backspaceStep, BACKSPACE_SPEED);
        } else {
          // Reached 0 (empty) - pause briefly then type again
          timerId = setTimeout(() => {
            if (isCancelled) return;
            runLoop();
          }, HOLD_EMPTY);
        }
      };

      timerId = setTimeout(typeStep, TYPE_SPEED);
    };

    runLoop();

    return () => {
      isCancelled = true;
      if (timerId) clearTimeout(timerId);
    };
  }, [isLoading]);

  // Check Team Existence
  useEffect(() => {
    const checkTeam = async () => {
      if (!debouncedTeamName || debouncedTeamName.length < 1) {
        setTeamExists(false);
        setIsTeamAvailable(false);
        setExistingTeamData(null);
        return;
      }

      try {
        const response = await axios.get(`${BASE_URL}/api/admin/deadlock/team/check/${debouncedTeamName}`);

        if (response.data.success) {
          if (response.data.exists) {
            setTeamExists(true);
            setIsTeamAvailable(false);
            setExistingTeamData(response.data.team);
            showNotification("TEAM RECORD FOUND. RESUMING SESSION.", "success");
          } else {
            setTeamExists(false);
            setIsTeamAvailable(true);
            setExistingTeamData(null);
          }
        }
      } catch (error) {
        console.error("Check team error:", error);
      }
    };

    checkTeam();
  }, [debouncedTeamName]);

  const showNotification = (message, type = "error") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleMemberChange = (index, value) => {
    const updated = [...members];
    updated[index] = value;
    setMembers(updated);
  };

  const initRedirect = (targetPath = "/deadlock/lobby") => {
    setIsRedirecting(true);

    let step = 0;
    const redirectInterval = setInterval(() => {
      step++;
      if (step >= redirectMessages.length) {
        clearInterval(redirectInterval);
        navigate(targetPath);
      } else {
        setRedirectStep(step);
      }
    }, 1200);
  };

  const handleSubmit = async () => {
    if (isDeploying || isResuming) return;

    // RESUME MISSION FLOW
    if (teamExists && existingTeamData) {
      setIsResuming(true);
      showNotification(`WELCOME BACK, ${existingTeamData.name}`, "success");
      localStorage.setItem("teamId", existingTeamData._id);
      localStorage.setItem("teamName", existingTeamData.name);

      let targetPath = "/deadlock/lobby";
      if (existingTeamData.currentRound === 'crack-the-code' || existingTeamData.currentRound === 'eliminated') {
        targetPath = "/crackTheCode";
      } else if (existingTeamData.currentRound === 'deadlock') {
        targetPath = "/deadlock/lobby";
      }

      setTimeout(() => initRedirect(targetPath), 1000);
      return;
    }

    // CREATE TEAM FLOW
    if (!teamName || members.some(m => !m)) {
      showNotification("MISSING CREDENTIALS. FILL ALL FIELDS.", "error");
      return;
    }

    setIsDeploying(true);

    const teamData = {
      name: teamName,
      members: members
    };

    try {
      const response = await axios.post(`${BASE_URL}/api/admin/deadlock/team`, teamData);

      if (response.data.success) {
        showNotification("DEPLOYMENT SUCCESSFUL.", "success");
        localStorage.setItem("teamId", response.data.team._id);
        localStorage.setItem("teamName", response.data.team.name);
        setTimeout(initRedirect, 1000);
      }
    } catch (error) {
      console.error("Error deploying team:", error);
      setIsDeploying(false);
      if (error.response) {
        showNotification(error.response.data.message || "DEPLOYMENT FAILED", "error");
      } else if (error.request) {
        showNotification("CONNECTION FAILURE. CHECK SERVER.", "error");
      } else {
        showNotification("SYSTEM ERROR. ABORTING.", "error");
      }
    }
  };

  return (
    <>
      {/* Story Introduction Overlay from Reference */}
      {isLoading && <Intro onComplete={() => setIsLoading(false)} />}

      <div id="login-page">
        {/* Ambient Particle & Code Glyph Background */}
        <SceneBackground />

        {/* Advanced Redirect Overlay */}
        {isRedirecting && (
          <div id="redirect-overlay">
            <div className="redirect-content">
              <h1 className="glitch-text">
                {redirectMessages[redirectStep]}
              </h1>
            </div>
          </div>
        )}

        {/* Cyber Notification */}
        {notification && (
          <div className={`cyber-notification ${notification.type}`}>
            {notification.message}
          </div>
        )}

        {/* Header Navbar */}
        <header className="login-header">
          <div className="brand-left">
            <img src={celestiusLogo} alt="Celestius" className="celestius-brand-logo" />
          </div>
          <div className="brand-right">
            <span className="event-badge">LARPER OR CODER</span>
          </div>
        </header>

        {/* Main Content */}
        <main className="login-content">
          {/* Main Event Title Banner using ImageTypewriter directly above Team Name */}
          <div className="event-title-banner-container">
            <div className="logo-typewriter-wrapper">
              <ImageTypewriter
                imageSrc={logoTypingImg}
                boxes={LOGO_REVEAL_BOXES}
                revealedCount={revealedCount}
                showActiveCursor={!isLogoComplete}
                isComplete={isLogoComplete}
                alt="LARPER OR CODER"
              />
            </div>
          </div>

          {/* Team Name Input */}
          <div className="cyber-input-group">
            <input
              type="text"
              className="team-input"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              required
              placeholder="ENTER TEAM NAME..."
              autoComplete="off"
            />
            {teamExists && <div className="team-status-indicator">TEAM RECORD IDENTIFIED // RESUME READY</div>}
            {isTeamAvailable && <div className="team-status-indicator available">TEAM IDENTIFIER AVAILABLE</div>}
          </div>

          {/* Conditionally Render Operatives */}
          <div className={`operatives-section ${teamExists ? "hidden" : "visible"}`}>
            <div className="section-label">// ASSIGNED OPERATIVES</div>
            <div className="operatives-grid">
              {members.map((member, index) => (
                <div className="operative-card" key={index}>
                  <span className="op-number">0{index + 1}</span>
                  <input
                    type="text"
                    className="operative-input"
                    value={member}
                    placeholder={`Operative ${index + 1}`}
                    onChange={(e) => handleMemberChange(index, e.target.value)}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Action Button */}
          <button
            className={`deploy-btn ${teamExists ? "resume-mode" : ""} ${(isDeploying || isResuming) ? "deploying" : ""}`}
            onClick={handleSubmit}
            disabled={isDeploying || isResuming}
          >
            {teamExists ? (isResuming ? "RESUMING..." : "RESUME MISSION") : (isDeploying ? "DEPLOYING..." : "INITIALIZE DEPLOYMENT")}
          </button>
        </main>
      </div>
    </>
  );
};

export default Deadlock;
