import { useEffect, useState } from "react";
import { connectSocket } from "../services/socket.service";
import { getAiMood, getPartnerAiMood } from "../services/moods.service";

/**
 * My AI Current Mood — seeded from the API, then kept live via the shared socket
 * (`mood:ai-update`, pushed by the CCIE debounced subscriber whenever emotional
 * context changes). No manual refresh. Uses the same socket singleton as chat /
 * presence — never a second connection.
 *
 * Returns { mood, loading }. `mood` is the full DTO (emoji/label/headline/
 * confidence/trend/stability/reasons/timeline) or null.
 */
export const useMyAiMood = () => {
  const [mood, setMood] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    getAiMood()
      .then((res) => {
        if (active) setMood(res.data || null);
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoading(false);
      });

    const socket = connectSocket(localStorage.getItem("token"));
    const onUpdate = (data) => {
      if (data) setMood(data);
    };
    socket.on("mood:ai-update", onUpdate);
    return () => {
      active = false;
      socket.off("mood:ai-update", onUpdate);
    };
  }, []);

  return { mood, loading };
};

/**
 * Partner's AI Current Mood — privacy-aware (server returns { available:false }
 * when the partner hid their moods). Seeded from the API, kept live via
 * `partner:mood-update`. Returns { mood, available, loading }.
 */
export const usePartnerAiMood = (partnerId) => {
  const [state, setState] = useState({ mood: null, available: false, loading: true });

  useEffect(() => {
    let active = true;
    getPartnerAiMood()
      .then((res) => {
        if (!active) return;
        const d = res.data || {};
        setState({ mood: d.available ? d : null, available: !!d.available, loading: false });
      })
      .catch(() => {
        if (active) setState({ mood: null, available: false, loading: false });
      });

    const socket = connectSocket(localStorage.getItem("token"));
    const onUpdate = (data) => {
      if (!data) return;
      // If we know the partner id, only accept their updates.
      if (partnerId && String(data.partnerId) !== String(partnerId)) return;
      setState({ mood: data, available: true, loading: false });
    };
    socket.on("partner:mood-update", onUpdate);
    return () => {
      active = false;
      socket.off("partner:mood-update", onUpdate);
    };
  }, [partnerId]);

  return state;
};
