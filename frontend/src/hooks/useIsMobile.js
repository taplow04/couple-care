import { useEffect, useState } from "react";

// A real touch phone: narrow AND coarse-pointer. `pointer: coarse` guarantees a
// desktop browser — even resized narrow — never takes the mobile camera path, so
// the (perfect) desktop implementation is never affected.
const MOBILE_QUERY = "(max-width: 768px) and (pointer: coarse)";

/**
 * True on phones (portrait tablets ≤768px included). Reactive to viewport /
 * orientation changes via matchMedia.
 */
export const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia(MOBILE_QUERY).matches,
  );

  useEffect(() => {
    const mq = window.matchMedia(MOBILE_QUERY);
    const onChange = () => setIsMobile(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  return isMobile;
};

export default useIsMobile;
