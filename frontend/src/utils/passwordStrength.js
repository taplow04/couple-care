// Shared password-strength model — mirrors the backend policy in
// security.service.js (assertStrongPassword) so the UI and the API agree.

export const PASSWORD_RULES = [
  { key: "length", label: "8+ characters", test: (p) => p.length >= 8 },
  { key: "uppercase", label: "Uppercase", test: (p) => /[A-Z]/.test(p) },
  { key: "lowercase", label: "Lowercase", test: (p) => /[a-z]/.test(p) },
  { key: "number", label: "Number", test: (p) => /[0-9]/.test(p) },
  { key: "special", label: "Special character", test: (p) => /[^A-Za-z0-9]/.test(p) },
];

const LABELS = ["Too short", "Weak", "Medium", "Strong", "Very Strong"];

/**
 * @returns {{ passed:string[], failed:string[], count:number, score:0..4,
 *            label:string, valid:boolean, rules:{key,label,ok}[] }}
 * `valid` (all five rules) is the bar the backend enforces — weak passwords are
 * rejected there too.
 */
export const evaluatePassword = (password = "") => {
  const pwd = String(password || "");
  const rules = PASSWORD_RULES.map((r) => ({
    key: r.key,
    label: r.label,
    ok: r.test(pwd),
  }));
  const count = rules.filter((r) => r.ok).length;

  // Score 0–4: reward rule coverage, nudge up for longer passwords.
  let score = count;
  if (pwd.length >= 12 && count >= 4) score = 4;
  if (pwd.length === 0) score = 0;
  score = Math.max(0, Math.min(4, score));

  const valid = count === PASSWORD_RULES.length;

  return {
    passed: rules.filter((r) => r.ok).map((r) => r.key),
    failed: rules.filter((r) => !r.ok).map((r) => r.key),
    count,
    score,
    label: pwd ? LABELS[score] : "",
    valid,
    rules,
  };
};
