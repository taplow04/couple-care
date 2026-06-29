import { memo, useEffect, useRef } from "react";
import "./PartnerVideo.css";

/**
 * The remote partner's video. Plays remote audio too (NOT muted). Shows an
 * avatar placeholder until the remote stream arrives.
 */
const PartnerVideo = ({ stream, partner, className = "" }) => {
  const videoRef = useRef(null);
  const hasStream = Boolean(stream && stream.getVideoTracks().length > 0);

  useEffect(() => {
    const el = videoRef.current;
    if (el && stream && el.srcObject !== stream) {
      el.srcObject = stream;
    }
  }, [stream]);

  const initial = partner?.name ? partner.name[0].toUpperCase() : "♥";

  return (
    <div className={`partner-video ${className}`}>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        className={`partner-video__el ${hasStream ? "" : "partner-video__el--hidden"}`}
      />
      {!hasStream && (
        <div className="partner-video__placeholder">
          {partner?.profilePhoto ? (
            <img src={partner.profilePhoto} alt={partner.name} />
          ) : (
            <span className="partner-video__initial">{initial}</span>
          )}
        </div>
      )}
    </div>
  );
};

// Memoised: re-renders only when the stream/partner actually change, so PiP
// dragging or other parent state never re-attaches the video element.
export default memo(PartnerVideo);
