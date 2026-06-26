import { useCallback, useEffect, useState } from "react";
import { getMomentCircles } from "../services/moments.service";
import { useCoupleEvents } from "./useCoupleEvents";

/**
 * Live story-circles state for the Moments bar. Seeds from GET /moments/circles
 * and stays current via the shared socket (Feature 16): new uploads, views,
 * deletions, expiry, and couple-moment offers all update without a manual
 * reload. Reactions/views inside an open viewer are handled by the viewer
 * itself; this hook keeps the bar (rings + unseen state) accurate.
 */
export const useMoments = () => {
  const [circles, setCircles] = useState({ self: null, partner: null });
  const [loading, setLoading] = useState(true);
  const [coupleCandidate, setCoupleCandidate] = useState(null);

  const refresh = useCallback(async () => {
    try {
      const res = await getMomentCircles();
      setCircles(res.data || { self: null, partner: null });
    } catch {
      /* keep current data on a failed refresh */
    } finally {
      setLoading(false);
    }
  }, []);

  // Seed on mount via the .then pattern (setState only in the async callback, so
  // it never fires synchronously inside the effect body).
  useEffect(() => {
    let active = true;
    getMomentCircles()
      .then((res) => {
        if (active) setCircles(res.data || { self: null, partner: null });
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useCoupleEvents({
    "moment:new": () => refresh(),
    "moment:deleted": () => refresh(),
    "moment:expired": () => refresh(),
    "moment:viewed": () => refresh(),
    "moment:couple-available": (payload) => setCoupleCandidate(payload || null),
    "moment:couple-created": () => {
      setCoupleCandidate(null);
      refresh();
    },
  });

  return { circles, loading, refresh, coupleCandidate, setCoupleCandidate };
};

export default useMoments;
