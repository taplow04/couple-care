import { useState } from "react";

import { useNavigate, useSearchParams } from "react-router-dom";

import AuthLayout from "../../../components/auth/AuthLayout/AuthLayout";

import AuthInput from "../../../components/auth/AuthInput/AuthInput";

import AuthButton from "../../../components/auth/AuthButton/AuthButton";

import AuthFooter from "../../../components/auth/AuthFooter/AuthFooter";

import { resetPassword } from "../../../services/security.service";

import "./ResetPassword.css";

const ResetPassword = () => {
  const navigate = useNavigate();

  const [searchParams] = useSearchParams();

  const token = searchParams.get("token");

  const [loading, setLoading] = useState(false);

  const [error, setError] = useState("");

  const [success, setSuccess] = useState("");

  const [form, setForm] = useState({
    password: "",
    confirmPassword: "",
  });

  const handleChange = (e) => {
    setForm({
      ...form,

      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError("");
    setSuccess("");

    if (!token) {
      setError("Invalid reset link");

      return;
    }

    if (form.password.length < 8) {
      setError("Password must be at least 8 characters");

      return;
    }

    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match");

      return;
    }

    try {
      setLoading(true);

      const response = await resetPassword({
        token,

        password: form.password,
      });

      setSuccess(response.message || "Password updated successfully");

      setTimeout(() => {
        navigate("/login");
      }, 2000);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to reset password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout title="Reset Password" subtitle="Create a new password">
      <form className="reset-form" onSubmit={handleSubmit}>
        {error && <div className="reset-error">{error}</div>}

        {success && <div className="reset-success">{success}</div>}

        <AuthInput
          label="New Password"
          name="password"
          type="password"
          placeholder="Enter new password"
          value={form.password}
          onChange={handleChange}
          autoComplete="new-password"
        />

        <AuthInput
          label="Confirm Password"
          name="confirmPassword"
          type="password"
          placeholder="Confirm password"
          value={form.confirmPassword}
          onChange={handleChange}
          autoComplete="new-password"
        />

        <AuthButton loading={loading}>Update Password</AuthButton>
      </form>

      <AuthFooter
        text="Remembered your password?"
        linkText="Login"
        linkTo="/login"
      />
    </AuthLayout>
  );
};

export default ResetPassword;
