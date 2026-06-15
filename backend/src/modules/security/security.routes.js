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
} = require("./security.controller");

const router = express.Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: "Too many attempts, please try again later",
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
    .withMessage("New password must be at least 8 characters"),
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

module.exports = router;
