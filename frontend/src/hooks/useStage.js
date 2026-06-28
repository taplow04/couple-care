import { useAuth } from "../context/AuthContext";
import { STAGE, getStage } from "../utils/stage";

/**
 * Convenience hook over the authed user's lifecycle stage. Reads from
 * AuthContext (already rehydrated from /auth/me) — no fetch of its own.
 */
export const useStage = () => {
  const { user } = useAuth();
  const stage = getStage(user);
  return {
    stage,
    isPreparing: stage === STAGE.PREPARING,
    isGrowing: stage === STAGE.GROWING,
    isHealing: stage === STAGE.HEALING,
    coupleConnected: !!user?.coupleConnected,
  };
};
