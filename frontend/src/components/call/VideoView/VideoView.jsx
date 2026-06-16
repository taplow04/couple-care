import PartnerVideo from "../PartnerVideo/PartnerVideo";
import LocalVideo from "../LocalVideo/LocalVideo";
import "./VideoView.css";

/**
 * Full-bleed remote video with a draggable-looking floating self-view (PiP).
 */
const VideoView = ({ remoteStream, localStream, isCameraOff, partner }) => {
  return (
    <div className="video-view">
      <PartnerVideo
        stream={remoteStream}
        partner={partner}
        className="video-view__remote"
      />

      <div className="video-view__pip">
        <LocalVideo stream={localStream} isCameraOff={isCameraOff} />
      </div>
    </div>
  );
};

export default VideoView;
