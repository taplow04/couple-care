/**
 * Centralized, resilient email transport.
 *
 * Every outbound email in CoupleCare goes through sendEmail() here. This is the
 * single place that talks to an email provider, so retries, timeouts, fallback,
 * error classification and structured logging live in ONE spot.
 *
 * Design goals (production hardening):
 *   • A provider failure NEVER leaks its raw response to the client. The only
 *     thing callers ever see on failure is an EmailDeliveryError carrying a
 *     safe, generic, user-facing message. Full provider detail is logged
 *     server-side only.
 *   • Transient failures (network blips, 429, provider 5xx, timeouts) are
 *     retried with exponential backoff. Non-transient failures (401/403 from an
 *     IP allowlist or bad key, 4xx invalid request) short-circuit — retrying
 *     them is pointless.
 *   • If Brevo's HTTP API is unavailable (e.g. the "unrecognised IP" 401 that
 *     blocks the transactional API), an OPTIONAL SMTP relay fallback is used
 *     when SMTP_* env vars are configured. This is a code-level resilience path
 *     that does not depend on any provider dashboard change.
 *   • It is config-tolerant: a missing API key / SMTP creds degrade gracefully
 *     to a clean failure instead of crashing the process at import time.
 */
const { BrevoClient } = require("@getbrevo/brevo");
const nodemailer = require("nodemailer");

const FROM_NAME = "CoupleCare";
const fromEmail = () => process.env.EMAIL_FROM;

const SEND_TIMEOUT_MS = 10000; // per provider attempt
const MAX_ATTEMPTS = 3; // primary-provider attempts before fallback
const BASE_BACKOFF_MS = 400; // 400ms, 800ms, 1600ms …

const DEFAULT_USER_MESSAGE =
  "We're unable to send your email right now. Please try again in a few minutes.";

/**
 * Operational error meaning "we couldn't deliver the email". `expose: true`
 * tells the global error handler its message is safe to show the client; the
 * underlying provider cause is attached for server logs only and never sent.
 */
class EmailDeliveryError extends Error {
  constructor(message, { cause, statusCode = 503 } = {}) {
    super(message);
    this.name = "EmailDeliveryError";
    this.statusCode = statusCode;
    this.expose = true;
    this.isOperational = true;
    if (cause) this.cause = cause;
  }
}

// ─── Lazy provider singletons (don't crash at import on missing config) ───────
let _brevo = null;
const brevoClient = () => {
  if (!process.env.BREVO_API_KEY) return null;
  if (!_brevo) _brevo = new BrevoClient({ apiKey: process.env.BREVO_API_KEY });
  return _brevo;
};

let _smtp = null;
const smtpTransport = () => {
  const { SMTP_HOST, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) return null; // fallback not configured
  if (!_smtp) {
    const host = SMTP_HOST.trim();
    const user = SMTP_USER.trim();
    let pass = SMTP_PASS.trim();
    // Gmail App Passwords are shown in 4-char groups separated by spaces but must
    // be supplied WITHOUT them; strip internal whitespace for Gmail specifically
    // (a very common copy-paste footgun that otherwise fails auth silently).
    if (/gmail\.com$/i.test(host)) pass = pass.replace(/\s+/g, "");

    _smtp = nodemailer.createTransport({
      host,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: String(process.env.SMTP_SECURE) === "true",
      auth: { user, pass },
    });
  }
  return _smtp;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Bound how long we wait on a provider. The underlying request isn't cancelled,
// but our flow stops blocking and can move on to a retry / the fallback.
const withTimeout = (promise, ms, label) =>
  Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(
        () =>
          reject(
            Object.assign(new Error(`${label} timed out after ${ms}ms`), {
              code: "ETIMEDOUT",
              isTimeout: true,
            }),
          ),
        ms,
      ),
    ),
  ]);

// Dig an HTTP status out of whatever shape the SDK threw.
const statusOf = (err) =>
  err?.statusCode ??
  err?.status ??
  err?.response?.statusCode ??
  err?.response?.status ??
  null;

// Decide whether a retry could ever help.
const classify = (err) => {
  if (err?.isTimeout || err?.code === "ETIMEDOUT")
    return { kind: "timeout", retryable: true };

  const status = statusOf(err);
  if (status === 429) return { kind: "rate_limit", retryable: true };
  if (status === 401 || status === 403)
    return { kind: "auth", retryable: false }; // bad key / IP allowlist — retry won't help
  if (status != null && status >= 500)
    return { kind: "provider_5xx", retryable: true };
  if (status != null && status >= 400)
    return { kind: "invalid_request", retryable: false };

  if (["ECONNRESET", "ENOTFOUND", "ECONNREFUSED", "EAI_AGAIN"].includes(err?.code))
    return { kind: "network", retryable: true };
  if (err?.code === "ENOCONFIG") return { kind: "config", retryable: false };

  return { kind: "unknown", retryable: true };
};

