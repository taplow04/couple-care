const express = require("express");

const router = express.Router();

const authenticateUser = require("../../middleware/authMiddleware");

const controller = require("./coach.controller");

router.get("/conversations", authenticateUser, controller.list);
router.post("/conversations", authenticateUser, controller.create);
router.get("/conversations/:id", authenticateUser, controller.getOne);
router.delete("/conversations/:id", authenticateUser, controller.remove);

// Send a message to a conversation; use "new" as the id to start a fresh one.
router.post("/conversations/:id/message", authenticateUser, controller.message);

module.exports = router;
