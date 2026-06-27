import { useCallback, useEffect, useState } from "react";
import { getTodayMoment } from "../services/dailyMoment.service";
import { useCoupleEvents } from "./useCoupleEvents";

/**
 * Live "today's Daily Couple Moment" state for the dashboard card. Seeds from
 * GET /daily-moment/today and stays current over the shared socket: the recap
 * appears the instant the partner's post completes the day, and its AI summary
 * fills in live (`daily-moment:updated`).
 *
 * An optional `initial` (from the dashboard payload) avoids a duplicate fetch on
 * first paint.
 */
export const useDailyMoment = (initial = null) => {
  const [today, setToday] = useState(initial);
  const [loading, setLoading] = useState(!initial);

  const refresh = useCallback(async () => {
    try {
      const res = await getTodayMoment();
      setToday(res.data || null);
    } catch {
      /* keep current data on a failed refresh */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (initial) return; // already seeded from the dashboard payload
    let active = true;
    getTodayMoment()
      .then((res) => {
        if (active) setToday(res.data || null);
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [initial]);

  useCoupleEvents({
    // Both partners posted → the recap was just created.
    "daily-moment:ready": (recap) =>
      setToday((prev) => ({
        ...(prev || {}),
        exists: true,
        day: recap?.day,
        youPosted: true,
        partnerPosted: true,
        recap,
      })),
    // The background AI summary (or a live stat refresh) landed.
    "daily-moment:updated": (recap) =>
      setToday((prev) =>
        prev?.recap && recap && prev.recap.day === recap.day
          ? { ...prev, recap }
          : prev,
      ),
    // A new Moment may have changed who-posted-today; re-pull the light state.
    "moment:new": () => refresh(),
  });

  return { today, loading, refresh };
};

export default useDailyMoment;
