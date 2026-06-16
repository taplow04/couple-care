import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../../context/AuthContext";
import { setRelationshipStartDate } from "../../../services/couple.service";
import "./CoupleSuccess.css";

const todayISO = () => new Date().toISOString().split("T")[0];

const CoupleSuccess = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { loadUser } = useAuth();

  // location.state?.couple is available but the date is couple-wide, so we
  // just let either partner set it here.
  const [date, setDate] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    // Refresh full user state from server so dashboard has accurate data
    loadUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const goToDashboard = () => navigate("/dashboard", { replace: true });

  const handleSaveDate = async () => {
    if (!date) {
      goToDashboard();
      return;
    }
    setSaving(true);
    setError("");
    try {
      await setRelationshipStartDate(date);
      goToDashboard();
    } catch (err) {
      setError(
        err.response?.data?.message || "Couldn't save the date. You can add it later.",
      );
      setSaving(false);
    }
  };

  return (
    <div className="couple-success">
      <div className="couple-success__burst" aria-hidden="true">
        {["💕", "❤️", "✨", "💖", "🎉", "💗"].map((e, i) => (
          <span key={i} className="couple-success__particle" style={{ "--i": i }}>
            {e}
          </span>
        ))}
      </div>

      <div className="couple-success__card">
        <div className="couple-success__check">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>

        <h1 className="couple-success__title">You're Connected!</h1>
        <p className="couple-success__subtitle">
          One last thing — when did your story begin?
        </p>

        <div className="couple-success__date">
          <label className="couple-success__date-label" htmlFor="start-date">
            When did you start dating?
          </label>
          <input
            id="start-date"
            type="date"
            className="couple-success__date-input"
            value={date}
            max={todayISO()}
            onChange={(e) => setDate(e.target.value)}
          />
          <p className="couple-success__date-hint">
            This sets your real “days together”. You can change it later.
          </p>
        </div>

        {error && <p className="couple-success__error">{error}</p>}

        <button
          className="couple-success__btn"
          onClick={handleSaveDate}
          disabled={saving}
        >
          {saving ? "Saving…" : date ? "Save & Start 💕" : "Start Your Journey 💕"}
        </button>

        {date && (
          <button
            className="couple-success__skip"
            onClick={goToDashboard}
            disabled={saving}
          >
            Skip for now
          </button>
        )}
      </div>
    </div>
  );
};

export default CoupleSuccess;
