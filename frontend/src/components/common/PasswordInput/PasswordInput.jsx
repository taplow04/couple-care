import { useState } from "react";

import "./PasswordInput.css";

const EyeIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const EyeOffIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-6.5 0-10-7-10-7a18.5 18.5 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c6.5 0 10 7 10 7a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
    <line x1="2" y1="2" x2="22" y2="22" />
  </svg>
);

/**
 * Reusable password field with an in-field show/hide eye toggle. Used for EVERY
 * password input in the app (auth, security, confirm dialogs) so the behaviour
 * and look stay consistent.
 *
 * Design notes:
 *  - Toggling flips `type` on the SAME <input> node → value, focus, cursor
 *    position and the mobile keyboard are all preserved (no remount/refresh).
 *  - The eye button uses onMouseDown→preventDefault so tapping it never blurs
 *    the input (keyboard stays open, focus stays put).
 *  - The <input> intentionally has NO box styling of its own — it inherits the
 *    surrounding context's input styles (`.auth-input-group input`,
 *    `.sec-field input`, `.confirm-dlg__field input`), so the field always
 *    matches its neighbours. We only reserve room on the right for the eye.
 *
 * All extra props (name, value, onChange, placeholder, autoComplete, autoFocus,
 * maxLength, onKeyDown, …) are forwarded to the <input>.
 */
const PasswordInput = ({ className = "", inputClassName = "", ...rest }) => {
  const [visible, setVisible] = useState(false);

  return (
    <div className={`pw-input ${className}`.trim()}>
      <input
        {...rest}
        type={visible ? "text" : "password"}
        className={`pw-input__field ${inputClassName}`.trim()}
      />
      <button
        type="button"
        className="pw-input__eye"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "Hide password" : "Show password"}
        aria-pressed={visible}
        title={visible ? "Hide password" : "Show password"}
        tabIndex={0}
      >
        {visible ? <EyeOffIcon /> : <EyeIcon />}
      </button>
    </div>
  );
};

export default PasswordInput;
