const express = require("express");

const router = express.Router();

const authenticateUser = require("../../middleware/authMiddleware");

const { create, join, dashboard, me, startDate } = require("./couple.controller");

router.get("/me", authenticateUser, me);
router.post("/create", authenticateUser, create);
router.post("/join", authenticateUser, join);
router.get("/dashboard", authenticateUser, dashboard);
router.patch("/start-date", authenticateUser, startDate);

module.exports = router;
