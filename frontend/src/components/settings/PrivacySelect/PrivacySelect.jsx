import "./PrivacySelect.css";

const OPTIONS = [
  { value: "private", label: "Private" },
  { value: "partner_only", label: "Partner" },
  { value: "shared", label: "Shared" },
];

/**
 * Three-way visibility control (Private / Partner / Shared) as a segmented
 * button group. Used for the granular privacy settings.
 */
const PrivacySelect = ({ label, description, icon, value, onChange }) => {
  return (
    <div className="privacy-select">
      <div className="privacy-select__top">
        <div className="privacy-select__icon-wrap" aria-hidden="true">
          {icon && <span className="privacy-select__icon">{icon}</span>}
        </div>
        <div className="privacy-select__body">
          <p className="privacy-select__label">{label}</p>
          {description && <p className="privacy-select__desc">{description}</p>}
        </div>
      </div>

      <div className="privacy-select__seg" role="group" aria-label={label}>
        {OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            className={`privacy-select__opt ${
              value === opt.value ? "privacy-select__opt--active" : ""
            }`}
            onClick={() => onChange(opt.value)}
            aria-pressed={value === opt.value}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
};

export default PrivacySelect;
