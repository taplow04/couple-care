import { useNavigate } from "react-router-dom";
import "./BackHeader.css";

const ChevronLeft = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path
      d="M15 18L9 12L15 6"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

/**
 * Universal sticky back header for secondary pages.
 *
 * Always navigates via React Router (never the browser chrome). Uses history
 * when there is somewhere to go back to, otherwise falls back to a sensible
 * route so deep-links / refreshes don't strand the user.
 *
 * Props:
 *  - title       page title (string)
 *  - subtitle    optional sub-line
 *  - right       optional node rendered on the right (actions)
 *  - onBack      override the back handler entirely
 *  - fallback    route used when there's no history (default "/dashboard")
 */
const BackHeader = ({ title, subtitle, right, onBack, fallback = "/dashboard" }) => {
  const navigate = useNavigate();

  const handleBack = () => {
    if (onBack) return onBack();
    // history.state.idx === 0 means this is the first entry — nothing to pop.
    const idx = window.history.state?.idx;
    if (typeof idx === "number" && idx > 0) {
      navigate(-1);
    } else {
      navigate(fallback, { replace: true });
    }
  };

  return (
    <header className="back-header glass">
      <button
        type="button"
        className="back-header__btn"
        onClick={handleBack}
        aria-label="Go back"
      >
        <ChevronLeft />
      </button>

      <div className="back-header__titles">
        {title && <h1 className="back-header__title">{title}</h1>}
        {subtitle && <p className="back-header__sub">{subtitle}</p>}
      </div>

      {right ? <div className="back-header__right">{right}</div> : <div className="back-header__spacer" />}
    </header>
  );
};

export default BackHeader;
