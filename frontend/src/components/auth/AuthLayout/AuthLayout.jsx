import "./AuthLayout.css";

const AuthLayout = ({ title, subtitle, children }) => {
  return (
    <div className="auth">
      <div className="auth__overlay"></div>

      <div className="auth__container">
        <div className="auth__branding">
          <div className="auth__logo">❤️</div>

          <h1>{title}</h1>

          <p>{subtitle}</p>
        </div>

        <div className="auth__card">{children}</div>
      </div>
    </div>
  );
};

export default AuthLayout;
