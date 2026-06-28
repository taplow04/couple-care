import { Navigate } from "react-router-dom";

import { useStage } from "../../hooks/useStage";
import { STAGE } from "../../utils/stage";

import GrowingDashboard from "./GrowingDashboard/GrowingDashboard";
import PreparingDashboard from "./PreparingDashboard/PreparingDashboard";
import HealingDashboard from "./HealingDashboard/HealingDashboard";

/**
 * The Dashboard adapts to the user's relationship lifecycle stage:
 *   preparing → solo growth home (🌱 Preparing For Love)
 *   growing   → the full couple dashboard (❤️ Growing Together) — unchanged
 *   healing   → recovery home (🌤 Growing After Goodbye)
 *
 * A "growing but partner hasn't joined yet" user is sent to the waiting screen,
 * preserving the pre-stage onboarding behaviour exactly.
 */
const Dashboard = () => {
  const { stage, coupleConnected } = useStage();

  if (stage === STAGE.PREPARING) return <PreparingDashboard />;
  if (stage === STAGE.HEALING) return <HealingDashboard />;

  // growing
  if (!coupleConnected) return <Navigate to="/couple/create" replace />;
  return <GrowingDashboard />;
};

export default Dashboard;
