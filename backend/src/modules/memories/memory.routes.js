const express = require("express");

const router = express.Router();

const authenticateUser = require("../../middleware/authMiddleware");

const validate = require("../../middleware/validationMiddleware");

const {
  createMemoryValidation,
  updateMemoryValidation,
  memoryIdValidation,
} = require("./memory.validation");

const controller = require("./memory.controller");

router.post(
  "/",
  authenticateUser,
  createMemoryValidation,
  validate,
  controller.create,
);

router.get("/timeline", authenticateUser, controller.timeline);

router.get("/upcoming", authenticateUser, controller.upcoming);

router.get("/stats", authenticateUser, controller.stats);

router.get("/", authenticateUser, controller.getAll);

router.get(
  "/:id",
  authenticateUser,
  memoryIdValidation,
  validate,
  controller.getOne,
);

router.put(
  "/:id",
  authenticateUser,
  memoryIdValidation,
  updateMemoryValidation,
  validate,
  controller.update,
);

router.delete(
  "/:id",
  authenticateUser,
  memoryIdValidation,
  validate,
  controller.remove,
);

module.exports = router;
