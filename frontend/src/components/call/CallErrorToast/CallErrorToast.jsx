import { useCall } from "../../../context/CallContext";
import "./CallErrorToast.css";

/**
 * Small global toast for call failures (busy, offline, permissions, etc).
 * Auto-clears via the CallContext timer.
 */
const CallErrorToast = () => {
  const { callError } = useCall();

  if (!callError) return null;

  return (
    <div className="call-error-toast" role="alert">
      {callError}
    </div>
  );
};

export default CallErrorToast;
