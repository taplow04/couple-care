import { Outlet } from "react-router-dom";

import BottomNav from "../components/navigation/BottomNav/BottomNav.jsx";
import { CallProvider } from "../context/CallContext.jsx";
import IncomingCallModal from "../components/call/IncomingCallModal/IncomingCallModal.jsx";
import OutgoingCallModal from "../components/call/OutgoingCallModal/OutgoingCallModal.jsx";
import CallErrorToast from "../components/call/CallErrorToast/CallErrorToast.jsx";
import { useRealtimeNotifications } from "../hooks/useRealtimeNotifications.js";

const AppLayout = () => {
  // App-wide: keep the unread badge live and seeded.
  useRealtimeNotifications();

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
