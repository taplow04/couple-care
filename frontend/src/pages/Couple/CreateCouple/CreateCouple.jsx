import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../../context/AuthContext";
import { createCouple, getMyCouple } from "../../../services/couple.service";
import PairCodeCard from "../../../components/couple/PairCodeCard/PairCodeCard";
import ShareCodeCard from "../../../components/couple/ShareCodeCard/ShareCodeCard";
import ConnectionStatus from "../../../components/couple/ConnectionStatus/ConnectionStatus";
import "./CreateCouple.css";

const POLL_INTERVAL = 4000;

const CreateCouple = () => {
  const navigate = useNavigate();
  const { updateUser, loadUser, logout } = useAuth();

  const [couple, setCouple] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const pollRef = useRef(null);

  useEffect(() => {
    init();
    return () => clearInterval(pollRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Poll for the partner joining while we have a pending (un-joined) couple.
  useEffect(() => {
    if (!couple || couple.partnerTwoId) return;

    pollRef.current = setInterval(async () => {
      try {
        const res = await getMyCouple();
        const fresh = res.data;
        if (fresh?.partnerTwoId) {
          clearInterval(pollRef.current);
          await loadUser();
          navigate("/couple/success", { replace: true, state: { couple: fresh } });
        }
      } catch {
        // Transient error — keep polling
      }
    }, POLL_INTERVAL);

    return () => clearInterval(pollRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [couple]);

  const init = async () => {
    try {
      const existing = await getMyCouple();
      if (existing.data) {
        const c = existing.data;
        if (c.partnerTwoId) {
          await loadUser();
          navigate("/dashboard", { replace: true });
          return;
        }
        setCouple(c);
        setLoading(false);
        return;
      }
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
        try {
          const existing = await getMyCouple();
          if (existing.data?.partnerTwoId) {
            await loadUser();
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

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <div className="create-couple">
      <div className="create-couple__header">
        {couple ? (
          <button className="create-couple__logout" onClick={handleLogout}>
            Log out
          </button>
        ) : (
          <button className="create-couple__back" onClick={() => navigate("/couple")}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
        )}
        <h1 className="create-couple__title">Your Pair Code</h1>
        <div style={{ width: 64 }} />
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
              Share this code with your partner. The moment they join, you'll both be connected. 🎉
            </p>

            <PairCodeCard code={couple.pairCode} />

            <ShareCodeCard code={couple.pairCode} />

            <ConnectionStatus status="waiting" />
          </>
        ) : null}
      </div>
    </div>
  );
};

export default CreateCouple;
