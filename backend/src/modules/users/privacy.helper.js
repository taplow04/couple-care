/**
 * Privacy helpers shared by every partner-facing read (profile aggregator,
 * gallery, etc.). In a strict 1:1 app the only "other viewer" is the bound
 * partner, so visibility collapses to a single question: is this hidden from
 * the partner? "private" = Only Me (hidden); "partner_only" / "shared" are both
 * partner-visible. lastSeen is intentionally never gated (see user.model).
 */

// Can the partner see a value carrying this privacy setting?
const canPartnerView = (privacyValue) => privacyValue !== "private";

// Human label for a privacy value (used in transparency report copy).
const TRANSPARENCY_LABEL = {
  private: "Private",
  partner_only: "Partner",
  shared: "Shared",
};

const transparencyLabel = (privacyValue) =>
  TRANSPARENCY_LABEL[privacyValue] || "Partner";

module.exports = { canPartnerView, transparencyLabel };
