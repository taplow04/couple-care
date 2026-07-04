import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { useAuth } from "../../../context/AuthContext";
import BackHeader from "../../../components/common/BackHeader/BackHeader";
import PasswordStrength from "../../../components/security/PasswordStrength/PasswordStrength";
import SessionCard from "../../../components/security/SessionCard/SessionCard";
import TrustScoreRing from "../../../components/security/TrustScoreRing/TrustScoreRing";
import ConfirmDialog from "../../../components/security/ConfirmDialog/ConfirmDialog";
import PasswordInput from "../../../components/common/PasswordInput/PasswordInput";
import { evaluatePassword } from "../../../utils/passwordStrength";
import {
  getSecurityOverview,
  getSessions,
  getSecurityActivity,
  changePassword,
  revokeSession,
  logoutOtherDevices,
  deleteAccount,
  forgotPassword,
  sendVerification,
} from "../../../services/security.service";
import { unmatchPartner } from "../../../services/couple.service";
import "./SecurityCenter.css";

// ── Helpers ──
const daysAgo = (value) => {
  if (!value) return null;
  return Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 86400000));
};
const agoLabel = (value) => {
  const d = daysAgo(value);
  if (d == null) return "—";
  if (d === 0) return "Today";
  if (d === 1) return "Yesterday";
  if (d < 30) return `${d} days ago`;
  const m = Math.floor(d / 30);
  if (m < 12) return `${m} month${m > 1 ? "s" : ""} ago`;
  return new Date(value).toLocaleDateString(undefined, { month: "short", year: "numeric" });
};
const fullDate = (value) =>
  value
    ? new Date(value).toLocaleDateString(undefined, {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "—";

// Icons + labels for the account-activity feed.
const EVENT_META = {
  login: { icon: "🔓", label: "Signed in" },
  failed_login: { icon: "⚠️", label: "Failed sign-in" },
  new_device: { icon: "📲", label: "New device" },
  logout: { icon: "🚪", label: "Signed out" },
  password_changed: { icon: "🔑", label: "Password changed" },
  password_reset: { icon: "🔑", label: "Password reset" },
  email_changed: { icon: "✉️", label: "Email changed" },
  email_verified: { icon: "✅", label: "Email verified" },
  otp_verified: { icon: "✅", label: "Code verified" },
  verification_sent: { icon: "📧", label: "Verification sent" },
  pair_connected: { icon: "💞", label: "Partner connected" },
  partner_unmatched: { icon: "💔", label: "Partner disconnected" },
  security_settings_updated: { icon: "⚙️", label: "Security settings updated" },
  session_revoked: { icon: "🔒", label: "Device signed out" },
  sessions_revoked_all: { icon: "🔒", label: "Other devices signed out" },
  account_deleted: { icon: "🗑️", label: "Account deleted" },
};

const eventTime = (value) => {
  const d = new Date(value);
  const today = new Date();
  const sameDay = d.toDateString() === today.toDateString();
  return sameDay
    ? d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })
    : d.toLocaleDateString(undefined, { month: "short", day: "numeric" }) +
        " · " +
        d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
};

// Small reusable card wrapper.
const Section = ({ title, subtitle, children, icon }) => (
  <section className="sec-section">
    {title && (
      <div className="sec-section__head">
        {icon && <span className="sec-section__icon" aria-hidden="true">{icon}</span>}
        <div>
          <h2 className="sec-section__title">{title}</h2>
          {subtitle && <p className="sec-section__sub">{subtitle}</p>}
        </div>
      </div>
    )}
    <div className="sec-section__card">{children}</div>
  </section>
);

const Row = ({ label, value, badge, children }) => (
  <div className="sec-row">
    <span className="sec-row__label">{label}</span>
    <span className="sec-row__value">
      {value}
      {badge}
      {children}
    </span>
  </div>
);

