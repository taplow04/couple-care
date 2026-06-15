import { Link } from "react-router-dom";

import "./AuthFooter.css";

const AuthFooter = ({ text, linkText, linkTo }) => {
  return (
    <div className="auth-footer">
      <span>{text}</span>

      <Link to={linkTo}>{linkText}</Link>
    </div>
  );
};

export default AuthFooter;
