const express = require("express");

const router = express.Router();

const authenticateUser = require("../../middleware/authMiddleware");
const controller = require("./profile.controller");

router.get("/me", authenticateUser, controller.me);
router.get("/partner", authenticateUser, controller.partner);
router.get("/journey", authenticateUser, controller.journey);
router.get("/relationship", authenticateUser, controller.relationship);
router.get("/trust", authenticateUser, controller.trust);
router.get("/passport", authenticateUser, controller.passport);

module.exports = router;
