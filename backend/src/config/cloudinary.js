const cloudinary = require("cloudinary").v2;

// Single source of truth for Cloudinary configuration. Importing this module
// configures the shared SDK instance once; every uploader (avatars, chat media)
// reuses it instead of calling cloudinary.config() in multiple places.
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

// Surface a clear warning at boot if credentials are missing — otherwise the
// only symptom is opaque "Must supply api_key" errors at upload time.
const missing = [
  "CLOUDINARY_CLOUD_NAME",
  "CLOUDINARY_API_KEY",
  "CLOUDINARY_API_SECRET",
].filter((key) => !process.env[key]);

if (missing.length) {
  console.warn(
    `[cloudinary] Missing env vars: ${missing.join(", ")} — image/file uploads will fail.`,
  );
}

// True only when all three credentials are present. Controllers use this to
// return a clear "not configured" error instead of an opaque Cloudinary throw.
cloudinary.isConfigured = () => missing.length === 0;

module.exports = cloudinary;
