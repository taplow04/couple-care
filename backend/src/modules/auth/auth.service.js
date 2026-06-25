const crypto = require("crypto");
const bcrypt = require("bcryptjs");

const User = require("../users/user.model");
const PendingRegistration = require("./pendingRegistration.model");
const generateToken = require("../../utils/jwt");
const { hashToken } = require("../security/token.service");
const { sendOtpEmail } = require("../security/email.service");

// ─── OTP config ──────────────────────────────────────────────────────────────
const OTP_TTL_MS = 10 * 60 * 1000; // 10 minutes
const MAX_VERIFY_ATTEMPTS = 5; // failed attempts before the OTP is invalidated
const RESEND_COOLDOWN_MS = 60 * 1000; // 60s between sends
const MAX_SENDS_PER_WINDOW = 6; // per pending row (TTL'd hourly)

const generateOtp = () => String(crypto.randomInt(100000, 1000000)); // 6 digits

// Mask an email for logs: "jane.doe@gmail.com" → "ja***@gmail.com". Never log
// the full address or the OTP itself — only enough to correlate a flow.
const maskEmail = (email) => {
  const [local = "", domain = ""] = String(email).split("@");
  const head = local.slice(0, 2);
  return `${head}${local.length > 2 ? "***" : "***"}@${domain}`;
};

const badRequest = (message, statusCode = 400) => {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
};

const sanitizeUser = (userDoc) => {
  const obj = userDoc.toObject();
  delete obj.password;
  delete obj.emailVerificationToken;
  delete obj.passwordResetToken;
  return obj;
};

// Step 1 — collect credentials, send an OTP. No User row yet.
const requestRegistration = async (data) => {
  const name = String(data.name || "").trim();
  const email = String(data.email || "")
    .trim()
    .toLowerCase();
  const password = data.password;

  if (!name || !email || !password) {
    throw badRequest("Name, email and password are required");
  }

  const existing = await User.findOne({ email });
  if (existing) {
    throw badRequest("An account with this email already exists");
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const otp = generateOtp();
  const otpHash = hashToken(otp);
  const now = Date.now();

  await PendingRegistration.findOneAndUpdate(
    { email },
    {
      name,
      email,
      passwordHash,
      otpHash,
      otpExpires: new Date(now + OTP_TTL_MS),
      attempts: 0,
      lastSentAt: new Date(now),
      sendCount: 1,
    },
    { upsert: true, returnDocument: "after", setDefaultsOnInsert: true },
  );

  // Diagnostic: OTP generated + about to send. Never log the OTP or full email.
  console.info(`[auth] OTP generated for ${maskEmail(email)} — sending verification email…`);
  await sendOtpEmail(email, otp, name);
  console.info(`[auth] verification email dispatched for ${maskEmail(email)}`);

  return { email };
};

// Step 2 — verify the OTP, create the real User, auto-login.
const verifyRegistration = async (data) => {
  const email = String(data.email || "")
    .trim()
    .toLowerCase();
  const otp = String(data.otp || "").trim();

  if (!email || !otp) {
    throw badRequest("Email and verification code are required");
  }

  const pending = await PendingRegistration.findOne({ email });
  if (!pending) {
    throw badRequest("No pending registration found. Please sign up again.");
  }

  if (pending.otpExpires.getTime() < Date.now()) {
    throw badRequest("Verification code has expired. Please request a new one.");
  }

  if (pending.attempts >= MAX_VERIFY_ATTEMPTS) {
    throw badRequest(
      "Too many incorrect attempts. Please request a new verification code.",
      429,
    );
  }

  if (hashToken(otp) !== pending.otpHash) {
    pending.attempts += 1;
    await pending.save();
    throw badRequest("Incorrect verification code");
  }

  // Guard against a race where the email got registered between steps.
  const existing = await User.findOne({ email });
  if (existing) {
    await PendingRegistration.deleteOne({ _id: pending._id });
    throw badRequest("An account with this email already exists");
  }

  // Create the user, then write the pre-hashed password directly via updateOne
  // so the model's pre-save hook does not double-hash it.
  const user = await User.create({
    name: pending.name,
    email: pending.email,
    password: crypto.randomBytes(16).toString("hex"), // throwaway, replaced below
    emailVerified: true,
  });
  await User.updateOne(
    { _id: user._id },
    { $set: { password: pending.passwordHash } },
  );

  await PendingRegistration.deleteOne({ _id: pending._id });

  const token = generateToken(user._id);
  return { user: sanitizeUser(user), token };
};

// Resend a fresh OTP, throttled.
const resendOtp = async (data) => {
  const email = String(data.email || "")
    .trim()
    .toLowerCase();

  if (!email) {
    throw badRequest("Email is required");
  }

  const pending = await PendingRegistration.findOne({ email });
  if (!pending) {
    throw badRequest("No pending registration found. Please sign up again.");
  }

  const sinceLast = Date.now() - new Date(pending.lastSentAt).getTime();
  if (sinceLast < RESEND_COOLDOWN_MS) {
    throw badRequest(
      `Please wait ${Math.ceil((RESEND_COOLDOWN_MS - sinceLast) / 1000)}s before requesting another code.`,
      429,
    );
  }

  if (pending.sendCount >= MAX_SENDS_PER_WINDOW) {
    throw badRequest(
      "Too many codes requested. Please try again later.",
      429,
    );
  }

  const otp = generateOtp();
  pending.otpHash = hashToken(otp);
  pending.otpExpires = new Date(Date.now() + OTP_TTL_MS);
  pending.attempts = 0;
  pending.lastSentAt = new Date();
  pending.sendCount += 1;
  await pending.save();

  await sendOtpEmail(email, otp, pending.name);

  return { email };
};

const loginUser = async (data) => {
  const { email, password } = data;

  const user = await User.findOne({ email: String(email || "").toLowerCase() }).select(
    "+password",
  );

  if (!user) {
    throw badRequest("Invalid credentials", 401);
  }

  const isMatch = await user.comparePassword(password);

  if (!isMatch) {
    throw badRequest("Invalid credentials", 401);
  }

  const token = generateToken(user._id);

  return { user: sanitizeUser(user), token };
};

module.exports = {
  requestRegistration,
  verifyRegistration,
  resendOtp,
  loginUser,
};