// Build a rich one-line description for SERVER LOGS ONLY (never sent to client).
const describe = (err) => {
  const status = statusOf(err);
  const body = err?.body ?? err?.response?.body ?? err?.response?.data;
  const bodyStr = body
    ? typeof body === "string"
      ? body
      : JSON.stringify(body)
    : "";
  return [
    err?.message,
    status != null ? `status=${status}` : "",
    bodyStr ? `body=${bodyStr}` : "",
    err?.code ? `code=${err.code}` : "",
  ]
    .filter(Boolean)
    .join(" | ");
};

// ─── Providers ────────────────────────────────────────────────────────────────
// Each provider returns "sent" on success, "skip" when not configured, or throws
// on a real failure. This lets the orchestrator distinguish "try the next
// provider" (skip) from "this provider failed" (throw → maybe retry/fallback).
const sendViaBrevo = async (msg) => {
  const client = brevoClient();
  if (!client) return "skip"; // BREVO_API_KEY not set

  await withTimeout(
    client.transactionalEmails.sendTransacEmail({
      subject: msg.subject,
      sender: { name: FROM_NAME, email: fromEmail() },
      to: [{ email: msg.to }],
      htmlContent: msg.htmlContent,
      textContent: msg.textContent,
    }),
    SEND_TIMEOUT_MS,
    "brevo.sendTransacEmail",
  );
  return "sent";
};

const sendViaSmtp = async (msg) => {
  const transport = smtpTransport();
  if (!transport) return "skip"; // SMTP_* not set

  await withTimeout(
    transport.sendMail({
      from: { name: FROM_NAME, address: fromEmail() },
      to: msg.to,
      subject: msg.subject,
      html: msg.htmlContent,
      text: msg.textContent,
    }),
    SEND_TIMEOUT_MS,
    "smtp.sendMail",
  );
  return "sent";
};

