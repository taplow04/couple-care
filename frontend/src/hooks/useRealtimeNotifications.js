import { useEffect } from "react";
import { connectSocket } from "../services/socket.service";
import { useNotificationsCtx } from "../context/NotificationsContext";
import { getNotifications } from "../services/notifications.service";

/**
 * Keeps the app-wide unread notification badge accurate:
 *  - seeds the count once on mount (previously it was only set when the
 *    Notifications page was opened, so the BottomNav badge was stale)
 *  - increments live when a `notification:new` arrives over the socket
 *
 * Mount this once inside the authenticated area (AppLayout).
 */
export const useRealtimeNotifications = () => {
  const { setUnreadCount } = useNotificationsCtx();

  useEffect(() => {
    let active = true;

    getNotifications(1, 50)
      .then((res) => {
        if (!active) return;
        const list = res?.data || [];
        setUnreadCount(list.filter((n) => !n.isRead).length);
      })
      .catch(() => {});

    const socket = connectSocket(localStorage.getItem("token"));
    const onNew = () => setUnreadCount((c) => c + 1);
    socket.on("notification:new", onNew);

    return () => {
      active = false;
      socket.off("notification:new", onNew);
    };
  }, [setUnreadCount]);
};
