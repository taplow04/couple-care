require("dotenv").config();

const http = require("http");

// Fail-fast / warn on missing configuration. Critical vars stop the process;
// email/upload vars only warn so the core app can still boot in dev.
const requiredEnv = ["MONGO_URI", "JWT_SECRET"];
const recommendedEnv = [
  "BREVO_API_KEY",
  "EMAIL_FROM",
  "APP_URL",
  "FRONTEND_URL",
  "CLOUDINARY_CLOUD_NAME",
  "CLOUDINARY_API_KEY",
  "CLOUDINARY_API_SECRET",
  "GROQ_API_KEY",
];

const missingRequired = requiredEnv.filter((key) => !process.env[key]);
if (missingRequired.length) {
  console.error(
    `[env] Missing required env vars: ${missingRequired.join(", ")}. Exiting.`,
  );
  process.exit(1);
}

const missingRecommended = recommendedEnv.filter((key) => !process.env[key]);
if (missingRecommended.length) {
  console.warn(
    `[env] Missing recommended env vars: ${missingRecommended.join(", ")} — some features (email, uploads, AI) may not work.`,
  );
}

const app = require("./app");

const connectDB = require("./config/db");

const initializeSocket = require("./modules/chat/socket");

const {
  startNotificationJobs,
} = require("./modules/notifications/notification.scheduler");

connectDB();

startNotificationJobs();

const server = http.createServer(app);

const io = require("socket.io")(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

initializeSocket(io);

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server running on ${PORT}`);
});
