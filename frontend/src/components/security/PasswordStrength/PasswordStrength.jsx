import { evaluatePassword } from "../../../utils/passwordStrength";
import "./PasswordStrength.css";

// Strength meter: 4 segmented bars + a label + the live checklist of rules.
const PasswordStrength = ({ password = "" }) => {
  const { score, label, rules } = evaluatePassword(password);

  if (!password) return null;

  return (
    <div className="pw-strength" data-score={score}>
      <div className="pw-strength__bars" aria-hidden="true">
        {[0, 1, 2, 3].map((i) => (
          <span
            key={i}
            className={`pw-strength__bar ${i < score ? "is-on" : ""}`}
          />
        ))}
      </div>

      <div className="pw-strength__label">{label}</div>

      <ul className="pw-strength__rules">
        {rules.map((r) => (
          <li
            key={r.key}
            className={`pw-strength__rule ${r.ok ? "is-ok" : ""}`}
          >
            <span className="pw-strength__tick" aria-hidden="true">
              {r.ok ? "✓" : "○"}
            </span>
            {r.label}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default PasswordStrength;
