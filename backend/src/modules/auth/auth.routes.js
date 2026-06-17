const express = require("express");
const rateLimit = require("express-rate-limit");
const { body, validationResult } = require("express-validator");

const authenticateUser = require("../../middleware/authMiddleware");
const router = express.Router();

const {
  requestOtp,
  verifyOtp,
  resend,
  login,
  getCurrentUser,
} = require("./auth.controller");

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: "Too many attempts, please try again later",
  standardHeaders: true,
  legacyHeaders: false,
});

// Tighter limiter for OTP endpoints to curb code-guessing / email spam.
const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: "Too many verification attempts, please try again later",
  standardHeaders: true,
  legacyHeaders: false,
});

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: errors.array()[0]?.msg || "Validation failed",
      errors: errors.array(),
    });
  }
  next();
};

const requestOtpValidation = [
  body("name").trim().notEmpty().withMessage("Name is required"),
  body("email")
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Email must be valid"),
  body("password")
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters long"),
  handleValidationErrors,
];

const verifyOtpValidation = [
  body("email").isEmail().withMessage("Email must be valid"),
  body("otp")
    .isLength({ min: 6, max: 6 })
    .withMessage("Code must be 6 digits")
    .isNumeric()
    .withMessage("Code must be numeric"),
  handleValidationErrors,
];

const resendValidation = [
  body("email").isEmail().withMessage("Email must be valid"),
  handleValidationErrors,
];

const loginValidation = [
  body("email")
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Email must be valid"),
  body("password").notEmpty().withMessage("Password is required"),
  handleValidationErrors,
];

router.post("/request-otp", otpLimiter, requestOtpValidation, requestOtp);
router.post("/verify-otp", otpLimiter, verifyOtpValidation, verifyOtp);
router.post("/resend-otp", otpLimiter, resendValidation, resend);
router.post("/login", authLimiter, loginValidation, login);
router.get("/me", authenticateUser, getCurrentUser);

module.exports = router;
