import { useEffect } from "react";

/**
 * Keeps a CSS variable `--app-height` in sync with the *visual* viewport height.
 *
 * On mobile (especially iOS Safari) the on-screen keyboard does NOT resize the
 * layout viewport, so `100vh`/`100dvh` fixed elements get covered by the
 * keyboard. The VisualViewport API reports the actually-visible area, so a
 * full-screen chat sized with `height: var(--app-height)` shrinks when the
 * keyboard opens and the input stays pinned just above it — WhatsApp-style.
 *
 * Mount this on immersive screens (chat / call). It cleans up on unmount and
 * restores the full height.
 */
export const useVisualViewport = () => {
  useEffect(() => {
    const vv = window.visualViewport;

    const apply = () => {
      const h = vv ? vv.height : window.innerHeight;
      document.documentElement.style.setProperty("--app-height", `${h}px`);
    };

    apply();

    if (vv) {
      vv.addEventListener("resize", apply);
      vv.addEventListener("scroll", apply);
    }
    window.addEventListener("resize", apply);
    window.addEventListener("orientationchange", apply);

    return () => {
      if (vv) {
        vv.removeEventListener("resize", apply);
        vv.removeEventListener("scroll", apply);
      }
      window.removeEventListener("resize", apply);
      window.removeEventListener("orientationchange", apply);
      // Release the override so other screens use their normal sizing.
      document.documentElement.style.removeProperty("--app-height");
    };
  }, []);
};

export default useVisualViewport;