const SecurityCenter = () => {
  const { user, logout, loadUser } = useAuth();
  const navigate = useNavigate();

  const [overview, setOverview] = useState(null);
  const [sessions, setSessions] = useState(null);
  const [loading, setLoading] = useState(true);
  const [flash, setFlash] = useState(null); // { msg, kind }

  // Change-password form.
  const [pwOpen, setPwOpen] = useState(false);
  const [pw, setPw] = useState({ current: "", next: "", confirm: "" });
  const [pwBusy, setPwBusy] = useState(false);
  const [pwError, setPwError] = useState("");

  // Account activity (lazy).
  const [activity, setActivity] = useState(null);
  const [activityOpen, setActivityOpen] = useState(false);
  const [activityLoading, setActivityLoading] = useState(false);

  // Recovery/verify busy flags.
  const [recBusy, setRecBusy] = useState("");

  // Destructive-action dialog.
  const [dialog, setDialog] = useState(null); // { type, session? }
  const [dialogBusy, setDialogBusy] = useState(false);
  const [dialogError, setDialogError] = useState("");

  const toast = useCallback((msg, kind = "ok") => {
    setFlash({ msg, kind });
    setTimeout(() => setFlash(null), 3500);
  }, []);

  // Refresh overview + sessions (used after security actions). Setting state
  // here is safe — it's driven by user actions / async resolution, not a render.
  const loadCore = useCallback(async () => {
    const [ov, ss] = await Promise.allSettled([
      getSecurityOverview(),
      getSessions(),
    ]);
    if (ov.status === "fulfilled") setOverview(ov.value.data);
    if (ss.status === "fulfilled") setSessions(ss.value.data);
    setLoading(false);
  }, []);

  // Initial load — inline .then + active flag so we never setState synchronously
  // inside the effect (React-compiler rule).
  useEffect(() => {
    let active = true;
    Promise.allSettled([getSecurityOverview(), getSessions()]).then(
      ([ov, ss]) => {
        if (!active) return;
        if (ov.status === "fulfilled") setOverview(ov.value.data);
        if (ss.status === "fulfilled") setSessions(ss.value.data);
        setLoading(false);
      },
    );
    return () => {
      active = false;
    };
  }, []);

  // Lazy-load activity the first time the section is expanded.
  const toggleActivity = async () => {
    const next = !activityOpen;
    setActivityOpen(next);
    if (next && activity == null && !activityLoading) {
      setActivityLoading(true);
      try {
        const res = await getSecurityActivity(30);
        setActivity(res.data || []);
      } catch {
        setActivity([]);
      } finally {
        setActivityLoading(false);
      }
    }
  };

  // ── Change password ──
  const pwEval = evaluatePassword(pw.next);
  const pwMatch = pw.next.length > 0 && pw.next === pw.confirm;
  const canSubmitPw = pw.current.length >= 1 && pwEval.valid && pwMatch && !pwBusy;

  const submitPassword = async (e) => {
    e.preventDefault();
    if (!canSubmitPw) return;
    setPwBusy(true);
    setPwError("");
    try {
      const res = await changePassword(pw.current, pw.next);
      setPw({ current: "", next: "", confirm: "" });
      setPwOpen(false);
      const n = res.data?.revokedOthers || 0;
      toast(
        n > 0
          ? `Password updated. ${n} other device${n > 1 ? "s" : ""} signed out.`
          : "Password updated.",
      );
      loadCore();
    } catch (err) {
      setPwError(err.response?.data?.message || "Could not change password.");
    } finally {
      setPwBusy(false);
    }
  };

  // ── Recovery ──
  const handleForgot = async () => {
    if (recBusy) return;
    setRecBusy("forgot");
    try {
      await forgotPassword(user.email);
      toast("Password reset link sent to your email.");
    } catch {
      toast("Could not send reset email. Try again.", "err");
    } finally {
      setRecBusy("");
    }
  };

  const handleResendVerify = async () => {
    if (recBusy) return;
    setRecBusy("verify");
    try {
      await sendVerification();
      toast("Verification email sent.");
    } catch (err) {
      toast(
        err.response?.data?.message || "Could not send verification email.",
        "err",
      );
    } finally {
      setRecBusy("");
    }
  };

  // ── Destructive dialogs ──
  const openDialog = (type, session = null) => {
    setDialog({ type, session });
    setDialogError("");
  };
  const closeDialog = () => {
    if (dialogBusy) return;
    setDialog(null);
    setDialogError("");
  };

  const runDialog = async (password) => {
    if (!dialog) return;
    setDialogBusy(true);
    setDialogError("");
    try {
      if (dialog.type === "revoke") {
        await revokeSession(dialog.session.id, password);
        setDialog(null);
        toast("Device signed out.");
        loadCore();
      } else if (dialog.type === "logout-others") {
        const res = await logoutOtherDevices(password);
        setDialog(null);
        toast(`Signed out ${res.data?.revokedOthers || 0} other device(s).`);
        loadCore();
      } else if (dialog.type === "logout-all") {
        await logoutOtherDevices(password);
        logout(); // revokes + clears THIS session too
        navigate("/login", { replace: true });
      } else if (dialog.type === "delete") {
        await deleteAccount(password);
        logout();
        navigate("/login", { replace: true });
      } else if (dialog.type === "unmatch") {
        await unmatchPartner();
        setDialog(null);
        toast("Partner disconnected.");
        await loadUser?.();
        navigate("/dashboard", { replace: true });
      }
    } catch (err) {
      setDialogError(err.response?.data?.message || "Something went wrong.");
    } finally {
      setDialogBusy(false);
    }
  };

  // Plain sign-out (this device) — logout() revokes the session server-side.
  const handleSignOut = () => {
    logout();
    navigate("/login", { replace: true });
  };

  const dialogConfig = () => {
    switch (dialog?.type) {
      case "revoke":
        return {
          title: "Sign out this device?",
          message: `${dialog.session.device} · ${dialog.session.browser} will be signed out immediately.`,
          confirmLabel: "Sign out",
          danger: true,
          requirePassword: true,
        };
      case "logout-others":
        return {
          title: "Log out all other devices?",
          message: "Every session except this one will be signed out. You'll stay logged in here.",
          confirmLabel: "Log out others",
          danger: true,
          requirePassword: true,
        };
      case "logout-all":
        return {
          title: "Log out everywhere?",
          message: "This signs you out on every device, including this one.",
          confirmLabel: "Log out everywhere",
          danger: true,
          requirePassword: true,
        };
      case "delete":
        return {
          title: "Delete your account?",
          message:
            "This permanently deletes your account and personal data. Your partner will be disconnected. This cannot be undone.",
          confirmLabel: "Delete account",
          danger: true,
          requirePassword: true,
        };
      case "unmatch":
        return {
          title: "Disconnect from your partner?",
          message:
            "You'll both return to solo mode. Shared memories are kept, but you'll need a new pair code to reconnect.",
          confirmLabel: "Disconnect",
          danger: true,
          requirePassword: false,
        };
      default:
        return {};
    }
  };

  const cfg = dialogConfig();
  const activeSessions = sessions?.length ?? overview?.activeSessions ?? 0;

  return (
    <div className="sec-pg">
      <BackHeader
        title="Security Center"
        subtitle="Manage your account security"
        fallback="/settings"
      />

      {flash && (
        <div className={`sec-flash sec-flash--${flash.kind}`} role="status">
          {flash.msg}
        </div>
      )}

      <div className="sec-pg__content">
        {loading ? (
          <div className="sec-skeletons">
            {[1, 2, 3].map((s) => (
              <div key={s} className="sec-sk-card" />
            ))}
          </div>
        ) : (
          <>
            {/* ── Section 7: Trust score hero ── */}
            {overview?.trust && (
              <section className="sec-hero">
                <TrustScoreRing
                  score={overview.trust.score}
                  level={overview.trust.level}
                />
                <div className="sec-hero__body">
                  <h2 className="sec-hero__title">Account Security</h2>
                  <p className="sec-hero__level" data-level={overview.trust.level}>
                    {overview.trust.level === "strong"
                      ? "Your account is well protected"
                      : overview.trust.level === "good"
                        ? "Your account is fairly secure"
                        : "Your account needs attention"}
                  </p>
                  <ul className="sec-hero__checks">
                    {overview.trust.checks.map((c) => (
                      <li
                        key={c.key}
                        className={`sec-check ${c.ok ? "is-ok" : c.future ? "is-future" : "is-warn"}`}
                      >
                        <span className="sec-check__mark">
                          {c.ok ? "✔" : c.future ? "＋" : "⚠"}
                        </span>
                        {c.label}
                      </li>
                    ))}
                  </ul>
                </div>
              </section>
            )}

            {/* ── Section 1: Account security ── */}
            <Section title="Account Security" icon="🔐">
              <Row
                label="Email"
                value={overview?.email}
                badge={
                  overview?.emailVerified ? (
                    <span className="sec-pill sec-pill--ok">Verified ✓</span>
                  ) : (
                    <span className="sec-pill sec-pill--warn">Unverified</span>
                  )
                }
              />
              <Row label="Password" value="••••••••" />
              <Row label="Last changed" value={agoLabel(overview?.passwordChangedAt)} />
              <Row
                label="Two-Factor Auth"
                value={<span className="sec-muted">Coming soon</span>}
                badge={<span className="sec-pill sec-pill--soon">Off</span>}
              />
              <Row label="Account created" value={fullDate(overview?.accountCreatedAt)} />
            </Section>

            {/* ── Section 2: Change password ── */}
            <Section title="Change Password" icon="🔑">
              {!pwOpen ? (
                <button
                  type="button"
                  className="sec-btn sec-btn--ghost"
                  onClick={() => setPwOpen(true)}
                >
                  Change password
                </button>
              ) : (
                <form className="sec-pwform" onSubmit={submitPassword}>
                  <div className="sec-field">
                    <label htmlFor="pw-current">Current password</label>
                    <PasswordInput
                      id="pw-current"
                      value={pw.current}
                      autoComplete="current-password"
                      onChange={(e) => setPw({ ...pw, current: e.target.value })}
                      placeholder="Enter current password"
                    />
                  </div>
                  <div className="sec-field">
                    <label htmlFor="pw-next">New password</label>
                    <PasswordInput
                      id="pw-next"
                      value={pw.next}
                      autoComplete="new-password"
                      onChange={(e) => setPw({ ...pw, next: e.target.value })}
                      placeholder="Create a strong password"
                    />
                    <PasswordStrength password={pw.next} />
                  </div>
                  <div className="sec-field">
                    <label htmlFor="pw-confirm">Confirm new password</label>
                    <PasswordInput
                      id="pw-confirm"
                      value={pw.confirm}
                      autoComplete="new-password"
                      onChange={(e) => setPw({ ...pw, confirm: e.target.value })}
                      placeholder="Re-enter new password"
                    />
                    {pw.confirm.length > 0 && !pwMatch && (
                      <p className="sec-field__hint sec-field__hint--err">
                        Passwords don’t match
                      </p>
                    )}
                  </div>

                  {pwError && <p className="sec-form-err" role="alert">{pwError}</p>}

                  <div className="sec-pwform__actions">
                    <button
                      type="button"
                      className="sec-btn sec-btn--ghost"
                      onClick={() => {
                        setPwOpen(false);
                        setPw({ current: "", next: "", confirm: "" });
                        setPwError("");
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="sec-btn sec-btn--primary"
                      disabled={!canSubmitPw}
                    >
                      {pwBusy ? <span className="sec-spinner" /> : "Update password"}
                    </button>
                  </div>
                  <p className="sec-form-note">
                    Changing your password signs out all your other devices.
                  </p>
                </form>
              )}
            </Section>

            {/* ── Sections 4 & 5: Where you're logged in + device management ── */}
            <Section
              title="Where You're Logged In"
              subtitle={`${activeSessions} active session${activeSessions === 1 ? "" : "s"}`}
              icon="💻"
            >
              <div className="sec-sessions">
                {sessions?.length ? (
                  sessions.map((s) => (
                    <SessionCard
                      key={s.id}
                      session={s}
                      onRevoke={(sess) => openDialog("revoke", sess)}
                    />
                  ))
                ) : (
                  <p className="sec-empty">
                    No other active sessions. (Older logins aren’t tracked.)
                  </p>
                )}
              </div>
              {activeSessions > 1 && (
                <button
                  type="button"
                  className="sec-btn sec-btn--ghost sec-btn--full"
                  onClick={() => openDialog("logout-others")}
                >
                  Log out all other devices
                </button>
              )}
            </Section>

            {/* ── Section 6: Account activity (lazy) ── */}
            <Section title="Account Activity" icon="📜">
              <button
                type="button"
                className="sec-disclosure"
                onClick={toggleActivity}
                aria-expanded={activityOpen}
              >
                <span>Recent security events</span>
                <span className={`sec-disclosure__chev ${activityOpen ? "is-open" : ""}`}>
                  ›
                </span>
              </button>

              {activityOpen && (
                <div className="sec-activity">
                  {activityLoading ? (
                    <p className="sec-empty">Loading…</p>
                  ) : activity?.length ? (
                    activity.map((ev) => {
                      const meta = EVENT_META[ev.type] || { icon: "•", label: ev.type };
                      return (
                        <div key={ev._id} className="sec-event">
                          <span className="sec-event__icon">{meta.icon}</span>
                          <div className="sec-event__body">
                            <span className="sec-event__label">
                              {ev.message || meta.label}
                            </span>
                            <span className="sec-event__meta">
                              {[ev.device, ev.location].filter(Boolean).join(" · ")}
                            </span>
                          </div>
                          <span className="sec-event__time">{eventTime(ev.createdAt)}</span>
                        </div>
                      );
                    })
                  ) : (
                    <p className="sec-empty">No recent activity.</p>
                  )}
                </div>
              )}
            </Section>

            {/* ── Section 8: Recovery options ── */}
            <Section title="Recovery Options" icon="🛟">
              {!overview?.emailVerified && (
                <button
                  type="button"
                  className="sec-link-row"
                  onClick={handleResendVerify}
                  disabled={recBusy === "verify"}
                >
                  <span>📧 Resend verification email</span>
                  <span className="sec-link-row__chev">
                    {recBusy === "verify" ? "…" : "›"}
                  </span>
                </button>
              )}
              <button
                type="button"
                className="sec-link-row"
                onClick={handleForgot}
                disabled={recBusy === "forgot"}
              >
                <span>🔁 Send password reset link</span>
                <span className="sec-link-row__chev">
                  {recBusy === "forgot" ? "…" : "›"}
                </span>
              </button>
              <div className="sec-link-row sec-link-row--static">
                <span>✉️ Recovery email</span>
                <span className="sec-muted">Coming soon</span>
              </div>
            </Section>

            {/* ── Section 10: Privacy & security quick access ── */}
            <Section title="Privacy & Security" icon="🛡">
              <button className="sec-link-row" onClick={() => navigate("/privacy")}>
                <span>🔒 Privacy & Visibility</span>
                <span className="sec-link-row__chev">›</span>
              </button>
              <button className="sec-link-row" onClick={() => navigate("/privacy")}>
                <span>👤 Profile visibility</span>
                <span className="sec-link-row__chev">›</span>
              </button>
              {user?.currentCoupleId && (
                <button className="sec-link-row" onClick={() => navigate("/trust-center")}>
                  <span>💞 Trust Center</span>
                  <span className="sec-link-row__chev">›</span>
                </button>
              )}
              <div className="sec-link-row sec-link-row--static">
                <span>🚫 Blocked users</span>
                <span className="sec-muted">Coming soon</span>
              </div>
            </Section>

            {/* ── Section 9: Danger zone ── */}
            <Section title="Danger Zone" icon="⚠️">
              <div className="sec-danger">
                <button className="sec-danger__row" onClick={handleSignOut}>
                  <span>Log out (this device)</span>
                  <span>🚪</span>
                </button>
                <button
                  className="sec-danger__row"
                  onClick={() => openDialog("logout-all")}
                >
                  <span>Log out from all devices</span>
                  <span>🔒</span>
                </button>
                {user?.currentCoupleId && (
                  <button
                    className="sec-danger__row sec-danger__row--warn"
                    onClick={() => openDialog("unmatch")}
                  >
                    <span>Disconnect partner</span>
                    <span>💔</span>
                  </button>
                )}
                <button
                  className="sec-danger__row sec-danger__row--delete"
                  onClick={() => openDialog("delete")}
                >
                  <span>Delete account</span>
                  <span>🗑️</span>
                </button>
              </div>
            </Section>

            <p className="sec-footer">
              CoupleCare · Your account, protected
            </p>
          </>
        )}
      </div>

      {dialog && (
        <ConfirmDialog
          open
          onClose={closeDialog}
          onConfirm={runDialog}
          busy={dialogBusy}
          error={dialogError}
          {...cfg}
        />
      )}
    </div>
  );
};

export default SecurityCenter;
