const express = require("express");

const router = express.Router();

const authenticateUser = require("../../middleware/authMiddleware");

const controller = require("./bucket.controller");

router.get("/", authenticateUser, controller.list);
router.get("/stats", authenticateUser, controller.stats);
router.post("/", authenticateUser, controller.create);
router.patch("/:id/complete", authenticateUser, controller.complete);
router.patch("/:id", authenticateUser, controller.update);
router.delete("/:id", authenticateUser, controller.remove);

module.exports = router;
