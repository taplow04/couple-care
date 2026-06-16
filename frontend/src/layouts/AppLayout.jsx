import { useEffect } from "react";
import { Outlet } from "react-router-dom";

import BottomNav from "../components/navigation/BottomNav/BottomNav.jsx";
import { CallProvider } from "../context/CallContext.jsx";
import IncomingCallModal from "../components/call/IncomingCallModal/IncomingCallModal.jsx";
import OutgoingCallModal from "../components/call/OutgoingCallModal/OutgoingCallModal.jsx";
import CallErrorToast from "../components/call/CallErrorToast/CallErrorToast.jsx";
import { useRealtimeNotifications } from "../hooks/useRealtimeNotifications.js";
import { useAuth } from "../context/AuthContext.jsx";
import { connectSocket } from "../services/socket.service.js";

const AppLayout = () => {
  // App-wide: keep the unread badge live and seeded.
  useRealtimeNotifications();

  // If the partner unmatches, refresh the user so route guards send us back to
  // onboarding (currentCoupleId becomes null).
  const { loadUser } = useAuth();
  useEffect(() => {
    const socket = connectSocket(localStorage.getItem("token"));
    const onUnmatched = () => loadUser();
    socket.on("couple:unmatched", onUnmatched);
    return () => socket.off("couple:unmatched", onUnmatched);
  }, [loadUser]);

  return (
    // CallProvider lives here (inside the router, wrapping every authed page)
    // so incoming calls work app-wide and call state survives navigation to
    // the dedicated call pages. It reuses the shared chat socket — no second
    // connection is created.
    <CallProvider>
      <Outlet />
      <BottomNav />

      {/* Global call overlays */}
      <IncomingCallModal />
      <OutgoingCallModal />
      <CallErrorToast />
    </CallProvider>
  );
};

export default AppLayout;
