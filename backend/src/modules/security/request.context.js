const { UAParser } = require("ua-parser-js");
const geoip = require("geoip-lite");

// Intl region names are built into Node — turns an ISO code ("IN") into a
// display name ("India") with no dependency.
let regionNames;
try {
  regionNames = new Intl.DisplayNames(["en"], { type: "region" });
} catch {
  regionNames = null;
}

// Best client IP behind a proxy (Render/Vercel put the real one first in XFF).
const getClientIp = (req) => {
  const xf = req.headers?.["x-forwarded-for"];
  if (xf) return String(xf).split(",")[0].trim();
  return req.ip || req.socket?.remoteAddress || "";
};

// Strip the IPv6-mapped IPv4 prefix (::ffff:1.2.3.4 → 1.2.3.4).
const normalizeIp = (ip) => String(ip || "").replace(/^::ffff:/, "").trim();

// Mask an IP for display: keep the network half, hide the host half.
const maskIp = (ip) => {
  const clean = normalizeIp(ip);
  if (!clean) return "";
  if (clean.includes(".")) {
    const p = clean.split(".");
    if (p.length === 4) return `${p[0]}.${p[1]}.*.*`;
    return "***";
  }
  if (clean.includes(":")) {
    const seg = clean.split(":").filter(Boolean);
    return `${seg.slice(0, 2).join(":")}:****`;
  }
  return "***";
};

// Friendly device label + normalized type/browser/os from the User-Agent.
const parseDevice = (ua) => {
  const parser = new UAParser(ua || "");
  const r = parser.getResult();

  const browser = r.browser?.name || "Unknown";
  const osName = r.os?.name || "";
  const osVersion = r.os?.version || "";
  const os = [osName, osVersion].filter(Boolean).join(" ") || "Unknown";

  const rawType = r.device?.type; // "mobile" | "tablet" | undefined (desktop) | ...
  let deviceType = "unknown";
  if (rawType === "mobile") deviceType = "mobile";
  else if (rawType === "tablet") deviceType = "tablet";
  else if (!rawType) deviceType = "desktop";

  // Human label.
  let device;
  const model = r.device?.model;
  const vendor = r.device?.vendor;
  if (model) {
    device = [vendor, model].filter(Boolean).join(" ");
  } else if (deviceType === "desktop") {
    if (/mac/i.test(osName)) device = "Mac";
    else if (/windows/i.test(osName)) device = "Windows PC";
    else if (/linux/i.test(osName)) device = "Linux PC";
    else if (/chrome os/i.test(osName)) device = "Chromebook";
    else device = "Desktop";
  } else {
    device = osName ? `${osName} device` : "Unknown device";
  }

  return { device, deviceType, browser, os };
};

// Approximate "City, Country" from the IP (offline geoip-lite; private/localhost
// IPs return "").
const geoLocate = (ip) => {
  try {
    const clean = normalizeIp(ip);
    if (!clean) return "";
    const geo = geoip.lookup(clean);
    if (!geo) return "";
    let country = geo.country || "";
    if (regionNames && country) {
      try {
        country = regionNames.of(country) || country;
      } catch {
        /* keep code */
      }
    }
    return [geo.city, country].filter(Boolean).join(", ");
  } catch {
    return "";
  }
};

/**
 * Build the security context for a request — device, network + geo — used when
 * creating sessions and logging security events.
 */
const buildContext = (req) => {
  const ip = getClientIp(req);
  const ua = req.headers?.["user-agent"] || "";
  const { device, deviceType, browser, os } = parseDevice(ua);
  return {
    ip,
    ipMasked: maskIp(ip),
    userAgent: ua,
    device,
    deviceType,
    browser,
    os,
    location: geoLocate(ip),
  };
};

module.exports = {
  buildContext,
  parseDevice,
  maskIp,
  geoLocate,
  getClientIp,
};
