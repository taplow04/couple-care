import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { connectSocket } from "../services/socket.service";
import { useChatUnreadCtx } from "../context/ChatUnreadContext";
import { useAuth } from "../context/AuthContext";
import { getUnreadCount } from "../services/chat.service";

/**
 * Keeps the app-wide unread chat badge accurate, in real time:
 *  - seeds the count once from the server,
 *  - increments when a partner message arrives while NOT on the chat page,
 *  - resets to 0 when on / entering the chat page (where messages get marked
 *    seen) and when the partner-seen event implies the thread was read.
 *
 * Mount once inside the authenticated area (AppLayout). Rides the shared socket.
 */
export const useChatUnread = () => {
  const { setUnreadChats } = useChatUnreadCtx();
  const { user } = useAuth();
  const { pathname } = useLocation();
  const onChat = pathname.startsWith("/chat");
  const myId = String(user?._id || "");

  // Seed on mount + whenever we leave the chat page (count may have changed).
  useEffect(() => {
    if (onChat) {
      setUnreadChats(0);
      return;
    }
    let active = true;
    getUnreadCount()
      .then((res) => {
        if (active) setUnreadChats(res?.data?.count ?? 0);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [onChat, setUnreadChats]);

  // Live increments for partner messages received off the chat page.
  useEffect(() => {
    const socket = connectSocket(localStorage.getItem("token"));

    const onReceive = (msg) => {
      const senderId = msg?.senderId?._id
        ? String(msg.senderId._id)
        : String(msg?.senderId);
      // Ignore our own messages and anything while the chat is open.
      if (senderId === myId) return;
      if (window.location.pathname.startsWith("/chat")) return;
      setUnreadChats((c) => c + 1);
    };

    socket.on("message:receive", onReceive);
    return () => socket.off("message:receive", onReceive);
  }, [myId, setUnreadChats]);
};
