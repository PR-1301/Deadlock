const express = require("express");
const router = express.Router();
const {
  isConfigured,
  checkPasscode,
  issueToken,
  revokeToken,
  extractToken,
  requireAdmin,
  loginRateLimited,
  recordLoginFailure,
  clearLoginFailures,
} = require("../../utils/adminAuth");

/*
  POST /api/admin/auth/login
  Body: { passcode }
  -> { token, expiresAt }
*/
router.post("/login", (req, res) => {
  const ip = req.ip;

  if (!isConfigured()) {
    return res.status(503).json({ message: "Admin access is not configured on the server (ADMIN_PASSCODE missing)." });
  }
  if (loginRateLimited(ip)) {
    return res.status(429).json({ message: "TOO MANY ATTEMPTS. TRY AGAIN LATER." });
  }

  const { passcode } = req.body || {};
  if (!checkPasscode(passcode)) {
    recordLoginFailure(ip);
    return res.status(401).json({ message: "ACCESS DENIED: INVALID CREDENTIALS" });
  }

  clearLoginFailures(ip);
  return res.json(issueToken());
});

/*
  GET /api/admin/auth/verify
  -> 200 if the bearer token is valid, 401 otherwise
*/
router.get("/verify", requireAdmin, (req, res) => res.json({ ok: true }));

/*
  POST /api/admin/auth/logout
  -> revokes the current bearer token immediately
*/
router.post("/logout", (req, res) => {
  const token = extractToken(req);
  if (token) revokeToken(token);
  return res.json({ ok: true });
});

module.exports = router;
