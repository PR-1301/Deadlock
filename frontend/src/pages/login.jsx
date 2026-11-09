import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import TleLogo from "../components/TLE/TleLogo.jsx";
import celestiusLogo from "../assets/celestius-logo.png";
import larperOrCoderImg from "../assets/larper-or-coder.png";
import Intro from "../components/Intro/Intro.jsx";
import SceneBackground from "../components/Background/SceneBackground.jsx";
import ScannerLoader from "../components/Loader/ScannerLoader.jsx";
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

  const [members, setMembers] = useState(["", ""]);
  const [teamExists, setTeamExists] = useState(false);
  const [isTeamAvailable, setIsTeamAvailable] = useState(false);
  const [existingTeamData, setExistingTeamData] = useState(null);

  // Loading / Intro state
  const [isLoading, setIsLoading] = useState(true);

  // Redirect State
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [redirectTarget, setRedirectTarget] = useState("/deadlock/lobby");

  // Deployment State
  const [isDeploying, setIsDeploying] = useState(false);
  const [isResuming, setIsResuming] = useState(false);

  // Notification State
  const [notification, setNotification] = useState(null);

  useEffect(() => {
    document.title = "LARPER OR CODER // Celestius";
  }, []);

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
    setRedirectTarget(targetPath);
    setIsRedirecting(true);
  };

  const handleSubmit = async () => {
    if (isDeploying || isResuming) return;

    // RESUME MISSION FLOW
    if (teamExists && existingTeamData) {
      setIsResuming(true);
      showNotification(`WELCOME BACK, ${existingTeamData.name}`, "success");
      localStorage.setItem("teamId", existingTeamData._id);
      localStorage.setItem("teamName", existingTeamData.name);
      if (existingTeamData.members) {
        localStorage.setItem("teamMembers", JSON.stringify(existingTeamData.members));
      }

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
        if (response.data.team.members) {
          localStorage.setItem("teamMembers", JSON.stringify(response.data.team.members));
        }
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

        {/* Scanner Loading Animation matching Intro Scanner */}
        {isRedirecting && (
          <ScannerLoader
            onComplete={() => {
              navigate(redirectTarget);
            }}
          />
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
            <img src={larperOrCoderImg} alt="LARPER OR CODER" className="larper-coder-header-logo" />
          </div>
        </header>

        {/* Main Content */}
        <main className="login-content">
          {/* Round 1 TLE Glitch Title Banner */}
          <TleLogo />

          {/* Team Name Input */}
          <div className="cyber-input-group">
            <input
              type="text"
              className="team-input"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              required
              placeholder="Drop the Duo's name..."
              autoComplete="off"
            />
            {teamExists && <div className="team-status-indicator">TEAM RECORD IDENTIFIED // RESUME READY</div>}
            {isTeamAvailable && <div className="team-status-indicator available">TEAM IDENTIFIER AVAILABLE</div>}
          </div>

          {/* Conditionally Render Operatives */}
          <div className={`operatives-section ${teamExists ? "hidden" : "visible"}`}>
            <div className="section-label">// THE LOCKED-IN DUO</div>
            <div className="operatives-grid">
              {members.map((member, index) => (
                <div className="operative-card" key={index}>
                  <span className="op-number">0{index + 1}</span>
                  <input
                    type="text"
                    className="operative-input"
                    value={member}
                    placeholder={`Homie ${index + 1}`}
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
            {teamExists ? (isResuming ? "RESUMING..." : "RESUME MISSION") : (isDeploying ? "LOCKING IN..." : "LOCK IN")}
          </button>
        </main>
      </div>
    </>
  );
};

export default Deadlock;
