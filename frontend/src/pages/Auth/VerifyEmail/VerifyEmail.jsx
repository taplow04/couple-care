import { useEffect, useState } from "react";

import { useSearchParams, useNavigate } from "react-router-dom";

import AuthLayout from "../../../components/auth/AuthLayout/AuthLayout";

import AuthButton from "../../../components/auth/AuthButton/AuthButton";

import {
  verifyEmail,
  sendVerification,
} from "../../../services/security.service";

import "./VerifyEmail.css";

const VerifyEmail = () => {
  const navigate = useNavigate();

  const [searchParams] = useSearchParams();

  const token = searchParams.get("token");

  const [loading, setLoading] = useState(true);

  const [success, setSuccess] = useState(false);

  const [error, setError] = useState("");

  const [resending, setResending] = useState(false);

  useEffect(() => {
    verifyUser();
  }, []);

  const verifyUser = async () => {
    if (!token) {
      setError("Invalid verification link");

      setLoading(false);

      return;
    }

    try {
      await verifyEmail(token);

      setSuccess(true);
    } catch (err) {
      setError(err.response?.data?.message || "Verification failed");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    try {
      setResending(true);

      await sendVerification();

      alert("Verification email sent");
    } catch (err) {
      alert(err.response?.data?.message || "Failed to send email");
    } finally {
      setResending(false);
    }
  };

  if (loading) {
    return (
      <AuthLayout title="Verifying" subtitle="Please wait...">
        <div className="verify-loading">Verifying your email...</div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Email Verification" subtitle="Account Security">
      <div className="verify-content">
        {success ? (
          <>
            <div className="verify-success">✅ Email verified successfully</div>

            <AuthButton type="button" loading={false}>
              Go To Login
            </AuthButton>

            <button className="verify-link" onClick={() => navigate("/login")}>
              Login
            </button>
          </>
        ) : (
          <>
            <div className="verify-error">{error}</div>

            <AuthButton type="button" loading={resending}>
              Resend Verification
            </AuthButton>

            <button className="verify-link" onClick={handleResend}>
              Resend Email
            </button>
          </>
        )}
      </div>
    </AuthLayout>
  );
};

export default VerifyEmail;
