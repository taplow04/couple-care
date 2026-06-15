import "./SettingToggle.css";

let idCounter = 0;

const SettingToggle = ({ label, description, checked, onChange, icon }) => {
  const id = `setting-toggle-${++idCounter}`;

  return (
    <div className="setting-toggle">
      <div className="setting-toggle__icon-wrap" aria-hidden="true">
        {icon && <span className="setting-toggle__icon">{icon}</span>}
      </div>

      <div className="setting-toggle__body">
        <label className="setting-toggle__label" htmlFor={id}>
          {label}
        </label>
        {description && (
          <p className="setting-toggle__desc">{description}</p>
        )}
      </div>

      <label className="setting-toggle__switch" aria-label={label}>
        <input
          type="checkbox"
          id={id}
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="setting-toggle__input"
        />
        <span className="setting-toggle__slider" />
      </label>
    </div>
  );
};

export default SettingToggle;
