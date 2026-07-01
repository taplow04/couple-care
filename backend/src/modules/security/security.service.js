const User = require("../users/user.model");
const Session = require("./session.model");
const SecurityEvent = require("./securityEvent.model");
const { generateToken, hashToken } = require("./token.service");
const {
  sendVerificationEmail: sendVerificationEmailMessage,
  sendPasswordResetEmail: sendPasswordResetEmailMessage,
} = require("./email.service");
const sessionService = require("./session.service");
const { logEvent } = require("./securityEvent.service");

// ── Password policy (mirrors the client strength meter; enforced server-side) ──
const PASSWORD_RULES = [
  { key: "length", test: (p) => p.length >= 8, label: "At least 8 characters" },
  { key: "uppercase", test: (p) => /[A-Z]/.test(p), label: "An uppercase letter" },
  { key: "lowercase", test: (p) => /[a-z]/.test(p), label: "A lowercase letter" },
  { key: "number", test: (p) => /[0-9]/.test(p), label: "A number" },
  {
    key: "special",
    test: (p) => /[^A-Za-z0-9]/.test(p),
    label: "A special character",
  },
];

const badRequest = (message, statusCode = 400) => {
  const err = new Error(message);
  err.statusCode = statusCode;
  err.expose = true;
  return err;
};

// Reject anything below "Strong": every rule must pass.
const assertStrongPassword = (password) => {
  const pwd = String(password || "");
  const failed = PASSWORD_RULES.filter((r) => !r.test(pwd));
  if (failed.length) {
    throw badRequest(
      `Password too weak — needs: ${failed.map((f) => f.label.toLowerCase()).join(", ")}.`,
    );
  }
};

const daysBetween = (from, to = Date.now()) => {
  if (!from) return null;
  return Math.max(0, Math.floor((to - new Date(from).getTime()) / 86400000));
};

const sendVerificationEmail = async (userId) => {
  const user = await User.findById(userId);

  if (!user) {
    throw new Error("User not found");
  }

  if (user.emailVerified) {
    throw new Error("Email is already verified");
  }

  const rawToken = generateToken();
  user.emailVerificationToken = hashToken(rawToken);
  user.emailVerificationExpires = Date.now() + 24 * 60 * 60 * 1000;
  await user.save();

  await sendVerificationEmailMessage(user.email, rawToken);

  logEvent({
    userId: user._id,
    type: "verification_sent",
    message: "Verification email sent",
  });

  return { success: true };
};

const verifyEmail = async (token) => {
  const hashedToken = hashToken(token);
  const user = await User.findOne({
    emailVerificationToken: hashedToken,
    emailVerificationExpires: { $gt: Date.now() },
  });

  if (!user) {
    throw new Error("Invalid or expired email verification token");
  }

  user.emailVerified = true;
  user.emailVerificationToken = null;
  user.emailVerificationExpires = null;
  await user.save();

  logEvent({
    userId: user._id,
    type: "email_verified",
    message: "Email address verified",
  });

  return { success: true };
};

const forgotPassword = async (email) => {
  const user = await User.findOne({ email });

  if (!user) {
    return { success: true };
  }

  const rawToken = generateToken();
  user.passwordResetToken = hashToken(rawToken);
  user.passwordResetExpires = Date.now() + 60 * 60 * 1000;
  await user.save();

  // Never let a Brevo/SMTP failure surface to the client: doing so both leaks
  // whether the email exists (enumeration) and exposes server misconfig. Log it
  // for ops and always return a generic success.
  try {
    await sendPasswordResetEmailMessage(user.email, rawToken);
  } catch (err) {
    console.error("[email] password reset send failed:", err.message);
  }

  return { success: true };
};

const resetPassword = async (token, password) => {
  const hashedToken = hashToken(token);
  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  }).select("+password");

  if (!user) {
    throw new Error("Invalid or expired password reset token");
  }

  assertStrongPassword(password);

  user.password = password;
  user.passwordResetToken = null;
  user.passwordResetExpires = null;
  user.passwordChangedAt = new Date();
  await user.save();

  // A reset is a strong signal the account may have been compromised — end
  // every existing session so a leaked token can't outlive the reset.
  await sessionService.revokeAll(user._id, "password_change");
  logEvent({
    userId: user._id,
    type: "password_reset",
    message: "Password reset via email link",
  });

  return { success: true };
};

