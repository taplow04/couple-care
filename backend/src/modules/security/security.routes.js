const express = require("express");
const rateLimit = require("express-rate-limit");
const { body, validationResult } = require("express-validator");
const authenticateUser = require("../../middleware/authMiddleware");
const {
  sendVerification,
  verifyEmail,
  forgotPassword,
  resetPassword,
  changePassword,
  getSettings,
  updateSettings,
  getOverview,
  getSessions,
  revokeSession,
  logoutOthers,
  logoutCurrent,
  getActivity,
  deleteAccount,
} = require("./security.controller");

const router = express.Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: "Too many attempts, please try again later",
  standardHeaders: true,
  legacyHeaders: false,
});

// Read-only Security Center endpoints are polled by the page — keep them off the
// tight password limiter but still bounded.
const readLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
});

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array(),
    });
  }
  next();
};

const verifyEmailValidation = [
  body("token")
    .notEmpty()
    .withMessage("Token is required")
    .isLength({ min: 10 })
    .withMessage("Token must be at least 10 characters"),
  handleValidationErrors,
];

const forgotPasswordValidation = [
  body("email")
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Email must be valid"),
  handleValidationErrors,
];

const resetPasswordValidation = [
  body("token").notEmpty().withMessage("Token is required"),
  body("password")
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters"),
  handleValidationErrors,
];

const changePasswordValidation = [
  body("currentPassword")
    .isLength({ min: 8 })
    .withMessage("Current password must be at least 8 characters"),
  body("newPassword")
    .isLength({ min: 8 })
    .withMessage("New password must be at least 8 characters")
    .matches(/[A-Z]/)
    .withMessage("New password needs an uppercase letter")
    .matches(/[a-z]/)
    .withMessage("New password needs a lowercase letter")
    .matches(/[0-9]/)
    .withMessage("New password needs a number")
    .matches(/[^A-Za-z0-9]/)
    .withMessage("New password needs a special character"),
  handleValidationErrors,
];

const passwordConfirmValidation = [
  body("password").notEmpty().withMessage("Password is required"),
  handleValidationErrors,
];

router.post(
  "/send-verification",
  authLimiter,
  authenticateUser,
  sendVerification,
);
router.post("/verify-email", authLimiter, verifyEmailValidation, verifyEmail);
router.post(
  "/forgot-password",
  authLimiter,
  forgotPasswordValidation,
  forgotPassword,
);
router.post(
  "/reset-password",
  authLimiter,
  resetPasswordValidation,
  resetPassword,
);
router.patch(
  "/change-password",
  authLimiter,
  authenticateUser,
  changePasswordValidation,
  changePassword,
);
router.get("/settings", authenticateUser, getSettings);
router.patch("/settings", authenticateUser, updateSettings);

// ── Security Center ──
router.get("/overview", readLimiter, authenticateUser, getOverview);
router.get("/sessions", readLimiter, authenticateUser, getSessions);
router.get("/activity", readLimiter, authenticateUser, getActivity);

router.post("/logout", authenticateUser, logoutCurrent);
router.post(
  "/sessions/logout-others",
  authLimiter,
  authenticateUser,
  passwordConfirmValidation,
  logoutOthers,
);
router.delete(
  "/sessions/:id",
  authLimiter,
  authenticateUser,
  passwordConfirmValidation,
  revokeSession,
);
router.post(
  "/delete-account",
  authLimiter,
  authenticateUser,
  passwordConfirmValidation,
  deleteAccount,
);

module.exports = router;
