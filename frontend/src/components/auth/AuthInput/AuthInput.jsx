import PasswordInput from "../../common/PasswordInput/PasswordInput";
import "./AuthInput.css";

const AuthInput = ({
  label,
  name,
  type = "text",
  value,
  onChange,
  placeholder,
  autoComplete,
}) => {
  const isPassword = type === "password";

  return (
    <div className="auth-input-group">
      <label htmlFor={name}>{label}</label>

      {isPassword ? (
        // Password fields get the shared in-field show/hide eye toggle. The
        // inner <input> inherits `.auth-input-group input` styling so it matches
        // the other auth fields exactly.
        <PasswordInput
          id={name}
          name={name}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          autoComplete={autoComplete}
        />
      ) : (
        <input
          id={name}
          name={name}
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          autoComplete={autoComplete}
        />
      )}
    </div>
  );
};

export default AuthInput;
