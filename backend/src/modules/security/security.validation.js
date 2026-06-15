const { body, validationResult } = require("express-validator");

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

module.exports = {
  verifyEmailValidation,
  forgotPasswordValidation,
  resetPasswordValidation,
  changePasswordValidation,
};
