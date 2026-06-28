/**
 * CCIE event bus — a single in-process EventEmitter (Render runs one instance).
 * Domain services call `publish(event, payload)` (lazy-required to avoid import
 * cycles); the intelligence subscribers react. The PERSISTED trail already exists
 * (ActivityLog) — this bus is purely for in-process incremental recompute, so a
 * lost event only means a slightly stale cache until the next read/recompute.
 *
 * `publish` NEVER throws into the caller (intelligence must never break the
 * action that triggered it).
 */
const { EventEmitter } = require("events");

const bus = new EventEmitter();
bus.setMaxListeners(50);

const publish = (event, payload = {}) => {
  try {
    bus.emit(event, payload);
  } catch (e) {
    console.error(`[ccie:bus] publish ${event} failed:`, e.message);
  }
};

module.exports = { bus, publish };
