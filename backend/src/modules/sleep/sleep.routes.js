const express = require("express");

const router = express.Router();

const authenticateUser = require("../../middleware/authMiddleware");

const controller = require("./sleep.controller");

router.get("/", authenticateUser, controller.mine);
router.post("/", authenticateUser, controller.create);
router.get("/partner", authenticateUser, controller.partner);
router.get("/analysis", authenticateUser, controller.analysis);
router.delete("/:id", authenticateUser, controller.remove);

module.exports = router;
