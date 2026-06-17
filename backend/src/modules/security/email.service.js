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

const sendOtpEmail = async (email, otp, name = "") => {
  if (!process.env.EMAIL_FROM) {
    throw new Error("EMAIL_FROM is not configured");
  }

  const greeting = name ? `Hi ${String(name).trim().split(/\s+/)[0]},` : "Hi,";

  await brevo.transactionalEmails.sendTransacEmail({
    subject: "Your CoupleCare verification code",
    sender: { name: "CoupleCare", email: process.env.EMAIL_FROM },
    to: [{ email }],
    htmlContent: `
      <div style="font-family:Arial,Helvetica,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#1a1a2e">
        <h2 style="color:#ff5c8a;margin:0 0 8px">CoupleCare</h2>
        <p>${greeting}</p>
        <p>Use the verification code below to finish creating your account. It expires in 10 minutes.</p>
        <p style="font-size:32px;font-weight:700;letter-spacing:8px;color:#1a1a2e;background:#f7f8fc;border-radius:12px;text-align:center;padding:16px 0;margin:24px 0">${otp}</p>
        <p style="color:#888899;font-size:13px">If you didn't request this, you can safely ignore this email.</p>
      </div>`,
    textContent: `${greeting}\n\nYour CoupleCare verification code is ${otp}. It expires in 10 minutes.\n\nIf you didn't request this, ignore this email.`,
  });
};

module.exports = {
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendOtpEmail,
};
