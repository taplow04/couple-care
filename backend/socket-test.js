const { io } = require("socket.io-client");

const SERVER_URL = process.env.SOCKET_URL || "http://localhost:5000";
const COUPLE_ID = process.env.COUPLE_ID;
const USER_A_TOKEN = process.env.USER_A_TOKEN;
const USER_B_TOKEN = process.env.USER_B_TOKEN;
const TEST_TIMEOUT_MS = 10000;

const logSuccess = (message) => console.log(`[PASS] ${message}`);
const logFailure = (message, error) => {
  console.error(`[FAIL] ${message}`);

  if (error) {
    console.error(error);
  }
};

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const assertEnv = () => {
  const missing = [];

  if (!COUPLE_ID) missing.push("COUPLE_ID");
  if (!USER_A_TOKEN) missing.push("USER_A_TOKEN");
  if (!USER_B_TOKEN) missing.push("USER_B_TOKEN");

  if (missing.length) {
    throw new Error(
      `Missing required env vars: ${missing.join(
        ", ",
      )}\nExample:\nCOUPLE_ID=... USER_A_TOKEN=... USER_B_TOKEN=... node socket-test.js`,
    );
  }
};

const connectClient = (label, token) => {
  return new Promise((resolve, reject) => {
    const socket = io(SERVER_URL, {
      auth: {
        token,
      },
      reconnection: false,
      timeout: TEST_TIMEOUT_MS,
    });

    socket.on("connect", () => {
      logSuccess(`${label} connected as socket ${socket.id}`);
      resolve(socket);
    });

    socket.on("connect_error", (error) => {
      reject(new Error(`${label} connect_error: ${error.message}`));
    });

    socket.on("socket:error", (error) => {
      console.error(`[SOCKET ERROR] ${label}:`, error);
    });
  });
};

const emitWithAck = (socket, event, payload) => {
  return new Promise((resolve, reject) => {
    socket.timeout(TEST_TIMEOUT_MS).emit(event, payload, (error, response) => {
      if (error) {
        reject(new Error(`${event} acknowledgement timed out`));
        return;
      }

      if (!response?.success) {
        reject(new Error(`${event} failed: ${response?.message}`));
        return;
      }

      resolve(response);
    });
  });
};

const waitForEvent = (socket, event) => {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      socket.off(event, onEvent);
      reject(new Error(`${event} was not received within timeout`));
    }, TEST_TIMEOUT_MS);

    const onEvent = (payload) => {
      clearTimeout(timer);
      socket.off(event, onEvent);
      resolve(payload);
    };

    socket.on(event, onEvent);
  });
};

const run = async () => {
  assertEnv();

  let userA;
  let userB;

  try {
    userA = await connectClient("User A", USER_A_TOKEN);
    userB = await connectClient("User B", USER_B_TOKEN);

    await emitWithAck(userA, "join:room", COUPLE_ID);
    logSuccess("User A joined couple room");

    await emitWithAck(userB, "join:room", COUPLE_ID);
    logSuccess("User B joined couple room");

    const typingStartReceived = waitForEvent(userB, "typing:start");
    await emitWithAck(userA, "typing:start", COUPLE_ID);
    await typingStartReceived;
    logSuccess("User B received typing:start from User A");

    const typingStopReceived = waitForEvent(userB, "typing:stop");
    await emitWithAck(userA, "typing:stop", COUPLE_ID);
    await typingStopReceived;
    logSuccess("User B received typing:stop from User A");

    const messageText = `Socket test message ${new Date().toISOString()}`;
    const messageReceived = waitForEvent(userB, "message:receive");

    const sendAck = await emitWithAck(userA, "message:send", {
      coupleId: COUPLE_ID,
      text: messageText,
    });

    const receivedMessage = await messageReceived;

    if (receivedMessage.text !== messageText) {
      throw new Error("Received message text did not match sent text");
    }

    logSuccess("User B received message from User A");
    logSuccess(`message:send acknowledgement received: ${sendAck.data.text}`);

    const seenReceived = waitForEvent(userA, "message:seen");

    await emitWithAck(userB, "message:seen", {
      coupleId: COUPLE_ID,
      messageId: "000000000000000000000001",
    });

    await seenReceived;
    logSuccess("User A received message:seen from User B");

    await wait(250);
    logSuccess("Socket event test completed successfully");
  } catch (error) {
    logFailure("Socket event test failed", error.message);
    process.exitCode = 1;
  } finally {
    if (userA) userA.disconnect();
    if (userB) userB.disconnect();
  }
};

run();
