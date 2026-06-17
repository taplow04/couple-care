import { useRef } from "react";
import "./OtpInput.css";

// Controlled 6-digit OTP input. `value` is the full string; `onChange` receives
// the updated string. Handles paste, backspace, and arrow navigation.
const OtpInput = ({ value = "", onChange, length = 6, disabled = false }) => {
  const refs = useRef([]);

  const digits = value.split("").slice(0, length);
  while (digits.length < length) digits.push("");

  const setDigit = (i, d) => {
    const next = digits.slice();
    next[i] = d;
    onChange(next.join(""));
  };

  const handleChange = (i, e) => {
    const raw = e.target.value.replace(/\D/g, "");
    if (!raw) {
      setDigit(i, "");
      return;
    }
    // If multiple chars (e.g. fast typing), distribute across boxes.
    const chars = raw.split("");
    const next = digits.slice();
    let idx = i;
    for (const c of chars) {
      if (idx >= length) break;
      next[idx] = c;
      idx++;
    }
    onChange(next.join(""));
    const focusIdx = Math.min(idx, length - 1);
    refs.current[focusIdx]?.focus();
  };

  const handleKeyDown = (i, e) => {
    if (e.key === "Backspace") {
      if (digits[i]) {
        setDigit(i, "");
      } else if (i > 0) {
        refs.current[i - 1]?.focus();
        setDigit(i - 1, "");
      }
    } else if (e.key === "ArrowLeft" && i > 0) {
      refs.current[i - 1]?.focus();
    } else if (e.key === "ArrowRight" && i < length - 1) {
      refs.current[i + 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = (e.clipboardData.getData("text") || "")
      .replace(/\D/g, "")
      .slice(0, length);
    if (pasted) {
      onChange(pasted.padEnd(length, "").slice(0, length).replace(/\s/g, ""));
      const focusIdx = Math.min(pasted.length, length - 1);
      refs.current[focusIdx]?.focus();
    }
  };

  return (
    <div className="otp-input" onPaste={handlePaste}>
      {digits.map((d, i) => (
        <input
          key={i}
          ref={(el) => (refs.current[i] = el)}
          className="otp-input__box"
          type="text"
          inputMode="numeric"
          autoComplete={i === 0 ? "one-time-code" : "off"}
          maxLength={1}
          value={d}
          disabled={disabled}
          onChange={(e) => handleChange(i, e)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          aria-label={`Digit ${i + 1}`}
        />
      ))}
    </div>
  );
};

export default OtpInput;
