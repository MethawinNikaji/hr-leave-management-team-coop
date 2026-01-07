import React, { useEffect, useMemo, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import i18n from "../i18n";
import "./AppSidebar.css";

import {
  FiGrid,
  FiCalendar,
  FiClipboard,
  FiBell,
  FiUser,
  FiUsers,
  FiCheckSquare,
  FiLogOut,
  FiMenu,
  FiX,
  FiSettings
} from "react-icons/fi";

const MENUS = {
  Worker: [
    {
      sectionKey: "sidebar.sections.main",
      items: [
        { to: "/worker/dashboard", labelKey: "sidebar.items.dashboard", icon: <FiGrid /> },
        { to: "/worker/attendance", labelKey: "sidebar.items.myAttendance", icon: <FiCalendar /> },
        { to: "/worker/calendar", labelKey: "sidebar.items.myCalendar", icon: <FiCalendar /> },
        { to: "/worker/leave", labelKey: "sidebar.items.myLeaves", icon: <FiClipboard /> },
        { to: "/worker/notifications", labelKey: "sidebar.items.notifications", icon: <FiBell />, badgeKey: "worker_unread_notifications" }
      ]
    },
    { sectionKey: "sidebar.sections.account", items: [{ to: "/worker/profile", labelKey: "sidebar.items.profile", icon: <FiUser /> }] }
  ],
  HR: [
    {
      sectionKey: "sidebar.sections.main",
      items: [
        { to: "/hr/dashboard", labelKey: "sidebar.items.dashboard", icon: <FiGrid /> },
        { to: "/hr/attendance", labelKey: "sidebar.items.employeeAttendance", icon: <FiCalendar /> },
        { to: "/hr/notifications", labelKey: "sidebar.items.notifications", icon: <FiBell />, badgeKey: "hr_unread_notifications" }
      ]
    },
    {
      sectionKey: "sidebar.sections.hrManagement",
      items: [
        { to: "/hr/profile-requests", labelKey: "sidebar.items.profileRequests", icon: <FiUser />, badgeKey: "profile_request_unread" },
        { to: "/hr/leave-approvals", labelKey: "sidebar.items.leaveApprovals", icon: <FiCheckSquare /> },
        { to: "/hr/employees", labelKey: "sidebar.items.employees", icon: <FiUsers /> },
        { to: "/hr/leave-settings", labelKey: "sidebar.items.leaveQuotaSettings", icon: <FiSettings /> },
        { to: "/hr/attendance-policy", labelKey: "sidebar.items.attendanceSettings", icon: <FiSettings /> }
      ]
    }
  ]
};

const safeJSON = (v, fallback = {}) => {
  try {
    return JSON.parse(v);
  } catch {
    return fallback;
  }
};

export default function AppSidebar() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();

  const user = useMemo(() => safeJSON(localStorage.getItem("user") || "{}", {}), []);
  const role = user.role === "HR" ? "HR" : "Worker";
  const sections = MENUS[role] || [];

  const notificationKey = role === "HR" ? "hr_unread_notifications" : "worker_unread_notifications";
  const fullName = `${user.firstName || user.first_name || t("common.user")} ${user.lastName || user.last_name || ""}`.trim();
  const initials = (fullName || "U").charAt(0).toUpperCase();

  // Mobile drawer
  const [mobileOpen, setMobileOpen] = useState(false);

  // unread badge
  const [unread, setUnread] = useState(() => Number(localStorage.getItem(notificationKey) || "0") || 0);
  useEffect(() => {
    const tick = () => {
      const n = Number(localStorage.getItem(notificationKey) || "0");
      setUnread(Number.isFinite(n) ? n : 0);
    };
    const tmr = setInterval(tick, 700);
    window.addEventListener("storage", tick);
    return () => {
      clearInterval(tmr);
      window.removeEventListener("storage", tick);
    };
  }, [notificationKey]);

  // close mobile drawer on route change
  useEffect(() => {
    if (mobileOpen) setMobileOpen(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  const currentLang = (i18n.language || "en").startsWith("th") ? "th" : "en";
  const toggleLang = () => {
    i18n.changeLanguage(currentLang === "en" ? "th" : "en");
  };

  return (
    <>
      <button
        className="sb-mobile-toggle"
        type="button"
        onClick={() => setMobileOpen((v) => !v)}
        aria-label={t("sidebar.toggleSidebar")}
        title={t("sidebar.toggleSidebar")}
      >
        {mobileOpen ? <FiX /> : <FiMenu />}
      </button>

      {mobileOpen && <div className="sb-overlay" onClick={() => setMobileOpen(false)} />}

      <aside className={`sb ${mobileOpen ? "sb-mobile-open" : ""}`} aria-label={t("sidebar.toggleSidebar")}>
        <div className="sb-top">
          <div className="sb-profile">
            <div className="sb-avatar">{initials}</div>

            <div className="sb-profile-info">
              <div className="sb-name">{fullName}</div>
              <div className="sb-role">{t(`common.role.${role}`)}</div>
            </div>

            <button
              className="sb-bell"
              type="button"
              title={t("common.notifications")}
              onClick={() => navigate(`/${role.toLowerCase()}/notifications`)}
            >
              <FiBell />
              {unread > 0 && <span className="sb-badge">{unread > 99 ? "99+" : unread}</span>}
            </button>
          </div>

          {/* simple language toggle (theme-safe, no new CSS needed) */}
          <div style={{ padding: "0 14px 12px", display: "flex", gap: 10, alignItems: "center" }}>
            <div style={{ fontSize: 11, opacity: 0.75 }}>{t("common.language")}</div>
            <button
              type="button"
              onClick={toggleLang}
              className="sb-logout"
              style={{
                marginLeft: "auto",
                padding: "6px 10px",
                borderRadius: 999,
                fontSize: 12,
                width: "auto"
              }}
              title={`${t("common.language")}: ${currentLang === "en" ? t("common.english") : t("common.thai")}`}
            >
              {currentLang === "en" ? "EN" : "TH"}
            </button>
          </div>
        </div>

        <nav className="sb-nav">
          {sections.map((sec) => (
            <div className="sb-section" key={sec.sectionKey}>
              <div className="sb-section-label">{t(sec.sectionKey)}</div>

              {sec.items.map((item) => {
                const showBadge = item.badgeKey === notificationKey;
                const badgeCount = showBadge ? unread : 0;

                return (
                  <NavLink key={item.to} to={item.to} className={({ isActive }) => `sb-item ${isActive ? "active" : ""}`}>
                    <span className="sb-item-ico">
                      {item.icon}
                      {badgeCount > 0 && <span className="sb-item-badge">{badgeCount > 99 ? "99+" : badgeCount}</span>}
                    </span>
                    <span className="sb-item-text">{t(item.labelKey)}</span>
                  </NavLink>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="sb-bottom">
          <button className="sb-logout" onClick={logout} type="button">
            <FiLogOut className="sb-logout-ico" />
            <span className="sb-logout-text">{t("common.logout")}</span>
          </button>
        </div>
      </aside>
    </>
  );
}