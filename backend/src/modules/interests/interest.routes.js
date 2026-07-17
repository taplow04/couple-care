const express = require("express");

const router = express.Router();

const authenticateUser = require("../../middleware/authMiddleware");
const c = require("./interest.controller");

// Interests are PERSONAL (per-user) — no couple required.
router.use(authenticateUser);

router.get("/", c.getProfile);
router.get("/meta", c.getMeta);
router.post("/signal", c.recordSignal);

module.exports = router;
