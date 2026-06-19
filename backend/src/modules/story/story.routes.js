const express = require("express");

const router = express.Router();

const authenticateUser = require("../../middleware/authMiddleware");

const controller = require("./story.controller");

router.get("/chapters", authenticateUser, controller.list);
router.post("/chapters", authenticateUser, controller.create);
router.patch("/chapters/:id", authenticateUser, controller.update);
router.delete("/chapters/:id", authenticateUser, controller.remove);

module.exports = router;
