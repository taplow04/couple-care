const express = require("express");
const router = express.Router();

const authenticateUser = require("../../middleware/authMiddleware");
const { vapidPublicKey, subscribe, unsubscribe, test } = require("./push.controller");

// Public key is safe to expose; the frontend needs it to subscribe.
router.get("/vapid-public-key", vapidPublicKey);
router.post("/subscribe", authenticateUser, subscribe);
router.post("/unsubscribe", authenticateUser, unsubscribe);
router.post("/test", authenticateUser, test);

module.exports = router;
