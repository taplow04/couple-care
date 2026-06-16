/**
 * ICE server configuration for WebRTC.
 *
 * STUN alone is NOT enough in production: mobile carriers commonly use
 * symmetric NAT (CGNAT) which STUN cannot traverse. A TURN server is required
 * to keep call success rates high on real phones.
 *
 * TURN credentials are injected via Vite env so they can be rotated/added
 * without a code change. If they are absent we fall back to STUN-only (works
 * on most home Wi-Fi, fails on some cellular networks).
 *
 *   VITE_TURN_URL        e.g. "turn:turn.yourdomain.com:3478"
 *   VITE_TURN_USERNAME
 *   VITE_TURN_CREDENTIAL
 *
 * You can also pass a comma-separated list of TURN urls in VITE_TURN_URL
 * (e.g. include a turns: TLS variant on 443 for restrictive networks).
 */

const buildIceServers = () => {
  const servers = [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ];

  const turnUrl = import.meta.env.VITE_TURN_URL;
  const turnUsername = import.meta.env.VITE_TURN_USERNAME;
  const turnCredential = import.meta.env.VITE_TURN_CREDENTIAL;

  if (turnUrl && turnUsername && turnCredential) {
    const urls = turnUrl
      .split(",")
      .map((u) => u.trim())
      .filter(Boolean);

    servers.push({
      urls,
      username: turnUsername,
      credential: turnCredential,
    });
  }

  return servers;
};

export const ICE_SERVERS = buildIceServers();

export const RTC_CONFIG = {
  iceServers: ICE_SERVERS,
  // Pool a couple of candidates ahead of time for faster connection setup.
  iceCandidatePoolSize: 2,
};

// True when at least one TURN relay is configured.
export const HAS_TURN = ICE_SERVERS.some((s) => {
  const urls = Array.isArray(s.urls) ? s.urls : [s.urls];
  return urls.some((u) => u.startsWith("turn:") || u.startsWith("turns:"));
});
