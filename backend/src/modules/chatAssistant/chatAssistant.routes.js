const express = require("express");

const router = express.Router();

const authenticateUser = require("../../middleware/authMiddleware");
const controller = require("./chatAssistant.controller");

router.get("/context", authenticateUser, controller.context);
router.post("/suggestions", authenticateUser, controller.suggestions);
router.post("/rephrase", authenticateUser, controller.rephrase);
router.post("/draft-check", authenticateUser, controller.draftCheck);

module.exports = router;
