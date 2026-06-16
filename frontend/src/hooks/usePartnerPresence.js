import { useEffect, useState } from "react";
import { connectSocket } from "../services/socket.service";

/**
 * Live partner presence over the shared socket.
 *
 * Returns { online, lastSeen, inCall }. It listens for `presence:update`
 * events for the given partner and asks the server for the current snapshot on
 * mount / reconnect (`presence:get`). Uses the same socket singleton as chat
 * and calls — no second connection.
 */
export const usePartnerPresence = (partnerId) => {
  const [presence, setPresence] = useState({
    online: false,
    lastSeen: null,
    inCall: false,
  });

  useEffect(() => {
    if (!partnerId) return;

    const socket = connectSocket(localStorage.getItem("token"));

    const onUpdate = (data) => {
      if (data && String(data.userId) === String(partnerId)) {
        setPresence({
          online: !!data.online,
          lastSeen: data.lastSeen ?? null,
          inCall: !!data.inCall,
        });
      }
    };

    const requestNow = () => socket.emit("presence:get");

    socket.on("presence:update", onUpdate);
    socket.on("connect", requestNow);
    if (socket.connected) requestNow();

    return () => {
      socket.off("presence:update", onUpdate);
      socket.off("connect", requestNow);
    };
  }, [partnerId]);

  return presence;
};
