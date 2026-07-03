import { useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";

import BottomNav from "../components/navigation/BottomNav/BottomNav.jsx";
import NotificationBell from "../components/navigation/NotificationBell/NotificationBell.jsx";
import { CallProvider } from "../context/CallContext.jsx";
import IncomingCallModal from "../components/call/IncomingCallModal/IncomingCallModal.jsx";
import OutgoingCallModal from "../components/call/OutgoingCallModal/OutgoingCallModal.jsx";
import CallErrorToast from "../components/call/CallErrorToast/CallErrorToast.jsx";
import PushPrompt from "../components/push/PushPrompt/PushPrompt.jsx";
import AchievementToast from "../components/engagement/AchievementToast/AchievementToast.jsx";
import { useRealtimeNotifications } from "../hooks/useRealtimeNotifications.js";
import { useChatUnread } from "../hooks/useChatUnread.js";
import { useAuth } from "../context/AuthContext.jsx";
import { connectSocket } from "../services/socket.service.js";
import { isPushSupported, getPermission, subscribeToPush } from "../services/push.service.js";

// Immersive screens cover the chrome (no bottom nav / floating bell).
const isImmersive = (pathname) =>
  pathname.startsWith("/chat") || pathname.startsWith("/call");

// The Dashboard has its own TopHeader (with the bell), so the floating bell is
// shown everywhere EXCEPT the dashboard and immersive screens. The Personal
// Profile belongs to the current user, so a notifications shortcut there is
// redundant — hide it (notifications stay reachable from the dashboard/others).
// Explore has its own sticky header with top-right actions (settings + compose),
// so the floating bell would overlap them — hide it there too.
const showFloatingBell = (pathname) =>
  !isImmersive(pathname) &&
  pathname !== "/dashboard" &&
  pathname !== "/profile" &&
  pathname !== "/explore";

const AppLayout = () => {
  // App-wide: keep the unread badges live and seeded.
  useRealtimeNotifications();
  useChatUnread();

  const { pathname } = useLocation();

  // If the partner unmatches, refresh the user so route guards send us back to
  // onboarding (currentCoupleId becomes null).
  const { loadUser } = useAuth();
  useEffect(() => {
    const socket = connectSocket(localStorage.getItem("token"));
    const onUnmatched = () => loadUser();
    socket.on("couple:unmatched", onUnmatched);
    return () => socket.off("couple:unmatched", onUnmatched);
  }, [loadUser]);

  // If the user already granted notification permission, (re)register this
  // browser's push subscription under their account. New opt-ins happen via the
  // Settings toggle (which needs a user gesture for the permission prompt).
  useEffect(() => {
    if (isPushSupported() && getPermission() === "granted") {
      subscribeToPush();
    }
  }, []);

  const immersive = isImmersive(pathname);

  return (
    // CallProvider lives here (inside the router, wrapping every authed page)
    // so incoming calls work app-wide and call state survives navigation to
    // the dedicated call pages. It reuses the shared chat socket — no second
    // connection is created.
    <CallProvider>
      <Outlet />

      {showFloatingBell(pathname) && <NotificationBell />}
      {!immersive && <BottomNav />}
      {!immersive && <PushPrompt />}

      {/* Global engagement celebration (achievement unlocks for both partners) */}
      <AchievementToast />

      {/* Global call overlays */}
      <IncomingCallModal />
      <OutgoingCallModal />
      <CallErrorToast />
    </CallProvider>
  );
};

export default AppLayout;
