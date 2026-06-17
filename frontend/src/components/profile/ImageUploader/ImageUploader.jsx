import { useRef, useState, useCallback } from "react";
import { uploadPhoto } from "../../../services/users.service";
import ProfileAvatar from "../ProfileAvatar/ProfileAvatar";
import "./ImageUploader.css";

const MAX_SIZE_MB = 5;
const ACCEPTED = ["image/jpeg", "image/png", "image/webp", "image/gif"];

const toBase64 = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

const ImageUploader = ({ currentUrl, name, onUploadComplete, onError }) => {
  const fileRef = useRef(null);
  const [preview, setPreview] = useState(currentUrl || "");
  const [progress, setProgress] = useState(null);
  const [uploadError, setUploadError] = useState("");

  const handleFileChange = useCallback(
    async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;

      // Validate type
      if (!ACCEPTED.includes(file.type)) {
        const msg = "Please choose a JPEG, PNG, WebP, or GIF image.";
        setUploadError(msg);
        onError?.(msg);
        return;
      }

      // Validate size
      if (file.size > MAX_SIZE_MB * 1024 * 1024) {
        const msg = `Image must be smaller than ${MAX_SIZE_MB} MB.`;
        setUploadError(msg);
        onError?.(msg);
        return;
      }

      setUploadError("");

      // Instant local preview
      const objectUrl = URL.createObjectURL(file);
      setPreview(objectUrl);

      // Convert and upload
      setProgress(0);
      try {
        const base64 = await toBase64(file);
        const res = await uploadPhoto(base64, (pct) => setProgress(pct));
        setProgress(100);
        onUploadComplete?.(res.data.url);
        // Clean up object URL
        URL.revokeObjectURL(objectUrl);
        setPreview(res.data.url);
      } catch (err) {
        const msg =
          err?.response?.data?.message ||
          (err?.response?.status === 413
            ? "Image is too large for the server."
            : "Upload failed. Please try again.");
        setUploadError(msg);
        onError?.(msg);
        // Roll back preview
        setPreview(currentUrl || "");
      } finally {
        setTimeout(() => setProgress(null), 600);
        // Reset file input so re-selecting same file works
        if (fileRef.current) fileRef.current.value = "";
      }
    },
    [currentUrl, onUploadComplete, onError]
  );

  return (
    <div className="img-uploader">
      <ProfileAvatar
        src={preview}
        name={name}
        size="lg"
        editable
        uploadProgress={progress}
        onClick={() => fileRef.current?.click()}
      />

      <input
        ref={fileRef}
        type="file"
        accept={ACCEPTED.join(",")}
        className="img-uploader__input"
        onChange={handleFileChange}
        aria-label="Choose profile photo"
      />

      {uploadError ? (
        <p className="img-uploader__error" role="alert">{uploadError}</p>
      ) : (
        <p className="img-uploader__hint">
          {progress !== null && progress < 100
            ? `Uploading… ${progress}%`
            : "Tap to change photo · JPEG, PNG, WebP · max 5 MB"}
        </p>
      )}
    </div>
  );
};

export default ImageUploader;
