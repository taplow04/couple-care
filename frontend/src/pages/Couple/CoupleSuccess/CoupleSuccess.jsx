import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../../context/AuthContext";
import "./CoupleSuccess.css";

const CoupleSuccess = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { loadUser } = useAuth();

  const couple = location.state?.couple;

  useEffect(() => {
    // Refresh full user state from server so dashboard has accurate data
    loadUser();
  }, []);

  const handleStart = async () => {
    navigate("/dashboard", { replace: true });
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
          Your hearts are now linked. Start logging moods, making memories, and growing together.
        </p>

        <button className="couple-success__btn" onClick={handleStart}>
          Start Your Journey 💕
        </button>
      </div>
    </div>
  );
};

export default CoupleSuccess;
