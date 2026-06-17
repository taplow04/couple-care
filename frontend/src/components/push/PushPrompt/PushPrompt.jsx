import { useState } from "react";
import {
  isPushSupported,
  getPermission,
  subscribeToPush,
} from "../../../services/push.service";
import "./PushPrompt.css";

const DISMISS_KEY = "cc_push_prompt_dismissed";

/**
 * Soft opt-in banner for browser push. Shows only when push is supported and the
 * user hasn't decided yet (permission === "default") and hasn't dismissed it.
 * The actual permission request happens on the button click (a user gesture),
 * which is required by browsers.
 */
const PushPrompt = () => {
  const supported = isPushSupported();
  const [hidden, setHidden] = useState(
    !supported ||
      getPermission() !== "default" ||
      localStorage.getItem(DISMISS_KEY) === "1",
  );
  const [busy, setBusy] = useState(false);

  if (hidden) return null;

  const enable = async () => {
    setBusy(true);
    try {
      await subscribeToPush();
    } finally {
      setBusy(false);
      setHidden(true);
    }
  };

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, "1");
    setHidden(true);
  };

  return (
    <div className="push-prompt" role="dialog" aria-label="Enable notifications">
      <span className="push-prompt__emoji" aria-hidden="true">🔔</span>
      <div className="push-prompt__body">
        <p className="push-prompt__title">Stay in the loop</p>
        <p className="push-prompt__text">
          Get notified about messages, calls and reminders — even when the app is
          closed.
        </p>
      </div>
      <div className="push-prompt__actions">
        <button
          className="push-prompt__btn push-prompt__btn--primary"
          onClick={enable}
          disabled={busy}
        >
          {busy ? "…" : "Enable"}
        </button>
        <button
          className="push-prompt__btn push-prompt__btn--ghost"
          onClick={dismiss}
          aria-label="Dismiss"
        >
          Not now
        </button>
      </div>
    </div>
  );
};

export default PushPrompt;
