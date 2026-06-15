import { useState } from "react";
import { useNavigate } from "react-router-dom";

import AuthLayout from "../../../components/auth/AuthLayout/AuthLayout";
import AuthInput from "../../../components/auth/AuthInput/AuthInput";
import AuthButton from "../../../components/auth/AuthButton/AuthButton";
import AuthFooter from "../../../components/auth/AuthFooter/AuthFooter";

import { registerUser } from "../../../services/auth.service";

import "./Register.css";

const Register = () => {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);

  const [error, setError] = useState("");

  const [success, setSuccess] = useState("");

  const [form, setForm] = useState({
    name: "",
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
    setSuccess("");

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

      await registerUser(form);

      setSuccess("Account created successfully");

      setTimeout(() => {
        navigate("/login");
      }, 1500);
    } catch (err) {
      setError(err.response?.data?.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout title="CoupleCare" subtitle="Create your relationship space">
      <form className="register-form" onSubmit={handleSubmit}>
        {error && <div className="register-error">{error}</div>}

        {success && <div className="register-success">{success}</div>}

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
          placeholder="Create a password"
          value={form.password}
          onChange={handleChange}
        />

        <AuthButton loading={loading}>Create Account</AuthButton>
      </form>

      <AuthFooter
        text="Already have an account?"
        linkText="Login"
        linkTo="/login"
      />
    </AuthLayout>
  );
};

export default Register;
