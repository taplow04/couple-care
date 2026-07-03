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

const ExploreIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.9" />
    <path d="M12 3C9.5 5.5 8.5 9 8.5 12C8.5 15 9.5 18.5 12 21C14.5 18.5 15.5 15 15.5 12C15.5 9 14.5 5.5 12 3Z"
      stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" fill="currentColor" fillOpacity="0.12" />
    <path d="M3.5 12H20.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
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

const HealIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
    <path d="M12 20S4 14 4 8.8A4.3 4.3 0 0 1 12 6.5 4.3 4.3 0 0 1 20 8.8C20 14 12 20 12 20Z"
      fill="currentColor" opacity="0.13" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
    <path d="M8.5 11.5H11L12.2 9L13.6 13.5L14.8 11.5H16" stroke="currentColor" strokeWidth="1.7"
      strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// Tab sets per lifecycle stage. Phases add the preparing/healing destinations;
// every "to" here points to a route that exists for that stage.
const NAV_BY_STAGE = {
  [STAGE.GROWING]: [
    { to: "/dashboard", label: "Home", Icon: HomeIcon },
    { to: "/explore", label: "Explore", Icon: ExploreIcon },
    { to: "/ai-center", label: "AI Center", Icon: AICenterIcon },
    { to: "/moods", label: "Mood", Icon: MoodIcon },
    { to: "/profile", label: "Profile", Icon: "avatar" },
  ],
  // Solo stages get Explore too — discovery is universal (single / connected /
  // unmatched all browse the same public feed).
  [STAGE.PREPARING]: [
    { to: "/dashboard", label: "Home", Icon: HomeIcon },
    { to: "/explore", label: "Explore", Icon: ExploreIcon },
    { to: "/growth", label: "Growth", Icon: GrowthIcon },
    { to: "/ai-coach", label: "Coach", Icon: AICenterIcon },
    { to: "/profile", label: "Profile", Icon: "avatar" },
  ],
  [STAGE.HEALING]: [
    { to: "/dashboard", label: "Home", Icon: HomeIcon },
    { to: "/explore", label: "Explore", Icon: ExploreIcon },
    { to: "/growth", label: "Heal", Icon: HealIcon },
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
