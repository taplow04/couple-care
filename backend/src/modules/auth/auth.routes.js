const express = require("express");
const rateLimit = require("express-rate-limit");
const { body, validationResult } = require("express-validator");

const authenticateUser = require("../../middleware/authMiddleware");
const router = express.Router();

const { register, login, getCurrentUser } = require("./auth.controller");

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

const registerValidation = [
  body("name").notEmpty().withMessage("Name is required"),
  body("email")
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Email must be valid"),
  body("password")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters long"),
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

router.post("/register", authLimiter, registerValidation, register);
router.post("/login", authLimiter, loginValidation, login);
router.get("/me", authenticateUser, getCurrentUser);

module.exports = router;
