// frontend/src/pages/LoginPage.jsx
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

  const [form, setForm] = useState({ email: "", password: "", remember: false });
  const [showPw, setShowPw] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const isValid = useMemo(() => {
    return form.email.trim() && form.password.trim();
  }, [form.email, form.password]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((p) => ({ ...p, [name]: type === "checkbox" ? checked : value }));
  };

  const goAfterLogin = (role) => {
    // ถ้ามี from (โดน guard เด้งมา) ให้กลับไปหน้าที่ขอ
    const from = location.state?.from;
    if (from) return navigate(from, { replace: true });

    // ถ้าไม่มี from ให้ไปตาม role
    return navigate(role === "HR" ? "/hr/dashboard" : "/worker/dashboard", { replace: true });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isValid || submitting) return;

    try {
      setSubmitting(true);

      // ✅ ใช้ AuthContext.login (จะจัดการ token/user ให้เอง)
      const { user } = await login(form.email, form.password);

      // ✅ sync unread count (ดึงจาก API ผ่าน context ที่ทำไว้)
      // ไม่พังถ้า provider ยังไม่ถูกครอบ (noti อาจเป็น null)
      try {
        await noti?.refresh?.();
      } catch {
        // ignore
      }

      await alertSuccess("เข้าสู่ระบบสำเร็จ", `ยินดีต้อนรับ ${user?.firstName || "User"}`);

      goAfterLogin(user?.role);
    } catch (err) {
      console.error("Login Error:", err);

      // รองรับรูปแบบ error หลายแบบ
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "เชื่อมต่อ Server ไม่ได้ หรืออีเมล/รหัสผ่านไม่ถูกต้อง";

      await alertError("เข้าสู่ระบบไม่สำเร็จ", msg);
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
            <span className="label">อีเมล</span>
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
              <span className="label">รหัสผ่าน</span>
              <button
                type="button"
                className="link-btn"
                onClick={() => setShowPw((s) => !s)}
              >
                {showPw ? "ซ่อน" : "แสดง"}
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
              <span>จดจำฉัน</span>
            </label>
          </div>

          <button className="primary" type="submit" disabled={!isValid || submitting}>
            {submitting ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
          </button>
        </form>

        <div className="divider" />

        <div className="test-accounts">
          <div className="title">บัญชีทดสอบ:</div>
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
              <span className="label">Pass</span>
              <code>Password123</code>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
