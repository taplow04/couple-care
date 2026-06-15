import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../../context/AuthContext";
import { createCouple, getMyCouple } from "../../../services/couple.service";
import PairCodeCard from "../../../components/couple/PairCodeCard/PairCodeCard";
import ShareCodeCard from "../../../components/couple/ShareCodeCard/ShareCodeCard";
import ConnectionStatus from "../../../components/couple/ConnectionStatus/ConnectionStatus";
import "./CreateCouple.css";

const CreateCouple = () => {
  const navigate = useNavigate();
  const { updateUser } = useAuth();

  const [couple, setCouple] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    init();
  }, []);

  const init = async () => {
    try {
      // Check if user already has a couple (e.g., after page refresh)
      const existing = await getMyCouple();
      if (existing.data) {
        const c = existing.data;
        // Already fully connected → go to dashboard
        if (c.partnerTwoId) {
          navigate("/dashboard", { replace: true });
          return;
        }
        // Has a pending couple — show the existing code
        setCouple(c);
        setLoading(false);
        return;
      }
      // No couple yet — create one
      await generate();
    } catch {
      await generate();
    }
  };

  const generate = async () => {
    try {
      const res = await createCouple();
      const newCouple = res.data;
      setCouple(newCouple);
      updateUser({ currentCoupleId: newCouple._id });
    } catch (err) {
      const msg = err.response?.data?.message || "Failed to create couple";
      if (msg === "Already in a relationship") {
        // Race condition — fetch existing
        try {
          const existing = await getMyCouple();
          if (existing.data?.partnerTwoId) {
            navigate("/dashboard", { replace: true });
            return;
          }
          setCouple(existing.data);
        } catch {
          setError("Something went wrong. Please try again.");
        }
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="create-couple">
      <div className="create-couple__header">
        <button className="create-couple__back" onClick={() => navigate("/couple")}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <h1 className="create-couple__title">Your Pair Code</h1>
        <div style={{ width: 40 }} />
      </div>

      <div className="create-couple__body">
        {loading ? (
          <div className="create-couple__generating">
            <div className="create-couple__spinner" />
            <p>Generating your unique code…</p>
          </div>
        ) : error ? (
          <div className="create-couple__error">
            <p>{error}</p>
            <button className="create-couple__retry" onClick={init}>Try Again</button>
          </div>
        ) : couple ? (
          <>
            <p className="create-couple__instructions">
              Share this code with your partner. Once they join, you'll both be connected. 🎉
            </p>

            <PairCodeCard code={couple.pairCode} />

            <ShareCodeCard code={couple.pairCode} />

            <ConnectionStatus status="waiting" />

            <button
              className="create-couple__dashboard-btn"
              onClick={() => navigate("/dashboard")}
            >
              Go to Dashboard
            </button>
          </>
        ) : null}
      </div>
    </div>
  );
};

export default CreateCouple;
