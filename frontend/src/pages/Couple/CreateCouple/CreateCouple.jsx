import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../../context/AuthContext";
import {
  createCouple,
  getMyCouple,
  cancelPendingCouple,
} from "../../../services/couple.service";
import BackHeader from "../../../components/common/BackHeader/BackHeader";
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

  // Back to the Create / Join selection. Instant (explicit route, no browser
  // history) and non-blocking: we optimistically detach the user client-side so
  // CoupleLanding doesn't bounce us straight back, then discard the still-
  // pending couple in the background so the user is free to Join instead.
  const handleBack = () => {
    clearInterval(pollRef.current);
    if (couple && !couple.partnerTwoId) {
      updateUser({ currentCoupleId: null });
      cancelPendingCouple().catch(() => {
        /* best-effort — a stale pending couple self-heals on next create */
      });
    }
    navigate("/couple", { replace: true });
  };

  return (
    <div className="create-couple">
      <BackHeader
        title="Your Pair Code"
        onBack={handleBack}
        fallback="/couple"
        right={
          <button className="create-couple__logout" onClick={handleLogout}>
            Log out
          </button>
        }
      />

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
