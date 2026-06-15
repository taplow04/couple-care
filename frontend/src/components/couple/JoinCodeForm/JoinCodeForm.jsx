import { useState } from "react";
import "./JoinCodeForm.css";

const JoinCodeForm = ({ onSubmit, loading, error }) => {
  const [code, setCode] = useState("CC-");

  const handleChange = (e) => {
    let val = e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, "");
    if (!val.startsWith("CC-")) {
      val = "CC-" + val.replace(/^CC-?/, "");
    }
    if (val.length > 9) val = val.slice(0, 9);
    setCode(val);
  };

  const handleKeyDown = (e) => {
    // Prevent deleting the "CC-" prefix
    if (
      (e.key === "Backspace" || e.key === "Delete") &&
      code.length <= 3
    ) {
      e.preventDefault();
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (code.length === 9 && !loading) onSubmit(code);
  };

  const isReady = code.length === 9;

  return (
    <form className="join-code-form" onSubmit={handleSubmit} noValidate>
      <div className="join-code-form__input-wrap">
        <input
          className={`join-code-form__input ${error ? "join-code-form__input--error" : ""}`}
          type="text"
          value={code}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder="CC-XXXXXX"
          maxLength={9}
          autoCapitalize="characters"
          autoCorrect="off"
          spellCheck={false}
          disabled={loading}
          autoFocus
        />
        <span className="join-code-form__counter">{code.length - 3}/6</span>
      </div>

      {error && <p className="join-code-form__error">{error}</p>}

      <button
        type="submit"
        className="join-code-form__btn"
        disabled={!isReady || loading}
      >
        {loading ? (
          <span className="join-code-form__spinner" />
        ) : (
          "Connect with Partner"
        )}
      </button>
    </form>
  );
};

export default JoinCodeForm;
