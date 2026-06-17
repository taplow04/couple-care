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
    const root = document.documentElement;

    const apply = () => {
      // height = the actually-visible area (shrinks when the keyboard opens).
      const h = vv ? vv.height : window.innerHeight;
      // offsetTop = how far the visual viewport is pushed down from the layout
      // viewport (iOS scrolls the page up to reveal a focused input). A
      // position:fixed element is anchored to the LAYOUT viewport, so without
      // compensating for this it ends up above the visible area → white gap.
      const top = vv ? vv.offsetTop : 0;
      root.style.setProperty("--app-height", `${h}px`);
      root.style.setProperty("--app-top", `${top}px`);
    };

    apply();

    if (vv) {
      vv.addEventListener("resize", apply);
      vv.addEventListener("scroll", apply);
    }
    window.addEventListener("resize", apply);
    window.addEventListener("orientationchange", apply);

    // Lock the body so the page itself can't scroll behind the chat (prevents
    // the rubber-band white-screen on iOS).
    document.body.classList.add("vv-lock");

    return () => {
      if (vv) {
        vv.removeEventListener("resize", apply);
        vv.removeEventListener("scroll", apply);
      }
      window.removeEventListener("resize", apply);
      window.removeEventListener("orientationchange", apply);
      document.body.classList.remove("vv-lock");
      // Release the overrides so other screens use their normal sizing.
      root.style.removeProperty("--app-height");
      root.style.removeProperty("--app-top");
    };
  }, []);
};

export default useVisualViewport;
