import { useNavigate } from "react-router-dom";

import { useAuth } from "../../../context/AuthContext";
import { getFirstName } from "../../../utils/getFirstName";
import "./HealingDashboard.css";

/**
 * 🌤 Stage 3 — Growing After Goodbye (Healing Mode).
 *
 * Phase 0 scaffold: when a relationship ends the user is NOT simply
 * disconnected — they transition into a gentle healing home instead of the
 * onboarding wall. Phase 2 fills this with healing progress, mood recovery,
 * the permanent Relationship Summary, a Recovery Coach, the private Growth
 * Report, and the reconnect path.
 */
const HealingDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const name = getFirstName(user?.name, "there");

  return (
    <div className="heal-dash">
      <div className="heal-dash__content">
        <header className="heal-dash__header">
          <span className="heal-dash__badge">🌤 Healing Journey</span>
          <h1 className="heal-dash__greeting">Take care, {name}</h1>
          <p className="heal-dash__sub">
            Endings are part of growth. This space is yours — to reflect, heal,
            and become ready for what's next, at your own pace.
          </p>
        </header>

        <section className="heal-card heal-card--soon">
          <h2 className="heal-card__title">Your healing space</h2>
          <p className="heal-card__text">
            Healing progress, mood recovery, a Recovery Coach, your permanent
            Relationship Summary, and a private Growth Report are arriving here
            soon.
          </p>
          <ul className="heal-soon__list">
            <li>🌱 Healing Progress</li>
            <li>💗 Mood Recovery</li>
            <li>🪞 Daily Reflection</li>
            <li>🎯 Growth Challenges</li>
            <li>💬 Recovery Coach</li>
            <li>📜 Relationship Summary</li>
          </ul>
        </section>

        <section className="heal-card heal-card--reconnect">
          <h2 className="heal-card__title">When you're ready</h2>
          <p className="heal-card__text">
            There's no rush. Whenever you feel ready to begin again, you can
            connect with someone new.
          </p>
          <button
            className="heal-btn"
            onClick={() => navigate("/couple")}
          >
            Begin Again
          </button>
        </section>
      </div>
    </div>
  );
};

export default HealingDashboard;
