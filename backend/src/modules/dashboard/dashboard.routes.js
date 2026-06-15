const express = require("express");

const router = express.Router();

const authenticateUser = require("../../middleware/authMiddleware");

const { getDashboard } = require("./dashboard.controller");

router.get("/", authenticateUser, getDashboard);

module.exports = router;
