const express = require("express");

const router = express.Router();

const authenticateUser = require("../../middleware/authMiddleware");
const c = require("./reflection.controller");

// Reflections are PERSONAL (per-user) — no couple required, so they work in
// every lifecycle stage (preparing / growing / healing).
router.use(authenticateUser);

router.post("/", c.saveToday);
router.get("/today", c.getToday);
router.get("/report/:period", c.getReport);
router.get("/", c.getHistory);

module.exports = router;
