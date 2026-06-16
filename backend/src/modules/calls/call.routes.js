const express = require("express");

const router = express.Router();

const authenticateUser = require("../../middleware/authMiddleware");
const controller = require("./call.controller");

router.get("/history", authenticateUser, controller.getHistory);

module.exports = router;
