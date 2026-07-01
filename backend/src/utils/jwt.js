const jwt = require("jsonwebtoken");

/**
 * Sign an access token.
 *
 * `sid` (session id) is optional and, when provided, is embedded so the auth
 * layer can look up + selectively revoke the exact session behind this token
 * (see modules/security/session.service.js + middleware/authMiddleware.js).
 *
 * Tokens minted before session management existed have NO `sid`; those are
 * grandfathered in the auth middleware so nobody is force-logged-out on deploy.
 */
const generateToken = (userId, sid) => {
  const payload = { userId };
  if (sid) {
    payload.sid = String(sid);
  }

  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || "30d",
  });
};

module.exports = generateToken;
