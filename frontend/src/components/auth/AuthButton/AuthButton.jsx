import "./AuthButton.css";

const AuthButton = ({ children, loading, type = "submit" }) => {
  return (
    <button type={type} className="auth-button" disabled={loading}>
      {loading ? "Please wait..." : children}
    </button>
  );
};

export default AuthButton;
