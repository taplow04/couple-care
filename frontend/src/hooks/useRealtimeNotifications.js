import { useEffect } from "react";
import { connectSocket } from "../services/socket.service";
import { useNotificationsCtx } from "../context/NotificationsContext";
import { getNotifications } from "../services/notifications.service";

/**
 * Keeps the app-wide unread notification badge accurate:
 *  - seeds the count once on mount (previously it was only set when the
 *    Notifications page was opened, so the BottomNav badge was stale)
 *  - increments live when a `notification:new` arrives over the socket
 *  - decrements / clears live when the user reads on ANY device
 *    (`notification:read` / `notification:read-all`) — cross-device sync
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
    const onRead = () => setUnreadCount((c) => Math.max(0, c - 1));
    const onReadAll = () => setUnreadCount(0);
    socket.on("notification:new", onNew);
    socket.on("notification:read", onRead);
    socket.on("notification:read-all", onReadAll);

    return () => {
      active = false;
      socket.off("notification:new", onNew);
      socket.off("notification:read", onRead);
      socket.off("notification:read-all", onReadAll);
    };
  }, [setUnreadCount]);
};
