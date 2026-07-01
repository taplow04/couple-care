import { useEffect, useState } from "react";
import "./ConfirmDialog.css";

/**
 * Premium confirmation modal, optionally requiring password re-entry (used for
 * destructive session/account actions). Controlled via `open`.
 *
 * Props:
 *  - open, onClose, onConfirm(password)
 *  - title, message, confirmLabel, danger (bool)
 *  - requirePassword (bool) — show a password field, pass its value to onConfirm
 *  - busy (bool), error (string)
 */
const ConfirmDialog = ({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = "Confirm",
  danger = false,
  requirePassword = false,
  busy = false,
  error = "",
}) => {
  const [password, setPassword] = useState("");

  // Close on Escape.
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === "Escape" && !busy && onClose?.();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, busy, onClose]);

  if (!open) return null;

  const disabled = busy || (requirePassword && password.length < 1);

  const submit = (e) => {
    e.preventDefault();
    if (disabled) return;
    onConfirm?.(password);
  };

  return (
    <div className="confirm-dlg" role="dialog" aria-modal="true" aria-label={title}>
      <button
        type="button"
        className="confirm-dlg__scrim"
        aria-label="Dismiss"
        onClick={() => !busy && onClose?.()}
      />
      <form className="confirm-dlg__panel glass" onSubmit={submit}>
        <h3 className={`confirm-dlg__title ${danger ? "is-danger" : ""}`}>{title}</h3>
        {message && <p className="confirm-dlg__msg">{message}</p>}

        {requirePassword && (
          <label className="confirm-dlg__field">
            <span>Confirm your password</span>
            <input
              type="password"
              autoFocus
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Current password"
              autoComplete="current-password"
            />
          </label>
        )}

        {error && <p className="confirm-dlg__error" role="alert">{error}</p>}

        <div className="confirm-dlg__actions">
          <button
            type="button"
            className="confirm-dlg__btn confirm-dlg__btn--ghost"
            onClick={() => !busy && onClose?.()}
            disabled={busy}
          >
            Cancel
          </button>
          <button
            type="submit"
            className={`confirm-dlg__btn ${danger ? "confirm-dlg__btn--danger" : "confirm-dlg__btn--primary"}`}
            disabled={disabled}
          >
            {busy ? <span className="confirm-dlg__spinner" /> : confirmLabel}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ConfirmDialog;
