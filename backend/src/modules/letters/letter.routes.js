const express = require("express");

const router = express.Router();

const authenticateUser = require("../../middleware/authMiddleware");

const controller = require("./letter.controller");

router.post("/generate", authenticateUser, controller.generate);
router.post("/", authenticateUser, controller.save);
router.get("/", authenticateUser, controller.list);
router.post("/:id/share", authenticateUser, controller.share);
router.delete("/:id", authenticateUser, controller.remove);

module.exports = router;
