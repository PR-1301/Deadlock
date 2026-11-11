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

const DEFAULT_TTL_MINUTES = 30;

const resolveTokenTtlMs = () => {
  const parsed = Number(process.env.ADMIN_TOKEN_TTL_MINUTES);
  const minutes = Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_TTL_MINUTES;
  return minutes * 60 * 1000;
};

const revokedTokens = new Map(); // jti -> exp

const pruneRevokedTokens = () => {
  const now = Date.now();
  for (const [jti, exp] of revokedTokens.entries()) {
    if (now >= exp) revokedTokens.delete(jti);
  }
};

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
  const now = Date.now();
  const expiresAt = now + resolveTokenTtlMs();
  const jti = crypto.randomBytes(12).toString("hex");
  const payload = b64url(JSON.stringify({ role: "admin", iat: now, exp: expiresAt, jti }));
  return { token: `${payload}.${b64url(sign(payload))}`, expiresAt };
};

const verifyTokenWithDetails = (token) => {
  if (!isConfigured() || typeof token !== "string") return { valid: false };
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return { valid: false };

  const expected = sign(payload);
  const given = Buffer.from(signature, "base64url");
  if (given.length !== expected.length || !crypto.timingSafeEqual(given, expected)) return { valid: false };

  try {
    const { role, exp, jti } = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (role !== "admin" || typeof exp !== "number" || Date.now() >= exp) {
      return { valid: false };
    }
    pruneRevokedTokens();
    if (jti && revokedTokens.has(jti)) {
      return { valid: false };
    }
    return { valid: true, exp, jti: jti || null };
  } catch {
    return { valid: false };
  }
};

const verifyToken = (token) => verifyTokenWithDetails(token).valid;

const revokeToken = (token) => {
  const details = verifyTokenWithDetails(token);
  if (details.valid && details.jti) {
    revokedTokens.set(details.jti, details.exp);
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
  if (!entry) return false;
  if (Date.now() > entry.resetAt) {
    failures.delete(ip);
    return false;
  }
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
  verifyTokenWithDetails,
  revokeToken,
  extractToken,
  requireAdmin,
  loginRateLimited,
  recordLoginFailure,
  clearLoginFailures,
};