const changePassword = async (
  userId,
  currentPassword,
  newPassword,
  { ctx = {}, currentSid = null } = {},
) => {
  const user = await User.findById(userId).select("+password");

  if (!user) {
    throw new Error("User not found");
  }

  const isValidPassword = await user.comparePassword(currentPassword);

  if (!isValidPassword) {
    throw badRequest("Current password is incorrect", 400);
  }

  if (currentPassword === newPassword) {
    throw badRequest("New password must be different from your current one.");
  }

  assertStrongPassword(newPassword);

  user.password = newPassword;
  user.passwordChangedAt = new Date();
  await user.save();

  // Keep THIS device signed in, force every other session to re-authenticate.
  const revokedOthers = await sessionService.revokeOthers(
    user._id,
    currentSid,
    "password_change",
  );

  logEvent({
    userId: user._id,
    type: "password_changed",
    message: "Password changed",
    ctx,
    meta: { revokedOthers },
  });

  return { success: true, revokedOthers };
};

const getSettings = async (userId) => {
  const user = await User.findById(userId).select("settings");

  if (!user) {
    throw new Error("User not found");
  }

  return user.settings;
};

const updateSettings = async (userId, settings) => {
  const user = await User.findById(userId);

  if (!user) {
    throw new Error("User not found");
  }

  const allowedFields = [
    "notificationsEnabled",
    "aiInsightsEnabled",
    "moodRemindersEnabled",
    "memoryRemindersEnabled",
    "theme",
  ];

  allowedFields.forEach((field) => {
    if (Object.prototype.hasOwnProperty.call(settings, field)) {
      user.settings[field] = settings[field];
    }
  });

  await user.save();

  return user.settings;
};

// ── Trust / security-health score (deterministic, explainable) ──
// A clean, fully-verified single-session account lands at 92% (2FA is the one
// gap, since it's not shipped yet) — matching the Google-style nudge.
const computeTrustScore = ({ emailVerified, activeSessions, passwordAgeDays }) => {
  let score = 100;

  const passwordStale = passwordAgeDays != null && passwordAgeDays > 180;

  if (!emailVerified) score -= 30;
  score -= 8; // 2FA not enabled (future) — the standing nudge
  if (activeSessions > 3) score -= 8;
  if (activeSessions > 5) score -= 7;
  if (passwordStale) score -= 10;

  score = Math.max(0, Math.min(100, score));

  const checks = [
    { key: "email", label: "Verified email", ok: !!emailVerified, action: "verify-email" },
    {
      key: "password",
      label: passwordStale ? "Password is over 6 months old" : "Strong password",
      ok: !passwordStale,
      action: "change-password",
    },
    {
      key: "sessions",
      label: `${activeSessions} device${activeSessions === 1 ? "" : "s"} logged in`,
      ok: activeSessions <= 3,
      action: "sessions",
    },
    {
      key: "2fa",
      label: "Enable Two-Factor Authentication",
      ok: false,
      future: true,
    },
  ];

  const level = score >= 85 ? "strong" : score >= 60 ? "good" : "at_risk";
  return { score, level, checks };
};

// The "Account Security" overview card + trust score in one payload.
const getSecurityOverview = async (userId) => {
  const user = await User.findById(userId).select(
    "email emailVerified createdAt passwordChangedAt",
  );
  if (!user) throw new Error("User not found");

  const activeSessions = await sessionService.countActiveSessions(userId);
  const passwordChangedAt = user.passwordChangedAt || null;
  const passwordAgeDays = daysBetween(passwordChangedAt || user.createdAt);

  const trust = computeTrustScore({
    emailVerified: user.emailVerified,
    activeSessions,
    passwordAgeDays,
  });

  return {
    email: user.email,
    emailVerified: user.emailVerified,
    twoFactorEnabled: false, // future-ready
    accountCreatedAt: user.createdAt,
    passwordChangedAt,
    passwordAgeDays,
    activeSessions,
    trust,
  };
};

