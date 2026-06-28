import { NavLink } from "react-router-dom";
import { useAuth } from "../../../context/AuthContext";
import { useStage } from "../../../hooks/useStage";
import { STAGE } from "../../../utils/stage";
import { getFirstName } from "../../../utils/getFirstName";
import "./BottomNav.css";

const HomeIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
    <path d="M5 12L12 5L19 12V20C19 20.55 18.55 21 18 21H15V16H9V21H6C5.45 21 5 20.55 5 20V12Z"
      fill="currentColor" opacity="0.15" />
    <path d="M3 12L12 3L21 12" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M5 10.5V20C5 20.55 5.45 21 6 21H9.5V16.5H14.5V21H18C18.55 21 19 20.55 19 20V10.5"
      stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const MoodIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.9" />
    <path d="M8.5 15C9.5 16.5 10.7 17 12 17C13.3 17 14.5 16.5 15.5 15"
      stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
    <circle cx="9" cy="10" r="1.3" fill="currentColor" />
    <circle cx="15" cy="10" r="1.3" fill="currentColor" />
  </svg>
);

const JourneyIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
    <path d="M12 21C12 21 4 14.5 4 9C4 6.24 6.24 4 9 4C10.73 4 12.26 4.87 13.12 6.2C13.12 6.2 12 8.5 12 9C12 10.66 13.34 12 15 12C15.5 12 15.96 11.87 16.36 11.64C16.77 12.43 17 13.21 17 14C17 17.87 12 21 12 21Z"
      fill="currentColor" opacity="0.15" />
    <path d="M12 21C12 21 4 14.5 4 9C4 6.24 6.24 4 9 4C10.73 4 12.26 4.87 13.12 6.2"
      stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
    <path d="M20 9C20 12.87 15 17 15 17C15 17 10 12.87 10 9C10 6.79 12.24 5 15 5C17.76 5 20 6.79 20 9Z"
      stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="15" cy="9" r="1.5" fill="currentColor" />
  </svg>
);

const AICenterIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
    <path d="M12 3L13.6 8.4L19 10L13.6 11.6L12 17L10.4 11.6L5 10L10.4 8.4L12 3Z"
      stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" fill="currentColor" fillOpacity="0.12" />
    <circle cx="18.5" cy="17.5" r="2" stroke="currentColor" strokeWidth="1.6" />
    <circle cx="5.5" cy="16.5" r="1.4" stroke="currentColor" strokeWidth="1.5" />
  </svg>
);

const GrowthIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
    <path d="M12 21V11" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
    <path d="M12 13C12 13 12 8 8 6C5.5 4.75 4 5 4 5C4 5 3.9 7 5 9C6.4 11.75 12 13 12 13Z"
      fill="currentColor" opacity="0.15" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
    <path d="M12 11C12 11 12 7 15.5 5.5C18 4.4 20 5 20 5C20 5 19.7 7.5 18 9.5C16.2 11.6 12 11 12 11Z"
      fill="currentColor" opacity="0.12" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
  </svg>
);

const JournalIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
    <rect x="5" y="3.5" width="14" height="17" rx="2.2" stroke="currentColor" strokeWidth="1.8" />
    <path d="M8.5 8H15.5M8.5 11.5H15.5M8.5 15H13" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
  </svg>
);

// Tab sets per lifecycle stage. Phases add the preparing/healing destinations;
// every "to" here points to a route that exists for that stage.
const NAV_BY_STAGE = {
  [STAGE.GROWING]: [
    { to: "/dashboard", label: "Home", Icon: HomeIcon },
    { to: "/moods", label: "Mood", Icon: MoodIcon },
    { to: "/ai-center", label: "AI Center", Icon: AICenterIcon },
    { to: "/journey", label: "Journey", Icon: JourneyIcon },
    { to: "/profile", label: "Profile", Icon: "avatar" },
  ],
  [STAGE.PREPARING]: [
    { to: "/dashboard", label: "Home", Icon: HomeIcon },
    { to: "/growth", label: "Growth", Icon: GrowthIcon },
    { to: "/ai-coach", label: "Coach", Icon: AICenterIcon },
    { to: "/journal", label: "Journal", Icon: JournalIcon },
    { to: "/profile", label: "Profile", Icon: "avatar" },
  ],
  // Healing destinations (/healing, /recovery-coach, /reflect) ship in Phase 2.
  [STAGE.HEALING]: [
    { to: "/dashboard", label: "Home", Icon: HomeIcon },
    { to: "/journal", label: "Journal", Icon: JournalIcon },
    { to: "/ai-coach", label: "Coach", Icon: AICenterIcon },
    { to: "/profile", label: "Profile", Icon: "avatar" },
  ],
};

const BottomNav = () => {
  const { user } = useAuth();
  const { stage } = useStage();
  const photo = user?.profilePhoto;
  const initial = user?.name ? user.name[0].toUpperCase() : "♥";

  const items = NAV_BY_STAGE[stage] || NAV_BY_STAGE[STAGE.GROWING];

  return (
    <nav className="bottom-nav" role="navigation" aria-label="Main navigation">
      {items.map(({ to, label, Icon }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) => `bottom-nav-item${isActive ? " bottom-nav-item--active" : ""}`}
          aria-label={label}
        >
          {Icon === "avatar" ? (
            <span className="bottom-nav-icon bottom-nav-avatar">
              {photo ? (
                <img src={photo} alt={getFirstName(user?.name, "You")} />
              ) : (
                <span className="bottom-nav-avatar__initial">{initial}</span>
              )}
            </span>
          ) : (
            <span className="bottom-nav-icon"><Icon /></span>
          )}
          <span className="bottom-nav-label">{label}</span>
        </NavLink>
      ))}
    </nav>
  );
};

export default BottomNav;
