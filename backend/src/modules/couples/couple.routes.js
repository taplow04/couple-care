const express = require("express");

const router = express.Router();

const authenticateUser = require("../../middleware/authMiddleware");

const {
  create,

  join,

  dashboard,
} = require("./couple.controller");

router.post("/create", authenticateUser, create);

router.post("/join", authenticateUser, join);

router.get("/dashboard", authenticateUser, dashboard);

module.exports = router;
