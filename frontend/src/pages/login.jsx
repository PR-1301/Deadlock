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
const GENZ_IDLE_PROMPTS = ["Who's cooking fr...", "Waiting on twin..."];

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
  const [teamNotFound, setTeamNotFound] = useState(false);
  const [existingTeamData, setExistingTeamData] = useState(null);

  // Loading / Intro state
  const [isLoading, setIsLoading] = useState(true);

  // Redirect State
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [redirectTarget, setRedirectTarget] = useState("/deadlock/lobby");

  // Deployment State
  const [isResuming, setIsResuming] = useState(false);

  // Notification State
  const [notification, setNotification] = useState(null);

  useEffect(() => {
    document.title = "LARPER OR CODER // Celestius";
  }, []);

  // Check Team Existence & Autofill Members
  useEffect(() => {
    let cancelled = false;
    const checkTeam = async () => {
      const trimmed = debouncedTeamName.trim();
      if (!trimmed) {
        setTeamExists(false);
        setTeamNotFound(false);
        setExistingTeamData(null);
        setMembers(["", ""]);
        return;
      }

      try {
        const response = await axios.get(`${BASE_URL}/api/admin/deadlock/team/check/${encodeURIComponent(trimmed)}`);
        if (cancelled) return;

        if (response.data.success) {
          if (response.data.exists && response.data.team) {
            const team = response.data.team;
            const fetchedMembers = Array.isArray(team.members) ? team.members : [];
            setTeamExists(true);
            setTeamNotFound(false);
            setExistingTeamData(team);
            setMembers([fetchedMembers[0] || "", fetchedMembers[1] || ""]);
          } else {
            setTeamExists(false);
            setTeamNotFound(true);
            setExistingTeamData(null);
            setMembers(["", ""]);
          }
        }
      } catch (error) {
        if (!cancelled) {
          console.error("Check team error:", error);
        }
      }
    };

    checkTeam();
    return () => {
      cancelled = true;
    };
  }, [debouncedTeamName]);

  const showNotification = (message, type = "error") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleTeamNameChange = (e) => {
    const nextValue = e.target.value;
    setTeamName(nextValue);
    if (teamExists || teamNotFound) {
      setTeamExists(false);
      setTeamNotFound(false);
      setExistingTeamData(null);
      setMembers(["", ""]);
    }
  };

  const initRedirect = (targetPath = "/deadlock/lobby") => {
    setRedirectTarget(targetPath);
    setIsRedirecting(true);
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (isResuming) return;

    if (!teamExists || !existingTeamData) {
      showNotification("ENTER A REGISTERED TEAM NAME.", "error");
      return;
    }

    setIsResuming(true);
    showNotification(`WELCOME, ${existingTeamData.name}`, "success");
    localStorage.setItem("teamId", existingTeamData._id);
    localStorage.setItem("teamName", existingTeamData.name);
    if (Array.isArray(existingTeamData.members)) {
      localStorage.setItem("teamMembers", JSON.stringify(existingTeamData.members));
    }

    let targetPath = "/deadlock/lobby";
    if (existingTeamData.currentRound === 'crack-the-code' || existingTeamData.currentRound === 'eliminated') {
      targetPath = "/crackTheCode";
    } else if (existingTeamData.currentRound === 'deadlock') {
      targetPath = "/deadlock/lobby";
    }

    setTimeout(() => initRedirect(targetPath), 1000);
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
          {/* TLE Glitch Title Banner (no round badge since this also resumes Round 2) */}
          <TleLogo showBadge={false} />

          <form className="login-form" onSubmit={handleSubmit}>
            {/* Team Name Input */}
            <div className="cyber-input-group">
              <div className={`team-input-frame ${teamExists ? "is-found" : teamNotFound ? "is-missing" : ""}`}>
                <span className="input-corner tl" aria-hidden="true" />
                <span className="input-corner tr" aria-hidden="true" />
                <span className="input-corner bl" aria-hidden="true" />
                <span className="input-corner br" aria-hidden="true" />
                <input
                  type="text"
                  className="team-input"
                  value={teamName}
                  onChange={handleTeamNameChange}
                  required
                  placeholder="Drop the Duo's name..."
                  autoComplete="off"
                />
              </div>
              {teamExists && (
                <div key="status-found" className="team-status-indicator">
                  TEAM RECORD IDENTIFIED // DUO AUTOFILLED
                </div>
              )}
              {teamNotFound && (
                <div key="status-missing" className="team-status-indicator missing">
                  TEAM RECORD NOT FOUND // CHECK TEAM NAME
                </div>
              )}
            </div>

            {/* Read-only Autofilled Operatives */}
            <div className="operatives-section visible">
              <div className="section-label">// THE LOCKED-IN DUO</div>
              <div className="operatives-grid">
                {members.map((member, index) => (
                  <div
                    className={`operative-card ${member ? "is-filled" : ""}`}
                    key={`${index}-${member || "idle"}`}
                  >
                    <span className="op-number">0{index + 1}</span>
                    <span className={`operative-value ${member ? "is-filled" : ""}`}>
                      {member || GENZ_IDLE_PROMPTS[index] || "Who's pulling up..."}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Action Button */}
            <button
              type="submit"
              className={`deploy-btn ${teamExists ? "is-ready" : ""} ${isResuming ? "deploying" : ""}`}
              disabled={!teamExists || isResuming}
            >
              {isResuming ? "LOCKING IN..." : "LOCK IN"}
            </button>
          </form>
        </main>
      </div>
    </>
  );
};

export default Deadlock;
