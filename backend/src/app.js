const express = require("express");
const cors = require("cors");

const app = express();
const routes = require("./routes");
const errorHandler = require("./middleware/errorMiddleware");

// Behind Render/Vercel's proxy the real client IP is in X-Forwarded-For. Trust
// the first proxy hop so req.ip + rate-limiting + session geo/IP are accurate.
app.set("trust proxy", 1);

app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    methods: ["GET", "POST", "PATCH", "PUT", "DELETE"],
    credentials: true,
  }),
);

// Body limits are raised to 15mb because profile photos and chat media are
// uploaded as base64 data URLs / multipart payloads. The Express default
// (100kb) silently rejects them with 413 PayloadTooLarge before the route runs.
app.use(express.json({ limit: "15mb" }));
app.use(express.urlencoded({ extended: true, limit: "15mb" }));

app.get("/", (req, res) => {
  res.status(200).json({ success: true, message: "CoupleCare API is running" });
});

app.use("/api/v1", routes);
app.use(errorHandler);

module.exports = app;
