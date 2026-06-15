const express = require("express");

const router = express.Router();

const authenticateUser = require("../../middleware/authMiddleware");

const controller = require("./history.controller");

router.post("/", authenticateUser, controller.create);

router.get("/", authenticateUser, controller.getMine);

router.get("/partner", authenticateUser, controller.getPartner);

router.put("/:id", authenticateUser, controller.update);

router.delete("/:id", authenticateUser, controller.remove);

module.exports = router;
