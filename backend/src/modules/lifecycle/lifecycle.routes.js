const express = require("express");

const router = express.Router();

const authenticateUser = require("../../middleware/authMiddleware");
const c = require("./lifecycle.controller");

router.use(authenticateUser);

router.get("/summary", c.summary);
router.get("/journey", c.journey);

// Private Growth Report (owner only).
router.get("/growth-report/questions", c.reportQuestions);
router.get("/growth-report", c.getReport);
router.post("/growth-report", c.createReport);

module.exports = router;
