import "./SettingsSection.css";

const SettingsSection = ({ title, description, children }) => (
  <section className="settings-section">
    <div className="settings-section__header">
      <h3 className="settings-section__title">{title}</h3>
      {description && (
        <p className="settings-section__desc">{description}</p>
      )}
    </div>
    <div className="settings-section__body">{children}</div>
  </section>
);

export default SettingsSection;
