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

const registerValidation = [
  body("name").notEmpty().withMessage("Name is required"),
  body("email").notEmpty().withMessage("Email is required").isEmail().withMessage("Email must be valid"),
  body("password").isLength({ min: 6 }).withMessage("Password must be at least 6 characters long"),
  handleValidationErrors,
];

const loginValidation = [
  body("email").notEmpty().withMessage("Email is required").isEmail().withMessage("Email must be valid"),
  body("password").notEmpty().withMessage("Password is required"),
  handleValidationErrors,
];

module.exports = {
  registerValidation,
  loginValidation,
};
