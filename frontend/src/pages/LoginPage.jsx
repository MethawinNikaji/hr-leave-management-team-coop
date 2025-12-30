import { useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "./LoginPage.css";
import { alertError, alertSuccess } from "../utils/sweetAlert";
import { useAuth } from "../context/AuthContext";
import { useNotification } from "../context/NotificationContext";

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const { login } = useAuth();
  const noti = useNotification();

  const [form, setForm] = useState({
    email: "",
    password: "",
    remember: false,
  });
  const [showPw, setShowPw] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const isValid = useMemo(() => {
    return form.email.trim() && form.password.trim();
  }, [form.email, form.password]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((p) => ({
      ...p,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const goAfterLogin = (role) => {
    // If redirected by auth guard, go back to requested page
    const from = location.state?.from;
    if (from) return navigate(from, { replace: true });

    // Otherwise route by role
    return navigate(
      role === "HR" ? "/hr/dashboard" : "/worker/dashboard",
      { replace: true }
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isValid || submitting) return;

    try {
      setSubmitting(true);

      // ✅ Use AuthContext.login (handles token & user)
      const { user } = await login(form.email, form.password);

      // ✅ Sync unread notifications count
      try {
        await noti?.refresh?.();
      } catch {
        // ignore if provider not mounted
      }

      await alertSuccess(
        "Login successful",
        `Welcome back ${user?.firstName || "User"}`
      );

      goAfterLogin(user?.role);
    } catch (err) {
      console.error("Login Error:", err);

      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Unable to connect to server or invalid email/password.";

      await alertError("Login failed", msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-header">
          <div className="brand">
            <span className="brand-title">Login</span>
          </div>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label className="field">
            <span className="label">Email</span>
            <input
              className="input"
              type="email"
              name="email"
              placeholder="you@example.com"
              value={form.email}
              onChange={handleChange}
              autoComplete="email"
            />
          </label>

          <label className="field">
            <div className="label-row">
              <span className="label">Password</span>
              <button
                type="button"
                className="link-btn"
                onClick={() => setShowPw((s) => !s)}
              >
                {showPw ? "Hide" : "Show"}
              </button>
            </div>

            <input
              className="input"
              type={showPw ? "text" : "password"}
              name="password"
              placeholder="••••••••"
              value={form.password}
              onChange={handleChange}
              autoComplete="current-password"
            />
          </label>

          <div className="row">
            <label className="checkbox">
              <input
                type="checkbox"
                name="remember"
                checked={form.remember}
                onChange={handleChange}
              />
              <span>Remember me</span>
            </label>
          </div>

          <button
            className="primary"
            type="submit"
            disabled={!isValid || submitting}
          >
            {submitting ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <div className="divider" />

        <div className="test-accounts">
          <div className="title">Test Accounts</div>
          <div className="list">
            <div className="row">
              <span className="label">HR</span>
              <code>hr.manager@company.com</code>
            </div>
            <div className="row">
              <span className="label">Worker</span>
              <code>worker.a@company.com</code>
            </div>
            <div className="row">
              <span className="label">Password</span>
              <code>Password123</code>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
