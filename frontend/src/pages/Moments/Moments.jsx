import BackHeader from "../../components/common/BackHeader/BackHeader";
import MomentsBar from "../../components/moments/MomentsBar/MomentsBar";
import MomentHighlights from "../../components/moments/MomentHighlights/MomentHighlights";
import "./Moments.css";

/**
 * Moments page — the home for CoupleCare Moments outside the dashboard row:
 * the live story circles, then the saved Highlights (Feature 11). The capture
 * composer and the full-screen viewer are launched from the bar/highlights and
 * render as global overlays (portals).
 */
const Moments = () => {
  return (
    <div className="moments-page">
      <BackHeader title="Moments" subtitle="Share your day, just for two" />

      <div className="moments-page__content">
        <MomentsBar autoOpenPartner />
        <p className="moments-page__hint">
          Moments disappear after 24 hours — save the ones you love to a Highlight
          or your Journey. ❤️
        </p>
        <MomentHighlights />
      </div>
    </div>
  );
};

export default Moments;