// ── Session management (thin pass-throughs with password confirmation) ──
const listSessions = (userId, currentSid) =>
  sessionService.listSessions(userId, currentSid);

const verifyPassword = async (userId, password) => {
  const user = await User.findById(userId).select("+password");
  if (!user) throw new Error("User not found");
  const ok = await user.comparePassword(String(password || ""));
  if (!ok) throw badRequest("Incorrect password", 400);
  return user;
};

const revokeSession = async (
  userId,
  sessionId,
  password,
  { ctx = {}, currentSid = null } = {},
) => {
  await verifyPassword(userId, password);

  const target = await Session.findOne({ _id: sessionId, userId });
  const isCurrent = target && target.tokenId === currentSid;

  const revoked = await sessionService.revokeSessionById(
    userId,
    sessionId,
    "user",
  );
  if (!revoked) throw badRequest("Session not found or already ended.", 404);

  logEvent({
    userId,
    type: "session_revoked",
    message: `Signed out ${target?.device || "a device"}`,
    ctx,
  });

  return { success: true, wasCurrent: isCurrent };
};

const logoutOtherDevices = async (
  userId,
  password,
  { ctx = {}, currentSid = null } = {},
) => {
  await verifyPassword(userId, password);
  const revokedOthers = await sessionService.revokeOthers(
    userId,
    currentSid,
    "logout_all",
  );

  logEvent({
    userId,
    type: "sessions_revoked_all",
    message: `Signed out ${revokedOthers} other device${revokedOthers === 1 ? "" : "s"}`,
    ctx,
  });

  return { success: true, revokedOthers };
};

// End just the current session (plain "Log Out" that also invalidates the token
// server-side, unlike a client-only token wipe).
const logoutCurrent = async (userId, currentSid, { ctx = {} } = {}) => {
  if (currentSid) {
    const session = await sessionService.getByTokenId(currentSid);
    if (session && !session.revokedAt) {
      await sessionService.revokeSessionById(userId, session._id, "logout");
    }
  }
  logEvent({ userId, type: "logout", message: "Signed out", ctx });
  return { success: true };
};

const getActivity = (userId, limit) =>
  require("./securityEvent.service").listEvents(userId, limit);

// Hard account deletion — irreversible. Password-confirmed. Soft-unmatches the
// partner (keeps co-owned couple data by design) and cascades personal cleanup.
const deleteAccount = async (userId, password) => {
  await verifyPassword(userId, password);

  const user = await User.findById(userId).select("currentCoupleId");

  // Soft-unmatch first so the partner is gated back to onboarding + gets a
  // relationship summary. Must never block deletion.
  if (user?.currentCoupleId) {
    try {
      await require("../couples/couple.service").unmatchPartner(userId);
    } catch (err) {
      console.error("[security] unmatch during delete failed:", err.message);
    }
  }

  // End every session, then cascade-delete the user's personal records.
  await sessionService.revokeAll(userId, "delete");
  await Promise.allSettled([
    Session.deleteMany({ userId }),
    SecurityEvent.deleteMany({ userId }),
    (async () => {
      try {
        await require("../push/pushSubscription.model").deleteMany({ userId });
      } catch {
        /* optional collection */
      }
    })(),
    (async () => {
      try {
        const u = await User.findById(userId).select("email");
        if (u?.email) {
          await require("../auth/pendingRegistration.model").deleteMany({
            email: u.email,
          });
        }
      } catch {
        /* optional */
      }
    })(),
  ]);

  await User.deleteOne({ _id: userId });

  return { success: true };
};

module.exports = {
  sendVerificationEmail,
  verifyEmail,
  forgotPassword,
  resetPassword,
  changePassword,
  getSettings,
  updateSettings,
  // Security Center
  getSecurityOverview,
  listSessions,
  revokeSession,
  logoutOtherDevices,
  logoutCurrent,
  getActivity,
  deleteAccount,
  PASSWORD_RULES,
};
