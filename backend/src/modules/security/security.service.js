const User = require("../users/user.model");
const { generateToken, hashToken } = require("./token.service");
const {
  sendVerificationEmail: sendVerificationEmailMessage,
  sendPasswordResetEmail: sendPasswordResetEmailMessage,
} = require("./email.service");

const sendVerificationEmail = async (userId) => {
  const user = await User.findById(userId);

  if (!user) {
    throw new Error("User not found");
  }

  if (user.emailVerified) {
    throw new Error("Email is already verified");
  }

  const rawToken = generateToken();
  user.emailVerificationToken = hashToken(rawToken);
  user.emailVerificationExpires = Date.now() + 24 * 60 * 60 * 1000;
  await user.save();

  await sendVerificationEmailMessage(user.email, rawToken);

  return { success: true };
};

const verifyEmail = async (token) => {
  const hashedToken = hashToken(token);
  const user = await User.findOne({
    emailVerificationToken: hashedToken,
    emailVerificationExpires: { $gt: Date.now() },
  });

  if (!user) {
    throw new Error("Invalid or expired email verification token");
  }

  user.emailVerified = true;
  user.emailVerificationToken = null;
  user.emailVerificationExpires = null;
  await user.save();

  return { success: true };
};

const forgotPassword = async (email) => {
  const user = await User.findOne({ email });

  if (!user) {
    return { success: true };
  }

  const rawToken = generateToken();
  user.passwordResetToken = hashToken(rawToken);
  user.passwordResetExpires = Date.now() + 60 * 60 * 1000;
  await user.save();

  // Never let a Brevo/SMTP failure surface to the client: doing so both leaks
  // whether the email exists (enumeration) and exposes server misconfig. Log it
  // for ops and always return a generic success.
  try {
    await sendPasswordResetEmailMessage(user.email, rawToken);
  } catch (err) {
    console.error("[email] password reset send failed:", err.message);
  }

  return { success: true };
};

const resetPassword = async (token, password) => {
  const hashedToken = hashToken(token);
  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  }).select("+password");

  if (!user) {
    throw new Error("Invalid or expired password reset token");
  }

  user.password = password;
  user.passwordResetToken = null;
  user.passwordResetExpires = null;
  await user.save();

  return { success: true };
};

const changePassword = async (userId, currentPassword, newPassword) => {
  const user = await User.findById(userId).select("+password");

  if (!user) {
    throw new Error("User not found");
  }

  const isValidPassword = await user.comparePassword(currentPassword);

  if (!isValidPassword) {
    throw new Error("Current password is incorrect");
  }

  user.password = newPassword;
  await user.save();

  return { success: true };
};

const getSettings = async (userId) => {
  const user = await User.findById(userId).select("settings");

  if (!user) {
    throw new Error("User not found");
  }

  return user.settings;
};

const updateSettings = async (userId, settings) => {
  const user = await User.findById(userId);

  if (!user) {
    throw new Error("User not found");
  }

  const allowedFields = [
    "notificationsEnabled",
    "aiInsightsEnabled",
    "moodRemindersEnabled",
    "memoryRemindersEnabled",
  ];

  allowedFields.forEach((field) => {
    if (Object.prototype.hasOwnProperty.call(settings, field)) {
      user.settings[field] = settings[field];
    }
  });

  await user.save();

  return user.settings;
};

module.exports = {
  sendVerificationEmail,
  verifyEmail,
  forgotPassword,
  resetPassword,
  changePassword,
  getSettings,
  updateSettings,
};
