import { useRef, useState } from "react";
import PartnerVideo from "../PartnerVideo/PartnerVideo";
import LocalVideo from "../LocalVideo/LocalVideo";
import "./VideoView.css";

const EDGE = 12; // keep the PiP this far from the container edges

/**
 * Full-bleed remote video (aspect-preserving, never cropped) with a DRAGGABLE
 * floating self-view (PiP). The PiP defaults to the top-right; once dragged it's
 * positioned (and clamped within bounds) imperatively. Pointer-capture makes the
 * drag work identically with touch and mouse across devices.
 */
const VideoView = ({ remoteStream, localStream, isCameraOff, partner }) => {
  const rootRef = useRef(null);
  const pipRef = useRef(null);
  const dragRef = useRef(null);
  const [pos, setPos] = useState(null); // {x,y} once dragged; null = CSS default
  const [dragging, setDragging] = useState(false);

  const clampToBounds = (x, y) => {
    const root = rootRef.current?.getBoundingClientRect();
    const pip = pipRef.current?.getBoundingClientRect();
    if (!root || !pip) return { x, y };
    return {
      x: Math.max(EDGE, Math.min(x, root.width - pip.width - EDGE)),
      y: Math.max(EDGE, Math.min(y, root.height - pip.height - EDGE)),
    };
  };

  const onPointerDown = (e) => {
    const pip = pipRef.current.getBoundingClientRect();
    const root = rootRef.current.getBoundingClientRect();
    dragRef.current = {
      offX: e.clientX - pip.left,
      offY: e.clientY - pip.top,
      rootLeft: root.left,
      rootTop: root.top,
      moved: false,
    };
    pipRef.current.setPointerCapture?.(e.pointerId);
    setDragging(true);
  };

  const onPointerMove = (e) => {
    const d = dragRef.current;
    if (!d) return;
    d.moved = true;
    setPos(
      clampToBounds(
        e.clientX - d.rootLeft - d.offX,
        e.clientY - d.rootTop - d.offY,
      ),
    );
  };

  const onPointerUp = (e) => {
    if (!dragRef.current) return;
    pipRef.current?.releasePointerCapture?.(e.pointerId);
    dragRef.current = null;
    setDragging(false);
  };

  return (
    <div className="video-view" ref={rootRef}>
      <PartnerVideo
        stream={remoteStream}
        partner={partner}
        className="video-view__remote"
      />

      <div
        ref={pipRef}
        className={`video-view__pip${dragging ? " video-view__pip--dragging" : ""}`}
        style={pos ? { left: pos.x, top: pos.y, right: "auto" } : undefined}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <LocalVideo stream={localStream} isCameraOff={isCameraOff} />
      </div>
    </div>
  );
};

export default VideoView;
