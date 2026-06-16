import "./CallControls.css";

/**
 * The in-call control bar. Adapts to voice vs video calls.
 * Large, thumb-friendly touch targets for mobile.
 */
const CallControls = ({
  callType,
  isMuted,
  isCameraOff,
  isSpeakerOn,
  onToggleMute,
  onToggleCamera,
  onSwitchCamera,
  onToggleSpeaker,
  onEnd,
}) => {
  const isVideo = callType === "video";

  return (
    <div className="call-controls">
      <button
        type="button"
        className={`call-controls__btn ${isMuted ? "call-controls__btn--active" : ""}`}
        onClick={onToggleMute}
        aria-label={isMuted ? "Unmute" : "Mute"}
      >
        <span className="call-controls__icon">{isMuted ? "🔇" : "🎙️"}</span>
        <span className="call-controls__label">{isMuted ? "Unmute" : "Mute"}</span>
      </button>

      {isVideo ? (
        <>
          <button
            type="button"
            className={`call-controls__btn ${isCameraOff ? "call-controls__btn--active" : ""}`}
            onClick={onToggleCamera}
            aria-label={isCameraOff ? "Turn camera on" : "Turn camera off"}
          >
            <span className="call-controls__icon">{isCameraOff ? "📷" : "🎥"}</span>
            <span className="call-controls__label">
              {isCameraOff ? "Cam on" : "Cam off"}
            </span>
          </button>

          <button
            type="button"
            className="call-controls__btn"
            onClick={onSwitchCamera}
            aria-label="Switch camera"
          >
            <span className="call-controls__icon">🔄</span>
            <span className="call-controls__label">Flip</span>
          </button>
        </>
      ) : (
        <button
          type="button"
          className={`call-controls__btn ${isSpeakerOn ? "call-controls__btn--active" : ""}`}
          onClick={onToggleSpeaker}
          aria-label="Toggle speaker"
        >
          <span className="call-controls__icon">{isSpeakerOn ? "🔊" : "🔈"}</span>
          <span className="call-controls__label">Speaker</span>
        </button>
      )}

      <button
        type="button"
        className="call-controls__btn call-controls__btn--end"
        onClick={onEnd}
        aria-label="End call"
      >
        <span className="call-controls__icon">📞</span>
        <span className="call-controls__label">End</span>
      </button>
    </div>
  );
};

export default CallControls;
