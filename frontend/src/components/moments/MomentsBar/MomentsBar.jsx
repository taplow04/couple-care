import { useEffect, useRef, useState } from "react";

import MomentCircle from "../MomentCircle/MomentCircle";
import MomentViewer from "../MomentViewer/MomentViewer";
import MomentCapture from "../MomentCapture/MomentCapture";
import { useMoments } from "../../../hooks/useMoments";
import { createCoupleMoment } from "../../../services/moments.service";
import { getFirstName } from "../../../utils/getFirstName";
import "./MomentsBar.css";

/**
 * The two-circle Moments row at the top of the Dashboard (Feature 1): "Your
 * Moment" + "Partner's Moment". Opens the capture composer and the full-screen
 * viewer, and surfaces the live "Create Shared Moment?" offer (Feature 12).
 */
const MomentsBar = ({ autoOpenPartner = false }) => {
  const { circles, loading, refresh, coupleCandidate, setCoupleCandidate } = useMoments();
  const [capture, setCapture] = useState(false);
  const [viewer, setViewer] = useState(null); // { moments, isOwn }
  const [merging, setMerging] = useState(false);
  const autoOpenedRef = useRef(false);

  const self = circles.self;
  const partner = circles.partner;

  // When reached from a "new Moment" notification (/moments), open the partner's
  // unseen Moments straight away (Feature 4) — once.
  useEffect(() => {
    if (
      autoOpenPartner &&
      !autoOpenedRef.current &&
      !loading &&
      partner?.hasUnseen &&
      partner?.moments?.length
    ) {
      autoOpenedRef.current = true;
      setViewer({ moments: partner.moments, isOwn: false });
    }
  }, [autoOpenPartner, loading, partner]);

  const openOwn = () => {
    if (self?.moments?.length) setViewer({ moments: self.moments, isOwn: true });
    else setCapture(true);
  };

  const openPartner = () => {
    if (partner?.moments?.length) setViewer({ moments: partner.moments, isOwn: false });
  };

  const handleMerge = async () => {
    if (!coupleCandidate?.momentIds) return;
    setMerging(true);
    try {
      await createCoupleMoment(coupleCandidate.momentIds);
      setCoupleCandidate(null);
      refresh();
    } catch {
      /* ignore */
    } finally {
      setMerging(false);
    }
  };

  if (loading) {
    return (
      <div className="moments-bar">
        <div className="moments-bar__skeleton" />
        <div className="moments-bar__skeleton" />
      </div>
    );
  }

  return (
    <>
      {coupleCandidate?.momentIds && (
        <button
          type="button"
          className="moments-bar__couple-offer"
          onClick={handleMerge}
          disabled={merging}
        >
          ❤️ You both shared a Moment — {merging ? "creating…" : "Create Shared Moment?"}
        </button>
      )}

      <div className="moments-bar" role="list" aria-label="Moments">
        <div className="moments-bar__self">
          <MomentCircle
            label="Your Moment"
            name={self?.author?.name}
            photo={self?.author?.profilePhoto}
            hasMoments={self?.hasMoments}
            unseen={false}
            addable={!self?.hasMoments}
            onClick={openOwn}
          />
          {self?.hasMoments && (
            <button
              type="button"
              className="moments-bar__add"
              onClick={() => setCapture(true)}
              aria-label="Add a new Moment"
            >
              +
            </button>
          )}
        </div>

        <MomentCircle
          label={
            partner?.author
              ? `${getFirstName(partner.author.name, "Partner")}'s Moment`
              : "Partner"
          }
          name={partner?.author?.name}
          photo={partner?.author?.profilePhoto}
          hasMoments={partner?.hasMoments}
          unseen={partner?.hasUnseen}
          onClick={openPartner}
        />
      </div>

      {capture && (
        <MomentCapture
          onClose={() => {
            setCapture(false);
            refresh();
          }}
          onUploaded={() => refresh()}
        />
      )}

      {viewer && (
        <MomentViewer
          moments={viewer.moments}
          isOwn={viewer.isOwn}
          startIndex={0}
          onClose={() => {
            setViewer(null);
            refresh();
          }}
          onChanged={refresh}
        />
      )}
    </>
  );
};

export default MomentsBar;
