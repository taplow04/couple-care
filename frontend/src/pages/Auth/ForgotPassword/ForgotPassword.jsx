import { useState, useEffect, useRef } from "react";

import AuthLayout from "../../../components/auth/AuthLayout/AuthLayout";

import AuthInput from "../../../components/auth/AuthInput/AuthInput";

import AuthButton from "../../../components/auth/AuthButton/AuthButton";

import AuthFooter from "../../../components/auth/AuthFooter/AuthFooter";

import { forgotPassword } from "../../../services/security.service";

import "./ForgotPassword.css";

const RESEND_SECONDS = 60;

const ForgotPassword = () => {
  const [loading, setLoading] = useState(false);

  const [success, setSuccess] = useState("");

  const [error, setError] = useState("");

  const [email, setEmail] = useState("");

  const [cooldown, setCooldown] = useState(0);
  const timerRef = useRef(null);

  useEffect(() => {
    if (cooldown <= 0) return;
    timerRef.current = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timerRef.current);
  }, [cooldown]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError("");
    setSuccess("");

    if (!email) {
      setError("Email is required");

      return;
    }

    if (cooldown > 0) return;

    try {
      setLoading(true);

      await forgotPassword(email.trim());

      // Generic copy on purpose — never reveal whether the email is registered.
      setSuccess(
        "If an account exists for that email, a password reset link is on its way. Check your inbox and spam folder.",
      );
      setCooldown(RESEND_SECONDS);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to send reset email");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Forgot Password"
      subtitle="We'll send a reset link to your email"
    >
      <form className="forgot-form" onSubmit={handleSubmit}>
        {error && <div className="forgot-error">{error}</div>}

        {success && <div className="forgot-success">{success}</div>}

        <AuthInput
          label="Email"
          name="email"
          type="email"
          placeholder="Enter your email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <AuthButton loading={loading} disabled={cooldown > 0}>
          {cooldown > 0 ? `Resend in ${cooldown}s` : "Send Reset Link"}
        </AuthButton>
      </form>

      <AuthFooter
        text="Remember your password?"
        linkText="Login"
        linkTo="/login"
      />
    </AuthLayout>
  );
};

export default ForgotPassword;
