import { useNavigate } from "react-router-dom";

import { useAuth } from "../../../context/AuthContext";
import { getFirstName } from "../../../utils/getFirstName";
import "./PreparingDashboard.css";

/**
 * 🌱 Stage 1 — Preparing For Love.
 *
 * Phase 0 scaffold: a welcoming solo home that, crucially, replaces the old
 * "redirect to onboarding wall" behaviour — a partner-less user now lands
 * somewhere meaningful and can connect from here. Phase 1 fills this with the
 * full self-growth experience (readiness, journal, reflection, challenges,
 * love-language / attachment, personal XP, prep coach).
 */
const PreparingDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const name = getFirstName(user?.name, "there");

  return (
    <div className="prep-dash">
      <div className="prep-dash__content">
        <header className="prep-dash__header">
          <span className="prep-dash__badge">🌱 Preparing For Love</span>
          <h1 className="prep-dash__greeting">Hi {name}</h1>
          <p className="prep-dash__sub">
            Your relationship journey starts with you. Grow, reflect, and get
            ready — then connect when the time is right.
          </p>
        </header>

        <section className="prep-card prep-card--connect">
          <div className="prep-card__icon" aria-hidden="true">💞</div>
          <h2 className="prep-card__title">Connect with your partner</h2>
          <p className="prep-card__text">
            Share your pair code or enter theirs to begin Growing Together.
          </p>
          <div className="prep-card__actions">
            <button
              className="prep-btn prep-btn--primary"
              onClick={() => navigate("/couple/create")}
            >
              Share Pair Code
            </button>
            <button
              className="prep-btn prep-btn--ghost"
              onClick={() => navigate("/couple/join")}
            >
              Join With Code
            </button>
          </div>
        </section>

        <section className="prep-card prep-card--soon">
          <h2 className="prep-card__title">Your growth space</h2>
          <p className="prep-card__text">
            Daily reflection, journaling, gratitude, growth challenges, your
            love language and attachment style, and a Relationship Preparation
            Coach are arriving here soon.
          </p>
          <ul className="prep-soon__list">
            <li>🪞 Daily Reflection</li>
            <li>📓 Daily Journal</li>
            <li>🙏 Gratitude</li>
            <li>🎯 Growth Challenges</li>
            <li>💬 Preparation Coach</li>
            <li>📈 Readiness Score</li>
          </ul>
        </section>
      </div>
    </div>
  );
};

export default PreparingDashboard;
