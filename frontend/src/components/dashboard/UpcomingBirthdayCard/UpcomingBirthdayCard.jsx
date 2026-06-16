import "./UpcomingBirthdayCard.css";

const daysUntilBirthday = (birthday) => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const b = new Date(birthday);
  if (isNaN(b.getTime())) return null;
  let next = new Date(today.getFullYear(), b.getMonth(), b.getDate());
  if (next < today) next = new Date(today.getFullYear() + 1, b.getMonth(), b.getDate());
  return Math.round((next - today) / (1000 * 60 * 60 * 24));
};

/**
 * Shows the partner's upcoming birthday when it's within 30 days. Renders
 * nothing otherwise (no birthday set / too far away).
 */
const UpcomingBirthdayCard = ({ partner }) => {
  if (!partner?.birthday) return null;

  const days = daysUntilBirthday(partner.birthday);
  if (days === null || days > 30) return null;

  const first = partner.name?.split(" ")[0] || "Your partner";

  let label;
  if (days === 0) label = `🎉 It's ${first}'s birthday today!`;
  else if (days === 1) label = `🎂 ${first}'s birthday is tomorrow!`;
  else label = `🎂 ${first}'s birthday in ${days} days`;

  return (
    <div className="ubc">
      <div className="ubc__icon">🎈</div>
      <div className="ubc__text">
        <p className="ubc__title">{label}</p>
        <p className="ubc__sub">
          {days === 0 ? "Make it unforgettable 💖" : "Start planning something special 💝"}
        </p>
      </div>
    </div>
  );
};

export default UpcomingBirthdayCard;
