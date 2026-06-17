import { useEffect, useRef } from "react";
import { getSocket, connectSocket } from "../services/socket.service";

/**
 * Subscribe to couple-scoped realtime events on the shared app socket
 * (connected app-wide by CallProvider). Pass a map of { eventName: handler }.
 *
 * Used for live propagation of the couple Relationship Health score and
 * activity so the dashboard / analytics / journey update for BOTH partners
 * the moment either one logs a mood or adds a memory.
 *
 * Example:
 *   useCoupleEvents({
 *     "health:update": (payload) => setHealth(payload),
 *     "couple:activity": () => refetch(),
 *   });
 */
export const useCoupleEvents = (handlers) => {
  // Keep the latest handlers without re-subscribing on every render.
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    // Ensure a socket exists (idempotent — CallProvider already connects it).
    const token = localStorage.getItem("token");
    let socket = getSocket();
    if (!socket && token) socket = connectSocket(token);
    if (!socket) return;

    const events = Object.keys(handlersRef.current || {});
    const listeners = events.map((event) => {
      const fn = (payload) => handlersRef.current[event]?.(payload);
      socket.on(event, fn);
      return [event, fn];
    });

    return () => {
      listeners.forEach(([event, fn]) => socket.off(event, fn));
    };
    // Re-subscribe only when the set of event names changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [Object.keys(handlers || {}).join(",")]);
};

export default useCoupleEvents;
