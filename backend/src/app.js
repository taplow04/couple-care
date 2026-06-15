const express = require("express");
const cors = require("cors");

const app = express();
const routes = require("./routes");
const errorHandler = require("./middleware/errorMiddleware");

app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    methods: ["GET", "POST", "PATCH", "PUT", "DELETE"],
    credentials: true,
  }),
);

app.use(express.json());
app.use("/api/v1", routes);
app.use(errorHandler);

module.exports = app;
