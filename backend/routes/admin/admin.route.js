const express = require('express');
const router = express.Router();

const {
    createMatch,
    createTeam,
    resetMatch,
    updateTeams,
    swapTeams,
    finishMatch,
    getTeam,
    getMatches,
    terminateSession,
    startAllDeadlockMatches,
    getMatchByTeamName,
    shuffleCurrentQuestion,
    checkTeam,
    promoteTeam
} = require("../../controller/admin.controller.js");

const { solveProblem } = require("../../controller/deadlock.controller.js");
const {
    getSecuritySettings,
    updateSecuritySettings,
    createSecurityLog,
    getSecurityLogs,
    clearSecurityLogs
} = require("../../controller/admin/security.controller.js");
const { requireAdmin } = require("../../utils/adminAuth");

// ---------------------------------------------------------------------------
// PUBLIC - used by player pages (registration + anti-cheat settings/logs).
// Must stay above `router.use(requireAdmin)`.
// ---------------------------------------------------------------------------
router.get("/security-settings", getSecuritySettings);
router.post("/security-logs", createSecurityLog);
router.get("/team/check/:name", checkTeam);
router.post("/team/check", checkTeam);
router.post("/team", createTeam);

// ---------------------------------------------------------------------------
// ADMIN ONLY - everything below requires a valid admin token
// ---------------------------------------------------------------------------
router.use(requireAdmin);

router.post("/security-settings", updateSecuritySettings);
router.get("/security-logs", getSecurityLogs);
router.delete("/security-logs", clearSecurityLogs);

router.post("/match", createMatch);

router.post("/solve", solveProblem);
router.post("/deadlock/start-all", startAllDeadlockMatches);
router.post("/terminate", terminateSession);
// New routes for Shuffle and Promote feature
router.get("/match/team/:name", getMatchByTeamName);
router.post("/match/:id/shuffle", shuffleCurrentQuestion);
router.post("/match/promote", promoteTeam);

router.patch("/match/:id/update-teams", updateTeams);
router.patch("/match/:id/swap", swapTeams);
router.patch("/match/:id/reset", resetMatch);
// New route: Finish by Team ID (no match ID required)
router.patch("/finish", finishMatch);
router.patch("/match/:id/finish", finishMatch);

router.get("/teams", getTeam);
router.get("/matches", getMatches);
router.delete("/matches", terminateSession); // Map delete to terminate as well for backward compatibility

module.exports = router;
