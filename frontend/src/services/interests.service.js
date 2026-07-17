import api from "../api/axios";

// AI Interest Engine — learned ONLY from in-app CoupleCare activity.
// All return the { success, data } wrapper — unwrap `.data` in the caller.

export const getInterestProfile = async () => {
  const res = await api.get("/interests");
  return res.data;
};

export const getInterestMeta = async () => {
  const res = await api.get("/interests/meta");
  return res.data;
};

// Lightweight client-side signal (page visit / in-app search). Best-effort by
// design: swallow failures so a signal can never break the UX that fired it.
export const sendInterestSignal = async ({ category, text, source = "page_visit" }) => {
  try {
    await api.post("/interests/signal", { category, text, source });
  } catch {
    /* signals are best-effort */
  }
};
