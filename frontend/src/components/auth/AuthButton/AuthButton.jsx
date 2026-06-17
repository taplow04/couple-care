import "./AuthButton.css";

const AuthButton = ({ children, loading, disabled, type = "submit" }) => {
  return (
    <button
      type={type}
      className="auth-button"
      disabled={loading || disabled}
    >
      {loading ? "Please wait..." : children}
    </button>
  );
};

export default AuthButton;
