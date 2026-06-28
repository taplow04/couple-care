const express = require("express");

const router = express.Router();

const authenticateUser = require("../../middleware/authMiddleware");
const c = require("./intelligence.controller");

router.use(authenticateUser);

router.get("/health", c.health);
router.get("/trust", c.trust);
router.get("/growth", c.growth);
router.get("/emotion", c.emotion);
router.get("/memory/:period", c.memory);
router.get("/config", c.config);

module.exports = router;
