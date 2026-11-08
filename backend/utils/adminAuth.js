const crypto = require("crypto");

/*
  Admin authentication.

  - The passcode lives ONLY on the server: ADMIN_PASSCODE in backend/.env (and on Render).
  - POST /api/admin/auth/login exchanges it for a signed, expiring token.
  - Admin routes require `Authorization: Bearer <token>`.

  Tokens are stateless HMAC-SHA256 signatures: <base64url payload>.<base64url signature>.
  Signing key = ADMIN_TOKEN_SECRET if set, otherwise derived from ADMIN_PASSCODE,
  so changing the passcode also invalidates every token already issued.
*/

const TOKEN_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours: covers a full event day

const getPasscode = () => process.env.ADMIN_PASSCODE || "";

const getSigningKey = () =>
  crypto
    .createHash("sha256")
    .update(`deadlock-admin:${process.env.ADMIN_TOKEN_SECRET || getPasscode()}`)
    .digest();

const b64url = (buf) => Buffer.from(buf).toString("base64url");

const sign = (payload) => crypto.createHmac("sha256", getSigningKey()).update(payload).digest();

const safeEqual = (a, b) => {
  const ha = crypto.createHash("sha256").update(String(a)).digest();
  const hb = crypto.createHash("sha256").update(String(b)).digest();
  return crypto.timingSafeEqual(ha, hb);
};

const isConfigured = () => getPasscode().length > 0;

const checkPasscode = (passcode) => isConfigured() && typeof passcode === "string" && safeEqual(passcode, getPasscode());

const issueToken = () => {
  const expiresAt = Date.now() + TOKEN_TTL_MS;
  const payload = b64url(JSON.stringify({ role: "admin", exp: expiresAt }));
  return { token: `${payload}.${b64url(sign(payload))}`, expiresAt };
};

const verifyToken = (token) => {
  if (!isConfigured() || typeof token !== "string") return false;
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return false;

  const expected = sign(payload);
  const given = Buffer.from(signature, "base64url");
  if (given.length !== expected.length || !crypto.timingSafeEqual(given, expected)) return false;

  try {
    const { role, exp } = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    return role === "admin" && typeof exp === "number" && Date.now() < exp;
  } catch {
    return false;
  }
};

const extractToken = (req) => {
  const header = req.headers.authorization || "";
  return header.startsWith("Bearer ") ? header.slice(7).trim() : null;
};

// Express middleware
const requireAdmin = (req, res, next) => {
  if (req.method === "OPTIONS") return next();
  if (!isConfigured()) {
    return res.status(503).json({ message: "Admin access is not configured on the server (ADMIN_PASSCODE missing)." });
  }
  if (!verifyToken(extractToken(req))) {
    return res.status(401).json({ message: "ADMIN AUTHENTICATION REQUIRED" });
  }
  return next();
};

// Simple in-memory brute-force guard for the login endpoint: 10 failures / 10 min per IP.
const FAIL_WINDOW_MS = 10 * 60 * 1000;
const MAX_FAILURES = 10;
const failures = new Map(); // ip -> { count, resetAt }

const loginRateLimited = (ip) => {
  const entry = failures.get(ip);
  if (!entry || Date.now() > entry.resetAt) return false;
  return entry.count >= MAX_FAILURES;
};

const recordLoginFailure = (ip) => {
  const now = Date.now();
  const entry = failures.get(ip);
  if (!entry || now > entry.resetAt) failures.set(ip, { count: 1, resetAt: now + FAIL_WINDOW_MS });
  else entry.count += 1;
};

const clearLoginFailures = (ip) => failures.delete(ip);

module.exports = {
  isConfigured,
  checkPasscode,
  issueToken,
  verifyToken,
  requireAdmin,
  loginRateLimited,
  recordLoginFailure,
  clearLoginFailures,
};