// SendGrid HTTP API (port 443) — works on Render, where outbound SMTP ports
// (25/465/587) are blocked. Dependency-free via global fetch (Node 18+). Single
// Sender Verification lets you send to ANY recipient without owning a domain.
const sendViaSendgrid = async (msg) => {
  const key = process.env.SENDGRID_API_KEY;
  if (!key) return "skip";

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), SEND_TIMEOUT_MS);
  try {
    const res = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key.trim()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: msg.to }] }],
        from: { email: fromEmail(), name: FROM_NAME },
        subject: msg.subject,
        // SendGrid requires text/plain BEFORE text/html.
        content: [
          { type: "text/plain", value: msg.textContent },
          { type: "text/html", value: msg.htmlContent },
        ],
      }),
      signal: controller.signal,
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw Object.assign(new Error(`SendGrid responded ${res.status}`), {
        statusCode: res.status,
        body,
      });
    }
    return "sent";
  } catch (err) {
    if (err.name === "AbortError") {
      throw Object.assign(
        new Error(`sendgrid.send timed out after ${SEND_TIMEOUT_MS}ms`),
        { code: "ETIMEDOUT", isTimeout: true },
      );
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
};

// Mailjet HTTP API (port 443) — works on Render. FREE FOREVER (6k/mo, 200/day),
// no domain required (verify a single sender email). Basic auth with two keys.
const sendViaMailjet = async (msg) => {
  const apiKey = process.env.MAILJET_API_KEY;
  const secret = process.env.MAILJET_SECRET_KEY;
  if (!apiKey || !secret) return "skip";

  const auth = Buffer.from(`${apiKey.trim()}:${secret.trim()}`).toString("base64");
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), SEND_TIMEOUT_MS);
  try {
    const res = await fetch("https://api.mailjet.com/v3.1/send", {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        Messages: [
          {
            From: { Email: fromEmail(), Name: FROM_NAME },
            To: [{ Email: msg.to }],
            Subject: msg.subject,
            TextPart: msg.textContent,
            HTMLPart: msg.htmlContent,
          },
        ],
      }),
      signal: controller.signal,
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw Object.assign(new Error(`Mailjet responded ${res.status}`), {
        statusCode: res.status,
        body,
      });
    }
    return "sent";
  } catch (err) {
    if (err.name === "AbortError") {
      throw Object.assign(
        new Error(`mailjet.send timed out after ${SEND_TIMEOUT_MS}ms`),
        { code: "ETIMEDOUT", isTimeout: true },
      );
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
};

const PROVIDERS = {
  mailjet: sendViaMailjet,
  sendgrid: sendViaSendgrid,
  brevo: sendViaBrevo,
  smtp: sendViaSmtp,
};

// Provider order is env-driven so delivery can be routed AROUND a blocked path
// without a code change. NOTE: Render blocks outbound SMTP ports, so prefer the
// HTTP-API providers (sendgrid/brevo) in production.
//   EMAIL_PROVIDER=mailjet     → Mailjet HTTP API only  (free forever — recommended)
//   EMAIL_PROVIDER=sendgrid    → SendGrid HTTP API only
//   EMAIL_PROVIDER=brevo       → Brevo HTTP API only    (free forever)
//   EMAIL_PROVIDER=smtp        → SMTP only  (does NOT work on Render)
//   EMAIL_PROVIDER=smtp_first  → SMTP, then Brevo fallback
//   (default / auto)           → Mailjet → SendGrid → Brevo → SMTP (first configured wins)
const providerOrder = () => {
  switch (String(process.env.EMAIL_PROVIDER || "auto").toLowerCase()) {
    case "mailjet":
      return ["mailjet"];
    case "sendgrid":
      return ["sendgrid"];
    case "brevo":
      return ["brevo"];
    case "smtp":
      return ["smtp"];
    case "smtp_first":
      return ["smtp", "brevo"];
    default:
      return ["mailjet", "sendgrid", "brevo", "smtp"];
  }
};

/**
 * Send an email resiliently across the configured providers. Resolves on the
 * first provider that delivers; throws EmailDeliveryError (safe message) only if
 * EVERY configured provider fails.
 *
 * @param {{to,subject,htmlContent,textContent}} msg
 * @param {{userMessage?:string}} opts  user-facing message on total failure
 */
const sendEmail = async (msg, { userMessage } = {}) => {
  const safeMessage = userMessage || DEFAULT_USER_MESSAGE;

  if (!fromEmail()) {
    console.error("[email] EMAIL_FROM is not configured — cannot send email.");
    throw new EmailDeliveryError(safeMessage);
  }

  let lastErr = null;
  let anyConfigured = false;

  for (const name of providerOrder()) {
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      try {
        const result = await PROVIDERS[name](msg);
        if (result === "skip") break; // provider not configured → next provider
        anyConfigured = true;
        if (attempt > 1 || name !== providerOrder()[0]) {
          console.info(`[email] delivered via ${name} (attempt ${attempt}) → ${msg.to}`);
        }
        return { ok: true, provider: name };
      } catch (err) {
        anyConfigured = true;
        lastErr = err;
        const { kind, retryable } = classify(err);
        console.error(
          `[email] ${name} attempt ${attempt}/${MAX_ATTEMPTS} failed (${kind}) → ${msg.to}: ${describe(err)}`,
        );
        if (!retryable) break; // e.g. the "unrecognised IP" 401 — go to next provider
        if (attempt < MAX_ATTEMPTS) await sleep(BASE_BACKOFF_MS * 2 ** (attempt - 1));
      }
    }
  }

  if (!anyConfigured) {
    console.error(
      "[email] NO email provider configured — set BREVO_API_KEY or SMTP_HOST/SMTP_USER/SMTP_PASS.",
    );
  }
  console.error(`[email] all providers failed → ${msg.to}. Last error: ${describe(lastErr)}`);
  throw new EmailDeliveryError(safeMessage, { cause: lastErr });
};

// Masked, secret-safe summary of the email config for startup diagnostics.
const mask = (v) =>
  v ? `${String(v).slice(0, 4)}…(len ${String(v).length})` : "(unset)";
const emailConfigSummary = () => {
  const smtpReady = !!(
    process.env.SMTP_HOST &&
    process.env.SMTP_USER &&
    process.env.SMTP_PASS
  );
  return {
    EMAIL_PROVIDER: String(process.env.EMAIL_PROVIDER || "auto").toLowerCase(),
    order: providerOrder().join(" → "),
    MAILJET: process.env.MAILJET_API_KEY && process.env.MAILJET_SECRET_KEY
      ? `configured (${mask(process.env.MAILJET_API_KEY)})`
      : "(unset)",
    SENDGRID_API_KEY: process.env.SENDGRID_API_KEY
      ? mask(process.env.SENDGRID_API_KEY)
      : "(unset)",
    BREVO_API_KEY: process.env.BREVO_API_KEY ? mask(process.env.BREVO_API_KEY) : "(unset)",
    EMAIL_FROM: process.env.EMAIL_FROM || "(unset)",
    APP_URL: process.env.APP_URL || "(unset)",
    SMTP: smtpReady ? `configured (${process.env.SMTP_HOST})` : "not configured",
  };
};

module.exports = {
  sendEmail,
  EmailDeliveryError,
  DEFAULT_USER_MESSAGE,
  emailConfigSummary,
};
