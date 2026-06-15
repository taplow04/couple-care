require("dotenv").config();

const http = require("http");

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
