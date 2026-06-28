import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

/**
 * Gate for features that only make sense with a fully-connected partner
 * (Stage 2 — Growing Together: chat, calls, moments, bucket list, journey…).
 *
 * Business rule:
 *   - no currentCoupleId        → solo user (preparing / healing) → send them to
 *                                 their stage-appropriate home (/dashboard), NOT
 *                                 the old onboarding wall
 *   - currentCoupleId but the partner hasn't joined yet (coupleConnected false)
 *                               → keep them on the waiting screen → /couple/create
 *   - fully connected           → allow access
 *
 * Note: /dashboard itself is NOT behind this guard — it adapts to every stage.
 */
const RequireCouple = () => {
  const { user, loading } = useAuth();

  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;

  if (!user.currentCoupleId) {
    return <Navigate to="/dashboard" replace />;
  }

  if (!user.coupleConnected) {
    return <Navigate to="/couple/create" replace />;
  }

  return <Outlet />;
};

export default RequireCouple;
