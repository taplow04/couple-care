import { useEffect, useState } from "react";
import { getEngagement } from "../services/engagement.service";
import { useCoupleEvents } from "./useCoupleEvents";

/**
 * Live couple engagement (streak + XP + level), kept in sync over the shared
 * socket. Pass `seed` (e.g. the dashboard payload's `engagement`) to render
 * instantly without a fetch; pass `{ fetch: true }` on standalone pages
 * (Journey / AI Center / Profile) to load it themselves.
 *
 * Returns the engagement summary object (or null until loaded). The live socket
 * value (once it exists) always wins over the seed; before then we fall back to
 * the seed so the UI renders immediately.
 */
export const useEngagement = (seed = null, { fetch = false } = {}) => {
  const [live, setLive] = useState(null);

  useEffect(() => {
    if (!fetch) return;
    let alive = true;
    getEngagement()
      .then((res) => {
        if (alive) setLive(res.data);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [fetch]);

  useCoupleEvents({
    "engagement:update": (payload) => {
      if (payload) setLive((prev) => ({ ...(prev || seed), ...payload }));
    },
  });

  return live ?? seed;
};

export default useEngagement;
