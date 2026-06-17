import { Navigate } from "react-router-dom";

import { useCall } from "../../../context/CallContext";
import VideoView from "../../../components/call/VideoView/VideoView";
import CallControls from "../../../components/call/CallControls/CallControls";
import CallTimer from "../../../components/call/CallTimer/CallTimer";
import ConnectionStatus from "../../../components/call/ConnectionStatus/ConnectionStatus";
import { getFirstName } from "../../../utils/getFirstName";
import "./VideoCallPage.css";

const VideoCallPage = () => {
  const {
    callState,
    callType,
    peer,
    localStream,
    remoteStream,
    isMuted,
    isCameraOff,
    connectionState,
    callStartedAt,
    toggleMute,
    toggleCamera,
    switchCamera,
    endCurrentCall,
  } = useCall();

  if (callState !== "connecting" && callState !== "active") {
    return <Navigate to="/chat" replace />;
  }
  if (callType !== "video") {
    return <Navigate to="/call/voice" replace />;
  }

  return (
    <div className="video-call">
      <VideoView
        remoteStream={remoteStream}
        localStream={localStream}
        isCameraOff={isCameraOff}
        partner={peer}
      />

      <div className="video-call__top">
        <div className="video-call__top-inner">
          <span className="video-call__name">{getFirstName(peer?.name, "Your Partner")}</span>
          {callState === "active" ? (
            <CallTimer startedAt={callStartedAt} className="video-call__timer" />
          ) : (
            <ConnectionStatus
              connectionState={connectionState}
              callState={callState}
            />
          )}
        </div>
      </div>

      <div className="video-call__bottom">
        <CallControls
          callType="video"
          isMuted={isMuted}
          isCameraOff={isCameraOff}
          onToggleMute={toggleMute}
          onToggleCamera={toggleCamera}
          onSwitchCamera={switchCamera}
          onEnd={endCurrentCall}
        />
      </div>
    </div>
  );
};

export default VideoCallPage;
