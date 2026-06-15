const express = require("express");

const router = express.Router();

const authenticateUser = require("../../middleware/authMiddleware");

const controller = require("./notification.controller");

router.get("/", authenticateUser, controller.getAll);

router.patch("/read-all", authenticateUser, controller.readAll);

router.patch("/:id/read", authenticateUser, controller.read);

router.delete("/:id", authenticateUser, controller.remove);

module.exports = router;
