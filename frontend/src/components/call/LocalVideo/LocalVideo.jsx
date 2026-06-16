import { useEffect, useRef } from "react";
import "./LocalVideo.css";

/**
 * Self-view. Always muted (you don't echo your own audio) and mirrored so it
 * feels like a mirror. Renders a placeholder when the camera is off.
 */
const LocalVideo = ({ stream, isCameraOff, className = "" }) => {
  const videoRef = useRef(null);

  useEffect(() => {
    const el = videoRef.current;
    if (el && stream && el.srcObject !== stream) {
      el.srcObject = stream;
    }
  }, [stream]);

  return (
    <div className={`local-video ${className}`}>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className={`local-video__el ${isCameraOff ? "local-video__el--hidden" : ""}`}
      />
      {isCameraOff && (
        <div className="local-video__off">
          <span>📷</span>
          <p>Camera off</p>
        </div>
      )}
    </div>
  );
};

export default LocalVideo;
