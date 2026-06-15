import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../../context/AuthContext";
import "./CoupleLanding.css";

const CoupleLanding = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // If already fully connected (has couple + partner joined), go to dashboard
  useEffect(() => {
    // We only block if they somehow navigate here while connected
    // CreateCouple handles the "pending couple" case
  }, []);

  return (
    <div className="couple-landing">
      <div className="couple-landing__hero">
        <div className="couple-landing__emoji-wrap">
          <span className="couple-landing__emoji">💕</span>
        </div>
        <h1 className="couple-landing__title">Connect with Your Partner</h1>
        <p className="couple-landing__subtitle">
          Create a pair code and share it, or enter your partner's code to start your journey together.
        </p>
      </div>

      <div className="couple-landing__actions">
        <button
          className="couple-landing__btn couple-landing__btn--primary"
          onClick={() => navigate("/couple/create")}
        >
          <span className="couple-landing__btn-icon">✨</span>
          <div className="couple-landing__btn-text">
            <strong>Create Couple</strong>
            <span>Generate a code for your partner</span>
          </div>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 18l6-6-6-6" />
          </svg>
        </button>

        <button
          className="couple-landing__btn couple-landing__btn--secondary"
          onClick={() => navigate("/couple/join")}
        >
          <span className="couple-landing__btn-icon">🔗</span>
          <div className="couple-landing__btn-text">
            <strong>Join with Code</strong>
            <span>Enter your partner's pair code</span>
          </div>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 18l6-6-6-6" />
          </svg>
        </button>
      </div>

      <p className="couple-landing__footer">
        Hey {user?.name?.split(" ")[0] || "there"} 👋 — your partner needs the CoupleCare app too.
      </p>
    </div>
  );
};

export default CoupleLanding;
