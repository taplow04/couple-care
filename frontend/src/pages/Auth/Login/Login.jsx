import { useState } from "react";
import { useNavigate } from "react-router-dom";

import AuthLayout from "../../../components/auth/AuthLayout/AuthLayout";
import AuthInput from "../../../components/auth/AuthInput/AuthInput";
import AuthButton from "../../../components/auth/AuthButton/AuthButton";
import AuthFooter from "../../../components/auth/AuthFooter/AuthFooter";

import { loginUser } from "../../../services/auth.service";

import { useAuth } from "../../../context/AuthContext";

import "./Login.css";

const Login = () => {
  const navigate = useNavigate();

  const { login } = useAuth();

  const [loading, setLoading] = useState(false);

  const [error, setError] = useState("");

  const [form, setForm] = useState({
    email: "",
    password: "",
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

    if (!form.email || !form.password) {
      setError("Please fill all fields");

      return;
    }

    try {
      setLoading(true);

      const response = await loginUser(form);

      await login(response.data.user, response.data.token);

      // RequireCouple guard routes to /couple or /couple/create if not connected
      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="CoupleCare"
      subtitle="Welcome back to your relationship journey"
    >
      <form className="login-form" onSubmit={handleSubmit}>
        {error && <div className="login-error">{error}</div>}

        <AuthInput
          label="Email"
          type="email"
          name="email"
          placeholder="Enter your email"
          value={form.email}
          onChange={handleChange}
        />

        <AuthInput
          label="Password"
          type="password"
          name="password"
          placeholder="Enter your password"
          value={form.password}
          onChange={handleChange}
          autoComplete="current-password"
        />

        <div className="forgot-link">
          <button type="button" onClick={() => navigate("/forgot-password")}>
            Forgot Password?
          </button>
        </div>

        <AuthButton loading={loading}>Login</AuthButton>
      </form>

      <AuthFooter
        text="Don't have an account?"
        linkText="Create Account"
        linkTo="/register"
      />
    </AuthLayout>
  );
};

export default Login;
