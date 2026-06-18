import "./EmptyState.css";

/**
 * Unified empty-state block: a soft gradient icon badge, title, subtitle and an
 * optional call-to-action. Used across Chat, Memories, Notifications, Moods.
 *
 * Props:
 *  - icon      emoji or node shown in the badge
 *  - title     headline
 *  - subtitle  supporting line
 *  - action    optional node (e.g. a <Button>)
 */
const EmptyState = ({ icon = "✨", title, subtitle, action }) => (
  <div className="empty-state cc-anim-slide-up">
    <div className="empty-state__icon" aria-hidden="true">
      {icon}
    </div>
    {title && <p className="empty-state__title">{title}</p>}
    {subtitle && <p className="empty-state__sub">{subtitle}</p>}
    {action && <div className="empty-state__action">{action}</div>}
  </div>
);

export default EmptyState;
