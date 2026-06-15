const { BrevoClient } = require("@getbrevo/brevo");

const brevo = new BrevoClient({
  apiKey: process.env.BREVO_API_KEY,
});

const sendVerificationEmail = async (email, token) => {
  if (!process.env.EMAIL_FROM) {
    throw new Error("EMAIL_FROM is not configured");
  }

  if (!process.env.APP_URL) {
    throw new Error("APP_URL is not configured");
  }

  const verificationUrl = `${process.env.APP_URL}/verify-email?token=${encodeURIComponent(token)}`;

  await brevo.transactionalEmails.sendTransacEmail({
    subject: "Verify your CoupleCare email",
    sender: { name: "CoupleCare", email: process.env.EMAIL_FROM },
    to: [{ email }],
    htmlContent: `<p>Please verify your email address by clicking the link below:</p><p><a href="${verificationUrl}">${verificationUrl}</a></p><p>If you did not request this email, you can safely ignore it.</p>`,
    textContent: `Please verify your email address: ${verificationUrl}`,
  });
};

const sendPasswordResetEmail = async (email, token) => {
  if (!process.env.EMAIL_FROM) {
    throw new Error("EMAIL_FROM is not configured");
  }

  if (!process.env.APP_URL) {
    throw new Error("APP_URL is not configured");
  }

  const resetUrl = `${process.env.APP_URL}/reset-password?token=${encodeURIComponent(token)}`;

  await brevo.transactionalEmails.sendTransacEmail({
    subject: "Reset your CoupleCare password",
    sender: { name: "CoupleCare", email: process.env.EMAIL_FROM },
    to: [{ email }],
    htmlContent: `<p>You requested a password reset. Click the link below to update your password:</p><p><a href="${resetUrl}">${resetUrl}</a></p><p>This link expires in one hour. If you did not request a password reset, ignore this message.</p>`,
    textContent: `Reset your password: ${resetUrl}`,
  });
};

module.exports = {
  sendVerificationEmail,
  sendPasswordResetEmail,
};
