const express = require("express");

const router = express.Router();

const authenticateUser = require("../../middleware/authMiddleware");

const controller = require("./surprise.controller");

router.get("/today", authenticateUser, controller.today);
router.post("/open", authenticateUser, controller.open);

module.exports = router;
