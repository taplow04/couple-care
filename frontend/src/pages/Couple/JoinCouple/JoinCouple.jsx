import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../../context/AuthContext";
import { joinCouple } from "../../../services/couple.service";
import JoinCodeForm from "../../../components/couple/JoinCodeForm/JoinCodeForm";
import "./JoinCouple.css";

const JoinCouple = () => {
  const navigate = useNavigate();
  const { updateUser, user } = useAuth();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Users who already have a couple can't join another one.
  useEffect(() => {
    if (user?.coupleConnected) {
      navigate("/dashboard", { replace: true });
    } else if (user?.currentCoupleId) {
      navigate("/couple/create", { replace: true });
    }
  }, [user, navigate]);

  const handleSubmit = async (code) => {
    setLoading(true);
    setError("");
    try {
      const res = await joinCouple(code);
      const couple = res.data;
      updateUser({ currentCoupleId: couple._id });
      navigate("/couple/success", { replace: true, state: { couple } });
    } catch (err) {
      const msg = err.response?.data?.message || "Something went wrong";
      if (msg === "Invalid pair code") {
        setError("That code doesn't exist. Double-check and try again.");
      } else if (msg === "Pair code already used") {
        setError("This code has already been used.");
      } else if (msg === "Cannot pair with yourself") {
        setError("You can't connect with yourself! Share the code with your partner.");
      } else if (msg === "Already in a relationship") {
        setError("You're already connected with a partner.");
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="join-couple">
      <div className="join-couple__header">
        <button className="join-couple__back" onClick={() => navigate("/couple")}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <h1 className="join-couple__title">Join Partner</h1>
        <div style={{ width: 40 }} />
      </div>

      <div className="join-couple__body">
        <div className="join-couple__hero">
          <span className="join-couple__emoji">🔗</span>
          <p className="join-couple__instructions">
            Enter the pair code your partner shared with you.
          </p>
        </div>

        <JoinCodeForm onSubmit={handleSubmit} loading={loading} error={error} />

        <div className="join-couple__hint">
          <p>Don't have a code? Ask your partner to open CoupleCare and create a couple first.</p>
        </div>
      </div>
    </div>
  );
};

export default JoinCouple;
