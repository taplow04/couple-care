import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

/**
 * Gate for features that only make sense with a fully-connected partner.
 *
 * Business rule:
 *   - no currentCoupleId        → user hasn't started onboarding → /couple
 *   - currentCoupleId but the partner hasn't joined yet (coupleConnected false)
 *                               → keep them on the waiting screen → /couple/create
 *   - fully connected           → allow access
 */
const RequireCouple = () => {
  const { user, loading } = useAuth();

  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;

  if (!user.currentCoupleId) {
    return <Navigate to="/couple" replace />;
  }

  if (!user.coupleConnected) {
    return <Navigate to="/couple/create" replace />;
  }

  return <Outlet />;
};

export default RequireCouple;
