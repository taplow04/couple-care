import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";

import AuthLayout from "../../../components/auth/AuthLayout/AuthLayout";
import AuthInput from "../../../components/auth/AuthInput/AuthInput";
import AuthButton from "../../../components/auth/AuthButton/AuthButton";
import AuthFooter from "../../../components/auth/AuthFooter/AuthFooter";
import OtpInput from "../../../components/auth/OtpInput/OtpInput";

import { requestOtp, verifyOtp, resendOtp } from "../../../services/auth.service";
import { useAuth } from "../../../context/AuthContext";

import "./Register.css";

const RESEND_SECONDS = 60;

const Register = () => {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [step, setStep] = useState("details"); // "details" | "otp"
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [otp, setOtp] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const timerRef = useRef(null);

  // Resend cooldown countdown
  useEffect(() => {
    if (cooldown <= 0) return;
    timerRef.current = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timerRef.current);
  }, [cooldown]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleRequest = async (e) => {
    e.preventDefault();
    setError("");
    setInfo("");

    if (!form.name || !form.email || !form.password) {
      setError("Please fill all fields");
      return;
    }
    if (form.password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    try {
      setLoading(true);
      await requestOtp({
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
      });
      setStep("otp");
      setOtp("");
      setInfo(`We sent a 6-digit code to ${form.email.trim()}`);
      setCooldown(RESEND_SECONDS);
    } catch (err) {
      setError(err.response?.data?.message || "Could not send the code. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    setError("");

    if (otp.length !== 6) {
      setError("Enter the 6-digit code");
      return;
    }

    try {
      setLoading(true);
      const res = await verifyOtp({ email: form.email.trim(), otp });
      await login(res.data.user, res.data.token);
      // RequireCouple routes solo users to /couple onboarding.
      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.message || "Invalid code. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0) return;
    setError("");
    setInfo("");
    try {
      await resendOtp(form.email.trim());
      setInfo("A new code is on its way.");
      setCooldown(RESEND_SECONDS);
    } catch (err) {
      setError(err.response?.data?.message || "Could not resend the code.");
    }
  };

  const backToDetails = () => {
    setStep("details");
    setError("");
    setInfo("");
    setOtp("");
  };

  if (step === "otp") {
    return (
      <AuthLayout title="Verify your email" subtitle="Enter the code we emailed you">
        <form className="register-form" onSubmit={handleVerify}>
          {error && <div className="register-error">{error}</div>}
          {info && <div className="register-success">{info}</div>}

          <OtpInput value={otp} onChange={setOtp} disabled={loading} />

          <AuthButton loading={loading}>Verify &amp; Continue</AuthButton>

          <div className="register-otp-actions">
            <button
              type="button"
              className="register-link-btn"
              onClick={handleResend}
              disabled={cooldown > 0}
            >
              {cooldown > 0 ? `Resend code in ${cooldown}s` : "Resend code"}
            </button>
            <button
              type="button"
              className="register-link-btn"
              onClick={backToDetails}
            >
              Change email
            </button>
          </div>
        </form>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="CoupleCare" subtitle="Create your relationship space">
      <form className="register-form" onSubmit={handleRequest}>
        {error && <div className="register-error">{error}</div>}
        {info && <div className="register-success">{info}</div>}

        <AuthInput
          label="Full Name"
          name="name"
          type="text"
          placeholder="Enter your name"
          value={form.name}
          onChange={handleChange}
        />

        <AuthInput
          label="Email"
          name="email"
          type="email"
          placeholder="Enter your email"
          value={form.email}
          onChange={handleChange}
        />

        <AuthInput
          label="Password"
          name="password"
          type="password"
          placeholder="Create a password (min 8 characters)"
          value={form.password}
          onChange={handleChange}
        />

        <AuthButton loading={loading}>Send Verification Code</AuthButton>
      </form>

      <AuthFooter text="Already have an account?" linkText="Login" linkTo="/login" />
    </AuthLayout>
  );
};

export default Register;
