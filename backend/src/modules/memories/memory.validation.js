const { body, param } = require("express-validator");

const allowedMemoryTypes = [
  "date",
  "trip",
  "birthday",
  "anniversary",
  "proposal",
  "gift",
  "milestone",
  "other",
];

const allowedUpdateFields = [
  "title",
  "description",
  "memoryType",
  "memoryDate",
  "photos",
];

const createMemoryValidation = [
  body("title")
    .trim()
    .notEmpty()
    .withMessage("Title is required")
    .isLength({
      max: 100,
    })
    .withMessage("Title cannot exceed 100 characters"),

  body("description")
    .optional()
    .trim()
    .isLength({
      max: 1000,
    })
    .withMessage("Description cannot exceed 1000 characters"),

  body("memoryDate")
    .notEmpty()
    .withMessage("Memory date is required")
    .isISO8601()
    .withMessage("Memory date must be a valid date")
    .toDate(),

  body("memoryType")
    .optional()
    .isIn(allowedMemoryTypes)
    .withMessage("Invalid memory type"),

  body("photos").optional().isArray().withMessage("Photos must be an array"),

  body("photos.*")
    .optional()
    .isString()
    .withMessage("Each photo must be a string")
    .trim(),
];

const updateMemoryValidation = [
  body().custom((value) => {
    const fields = Object.keys(value || {});

    if (!fields.length) {
      throw new Error("At least one field is required");
    }

    const invalidFields = fields.filter(
      (field) => !allowedUpdateFields.includes(field),
    );

    if (invalidFields.length) {
      throw new Error(`Invalid update fields: ${invalidFields.join(", ")}`);
    }

    return true;
  }),

  body("title")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Title cannot be empty")
    .isLength({
      max: 100,
    })
    .withMessage("Title cannot exceed 100 characters"),

  body("description")
    .optional()
    .trim()
    .isLength({
      max: 1000,
    })
    .withMessage("Description cannot exceed 1000 characters"),

  body("memoryDate")
    .optional()
    .isISO8601()
    .withMessage("Memory date must be a valid date")
    .toDate(),

  body("memoryType")
    .optional()
    .isIn(allowedMemoryTypes)
    .withMessage("Invalid memory type"),

  body("photos").optional().isArray().withMessage("Photos must be an array"),

  body("photos.*")
    .optional()
    .isString()
    .withMessage("Each photo must be a string")
    .trim(),
];

const memoryIdValidation = [
  param("id").isMongoId().withMessage("Invalid memory id"),
];

module.exports = {
  createMemoryValidation,
  updateMemoryValidation,
  memoryIdValidation,
};
