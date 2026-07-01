const jwt = require("jsonwebtoken");

const User = require("../modules/users/user.model");
const sessionService = require("../modules/security/session.service");

const authenticateUser = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      const err = new Error("Unauthorized");
      err.statusCode = 401;
      throw err;
    }

    const token = authHeader.split(" ")[1];

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.userId).select("-password");

    if (!user) {
      const err = new Error("User not found");
      err.statusCode = 401;
      throw err;
    }

    // ── Session gating ──
    // Tokens minted after session management carry a `sid`. If present, it must
    // map to an ACTIVE (non-revoked) session — this is what makes "log out this
    // device / all others" actually invalidate a token. Tokens WITHOUT a `sid`
    // are legacy and grandfathered (no forced logout on deploy).
    if (decoded.sid) {
      const session = await sessionService.getActiveSession(decoded.sid);
      if (!session) {
        const err = new Error("Session ended. Please sign in again.");
        err.statusCode = 401;
        throw err;
      }
      req.sessionId = decoded.sid;
      req.sessionDoc = session;
      sessionService.touchSession(session); // throttled, fire-and-forget
    }

    req.user = user;

    next();
  } catch (error) {
    // Normalize jwt library errors to 401 so the client can react (sign out).
    if (
      error.name === "JsonWebTokenError" ||
      error.name === "TokenExpiredError"
    ) {
      error.statusCode = 401;
    }
    next(error);
  }
};

module.exports = authenticateUser;
