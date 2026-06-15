const { body } = require("express-validator");

const createMoodValidation = [
  body("moodType")
    .isIn(["happy", "sad", "angry", "stressed", "loved", "excited", "anxious"])
    .withMessage("Invalid mood type"),

  body("intensity")
    .isInt({
      min: 1,
      max: 10,
    })
    .withMessage("Intensity must be between 1 and 10"),

  body("visibility").optional().isIn(["private", "partner_only"]),
];

module.exports = {
  createMoodValidation,
};
