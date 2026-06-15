const express = require("express");

const router = express.Router();

const authenticateUser = require("../../middleware/authMiddleware");

const controller = require("./chat.controller");

router.post("/messages", authenticateUser, controller.send);

router.get("/messages", authenticateUser, controller.getAll);

router.patch("/messages/:id/seen", authenticateUser, controller.seen);
router.delete("/messages/:id", authenticateUser, controller.remove);

module.exports = router;
