/**
 * Global error handler.
 *
 * Two jobs:
 *   1. Log the full error server-side (status, message, stack) for debugging.
 *   2. Decide what is SAFE to send the client. Our own operational errors (4xx
 *      created via the services, validation, auth) carry a user-facing message
 *      and are shown as-is. Anything else — an unexpected 5xx or a third-party
 *      SDK error that bubbled up — is replaced with a generic message so raw
 *      provider responses (e.g. a Brevo "unrecognised IP" 401) can NEVER leak.
 */
const GENERIC_MESSAGE = "Something went wrong. Please try again later.";

const errorHandler = (err, req, res, next) => {
  // eslint-disable-line no-unused-vars -- Express needs the 4-arg signature
  const statusCode = err.statusCode || err.status || 500;

  // Always log full detail server-side; this is never sent to the client.
  const line = `[error] ${req.method} ${req.originalUrl} → ${statusCode}: ${err.message}`;
  if (statusCode >= 500) {
    console.error(line, err.stack || "");
  } else {
    console.warn(line);
  }

  // A leaked third-party SDK error (e.g. a raw Brevo HTTP error) carries an HTTP
  // envelope our own domain errors never have. Treat those as foreign and refuse
  // to echo their message, even on a 4xx status — this is the second line of
  // defense behind the email transport, which already wraps provider failures.
  const looksForeign =
    !err.expose &&
    (err.response !== undefined ||
      err.body !== undefined ||
      err.name === "HttpError" ||
      err.name === "FetchError");

  // Expose the message when it's explicitly marked safe (err.expose === true,
  // e.g. EmailDeliveryError) or it's one of our own curated operational 4xx
  // errors. Everything else — unexpected 5xx, foreign SDK errors — is generic.
  const isSafe =
    err.expose === true ||
    (statusCode >= 400 && statusCode < 500 && !looksForeign);

  res.status(statusCode).json({
    success: false,
    message: isSafe && err.message ? err.message : GENERIC_MESSAGE,
  });
};

module.exports = errorHandler;
