import { useRef, useState } from "react";
import PartnerVideo from "../PartnerVideo/PartnerVideo";
import LocalVideo from "../LocalVideo/LocalVideo";
import "./VideoView.css";

const EDGE = 12; // keep the PiP this far from the container edges
const TAP_SLOP = 6; // px of movement below which a pointer gesture is a "tap"

// "Tap to swap" affordance rendered on the floating PiP.
const SwapHint = () => (
  <span className="video-view__swap-hint" aria-hidden="true">
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <path
        d="M7 4L3 8l4 4M3 8h13M17 20l4-4-4-4M21 16H8"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  </span>
);

/**
 * Full-bleed main video with a DRAGGABLE + TAP-TO-SWAP floating self-view (PiP).
 *
 * Layout is two fixed slots — one holds `PartnerVideo`, the other `LocalVideo`.
 * A single `swapped` flag decides which slot is the fullscreen "main" and which
 * is the floating "pip"; **only the slots' CSS classes change**. The two video
 * components never unmount and never move in the tree, so the underlying
 * MediaStreams (and the remote audio) are never re-attached or restarted — this
 * is a pure UI swap, no WebRTC involvement.
 *
 * - Tap the PiP → swap. Tap again → swap back.
 * - Drag the PiP → reposition (pointer-capture; identical for touch + mouse).
 * A gesture counts as a drag only past TAP_SLOP, so a tap never nudges the PiP.
 */
const VideoView = ({ remoteStream, localStream, isCameraOff, partner }) => {
  const rootRef = useRef(null);
  const dragRef = useRef(null);
  const [pos, setPos] = useState(null); // {x,y} once dragged; null = CSS default
  const [dragging, setDragging] = useState(false);
  const [swapped, setSwapped] = useState(false); // false → partner main, local pip

  const clampToBounds = (pipEl, x, y) => {
    const root = rootRef.current?.getBoundingClientRect();
    const pip = pipEl?.getBoundingClientRect();
    if (!root || !pip) return { x, y };
    return {
      x: Math.max(EDGE, Math.min(x, root.width - pip.width - EDGE)),
      y: Math.max(EDGE, Math.min(y, root.height - pip.height - EDGE)),
    };
  };

  // Handlers are attached to whichever slot is currently the PiP; `currentTarget`
  // is therefore always the live PiP element (no fixed pip ref needed).
  const onPointerDown = (e) => {
    const pipEl = e.currentTarget;
    const pip = pipEl.getBoundingClientRect();
    const root = rootRef.current.getBoundingClientRect();
    dragRef.current = {
      el: pipEl,
      offX: e.clientX - pip.left,
      offY: e.clientY - pip.top,
      rootLeft: root.left,
      rootTop: root.top,
      startX: e.clientX,
      startY: e.clientY,
      moved: false,
    };
    pipEl.setPointerCapture?.(e.pointerId);
    setDragging(true);
  };

  const onPointerMove = (e) => {
    const d = dragRef.current;
    if (!d) return;
    if (
      !d.moved &&
      (Math.abs(e.clientX - d.startX) > TAP_SLOP ||
        Math.abs(e.clientY - d.startY) > TAP_SLOP)
    ) {
      d.moved = true;
    }
    if (!d.moved) return; // still within tap slop — don't move yet
    setPos(
      clampToBounds(
        d.el,
        e.clientX - d.rootLeft - d.offX,
        e.clientY - d.rootTop - d.offY,
      ),
    );
  };

  const onPointerUp = (e) => {
    const d = dragRef.current;
    if (!d) return;
    d.el.releasePointerCapture?.(e.pointerId);
    const wasTap = !d.moved;
    dragRef.current = null;
    setDragging(false);
    if (wasTap) setSwapped((s) => !s); // tap = swap main/pip
  };

  const pipHandlers = {
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerCancel: onPointerUp,
  };

  // Position style applies only to the slot currently acting as the PiP.
  const pipStyle = pos ? { left: pos.x, top: pos.y, right: "auto" } : undefined;

  const partnerIsPip = swapped;
  const localIsPip = !swapped;

  const slotClass = (isPip) =>
    `video-view__slot ${isPip ? "video-view__slot--pip" : "video-view__slot--main"}${
      isPip && dragging ? " video-view__slot--dragging" : ""
    }`;

  return (
    <div className="video-view" ref={rootRef}>
      {/* Partner slot — never remounts; only its slot class changes. */}
      <div
        className={slotClass(partnerIsPip)}
        style={partnerIsPip ? pipStyle : undefined}
        {...(partnerIsPip ? pipHandlers : {})}
      >
        <PartnerVideo stream={remoteStream} partner={partner} />
        {partnerIsPip && <SwapHint />}
      </div>

      {/* Local (self) slot. */}
      <div
        className={slotClass(localIsPip)}
        style={localIsPip ? pipStyle : undefined}
        {...(localIsPip ? pipHandlers : {})}
      >
        <LocalVideo stream={localStream} isCameraOff={isCameraOff} />
        {localIsPip && <SwapHint />}
      </div>
    </div>
  );
};

export default VideoView;
