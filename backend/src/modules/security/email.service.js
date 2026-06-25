/**
 * Email service — builds the actual message content for each transactional
 * email and delegates delivery to the resilient transport (email.transport.js),
 * which owns retries, timeouts, fallback and error handling.
 *
 * These functions throw EmailDeliveryError (a safe, user-facing message) only
 * when delivery ultimately fails; they never surface a raw provider response.
 */
const { sendEmail, EmailDeliveryError } = require("./email.transport");

const OTP_USER_MESSAGE =
  "Unable to send verification email at the moment. Please try again later.";
const VERIFY_USER_MESSAGE =
  "Unable to send the verification email at the moment. Please try again later.";
const RESET_USER_MESSAGE =
  "Unable to send the password reset email at the moment. Please try again later.";

const sendVerificationEmail = async (email, token) => {
  if (!process.env.APP_URL) {
    console.error("[email] APP_URL is not configured — cannot build verify link.");
    throw new EmailDeliveryError(VERIFY_USER_MESSAGE);
  }

  const verificationUrl = `${process.env.APP_URL}/verify-email?token=${encodeURIComponent(token)}`;

  return sendEmail(
    {
      to: email,
      subject: "Verify your CoupleCare email",
      htmlContent: `<p>Please verify your email address by clicking the link below:</p><p><a href="${verificationUrl}">${verificationUrl}</a></p><p>If you did not request this email, you can safely ignore it.</p>`,
      textContent: `Please verify your email address: ${verificationUrl}`,
    },
    { userMessage: VERIFY_USER_MESSAGE },
  );
};

const sendPasswordResetEmail = async (email, token) => {
  if (!process.env.APP_URL) {
    console.error("[email] APP_URL is not configured — cannot build reset link.");
    throw new EmailDeliveryError(RESET_USER_MESSAGE);
  }

  const resetUrl = `${process.env.APP_URL}/reset-password?token=${encodeURIComponent(token)}`;

  return sendEmail(
    {
      to: email,
      subject: "Reset your CoupleCare password",
      htmlContent: `<p>You requested a password reset. Click the link below to update your password:</p><p><a href="${resetUrl}">${resetUrl}</a></p><p>This link expires in one hour. If you did not request a password reset, ignore this message.</p>`,
      textContent: `Reset your password: ${resetUrl}`,
    },
    { userMessage: RESET_USER_MESSAGE },
  );
};

const sendOtpEmail = async (email, otp, name = "") => {
  const greeting = name ? `Hi ${String(name).trim().split(/\s+/)[0]},` : "Hi,";

  return sendEmail(
    {
      to: email,
      subject: "Your CoupleCare verification code",
      htmlContent: `
      <div style="font-family:Arial,Helvetica,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#1a1a2e">
        <h2 style="color:#ff5c8a;margin:0 0 8px">CoupleCare</h2>
        <p>${greeting}</p>
        <p>Use the verification code below to finish creating your account. It expires in 10 minutes.</p>
        <p style="font-size:32px;font-weight:700;letter-spacing:8px;color:#1a1a2e;background:#f7f8fc;border-radius:12px;text-align:center;padding:16px 0;margin:24px 0">${otp}</p>
        <p style="color:#888899;font-size:13px">If you didn't request this, you can safely ignore this email.</p>
      </div>`,
      textContent: `${greeting}\n\nYour CoupleCare verification code is ${otp}. It expires in 10 minutes.\n\nIf you didn't request this, ignore this email.`,
    },
    { userMessage: OTP_USER_MESSAGE },
  );
};

module.exports = {
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendOtpEmail,
};
