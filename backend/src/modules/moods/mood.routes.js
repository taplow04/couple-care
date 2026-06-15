const express = require("express");

const router = express.Router();

const authenticateUser = require("../../middleware/authMiddleware");

const validate = require("../../middleware/validationMiddleware");

const { createMoodValidation } = require("./mood.validation");

const controller = require("./mood.controller");

router.post(
  "/",
  authenticateUser,
  createMoodValidation,
  validate,
  controller.create,
);

router.get("/", authenticateUser, controller.getMine);

router.get("/partner", authenticateUser, controller.getPartner);

router.get("/analytics", authenticateUser, controller.analytics);

router.delete("/:id", authenticateUser, controller.remove);

module.exports = router;
