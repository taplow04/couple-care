// Downscale + re-encode an image File before upload to cut bandwidth and speed
// up sends (Instagram-style). Non-images and already-small images are returned
// untouched. Fails safe: any error returns the original file.

const MAX_DIMENSION = 1600; // longest edge, px
const QUALITY = 0.82;
const SKIP_BELOW_BYTES = 200 * 1024; // don't bother compressing tiny images

const loadImage = (url) =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });

export const compressImage = async (file) => {
  if (!file || !file.type?.startsWith("image/")) return file;
  // GIFs would lose animation if re-encoded — leave them as-is.
  if (file.type === "image/gif") return file;
  if (file.size < SKIP_BELOW_BYTES) return file;

  let url;
  try {
    url = URL.createObjectURL(file);
    const img = await loadImage(url);

    const { width, height } = img;
    const scale = Math.min(1, MAX_DIMENSION / Math.max(width, height));
    // Already small enough and not worth re-encoding.
    if (scale === 1 && file.size < 1.5 * 1024 * 1024) return file;

    const targetW = Math.round(width * scale);
    const targetH = Math.round(height * scale);

    const canvas = document.createElement("canvas");
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0, targetW, targetH);

    // Preserve transparency for PNGs; everything else becomes JPEG.
    const outType = file.type === "image/png" ? "image/png" : "image/jpeg";

    const blob = await new Promise((resolve) =>
      canvas.toBlob(resolve, outType, QUALITY),
    );

    // If compression didn't help (or failed), keep the original.
    if (!blob || blob.size >= file.size) return file;

    const ext = outType === "image/png" ? "png" : "jpg";
    const baseName = (file.name || "image").replace(/\.[^.]+$/, "");
    return new File([blob], `${baseName}.${ext}`, {
      type: outType,
      lastModified: Date.now(),
    });
  } catch {
    return file;
  } finally {
    if (url) URL.revokeObjectURL(url);
  }
};
