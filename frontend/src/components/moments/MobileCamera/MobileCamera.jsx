import { useCallback, useEffect, useRef, useState } from "react";
import "./MobileCamera.css";

/**
 * Dedicated MOBILE camera preview (used only on touch phones — desktop keeps its
 * own 9:16 card, untouched).
 *
 * The whole point: show the camera's TRUE frame with NO zoom/crop/stretch. The
 * stream constraints (in MomentCapture) no longer force a portrait aspectRatio,
 * so the sensor is never digitally cropped. Here we measure the real
 * `videoWidth`/`videoHeight` once metadata is ready and size a "fit box" to that
 * exact ratio, maximised within the viewport (a JS-computed `object-fit: contain`
 * — deterministic across iOS Safari / Chrome / Samsung Internet and re-run on
 * every resize / orientation change via ResizeObserver).
 *
 * The box is centered fullscreen; the surrounding letterbox is the dark backdrop
 * the floating controls sit over — the native Instagram/Snapchat feel.
 */
const MobileCamera = ({ videoRef, facingMode, ready, onReady }) => {
  const containerRef = useRef(null);
  const [box, setBox] = useState(null); // { w, h } in px, matches the stream AR

  // Compute the largest box with the stream's real AR that fits the container.
  const fit = useCallback(() => {
    const c = containerRef.current;
    const v = videoRef.current;
    if (!c || !v || !v.videoWidth || !v.videoHeight) return;

    const cw = c.clientWidth;
    const ch = c.clientHeight;
    const ar = v.videoWidth / v.videoHeight; // TRUE camera aspect ratio

    let w;
    let h;
    if (cw / ch > ar) {
      // Container is wider than the frame → height binds.
      h = ch;
      w = Math.round(ch * ar);
    } else {
      // Container is taller/narrower → width binds (typical on phones).
      w = cw;
      h = Math.round(cw / ar);
    }
    setBox({ w, h });
  }, [videoRef]);

  // Re-fit on any container size change (rotation, browser-UI show/hide, fold).
  useEffect(() => {
    const c = containerRef.current;
    if (!c) return undefined;

    let ro;
    if (typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(() => fit());
      ro.observe(c);
    }
    const onResize = () => fit();
    window.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", onResize);
    return () => {
      ro?.disconnect();
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onResize);
    };
  }, [fit]);

  // Metadata → we finally know videoWidth/Height. Fit + tell the parent we're live.
  const handleMeta = () => {
    fit();
    onReady?.();
  };

  const mirror = facingMode === "user";

  return (
    <div className="mobile-camera" ref={containerRef}>
      <div
        className="mobile-camera__fit"
        style={box ? { width: box.w, height: box.h } : undefined}
      >
        <video
          ref={videoRef}
          className={`mobile-camera__video${mirror ? " mobile-camera__video--mirror" : ""}`}
          playsInline
          muted
          autoPlay
          onLoadedMetadata={handleMeta}
          onResize={fit}
        />
      </div>

      {!ready && (
        <div className="mobile-camera__loading">
          <span className="mobile-camera__spinner" />
          <p>Starting camera…</p>
        </div>
      )}
    </div>
  );
};

export default MobileCamera;
