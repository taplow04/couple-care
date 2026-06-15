import { useState } from "react";

import AuthLayout from "../../../components/auth/AuthLayout/AuthLayout";

import AuthInput from "../../../components/auth/AuthInput/AuthInput";

import AuthButton from "../../../components/auth/AuthButton/AuthButton";

import AuthFooter from "../../../components/auth/AuthFooter/AuthFooter";

import { forgotPassword } from "../../../services/security.service";

import "./ForgotPassword.css";

const ForgotPassword = () => {
  const [loading, setLoading] = useState(false);

  const [success, setSuccess] = useState("");

  const [error, setError] = useState("");

  const [email, setEmail] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError("");
    setSuccess("");

    if (!email) {
      setError("Email is required");

      return;
    }

    try {
      setLoading(true);

      const response = await forgotPassword(email);

      setSuccess(response.message || "Password reset email sent");
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

        <AuthButton loading={loading}>Send Reset Link</AuthButton>
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
