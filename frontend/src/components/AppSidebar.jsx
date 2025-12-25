import React, { useEffect, useMemo, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import "./AppSidebar.css";

import { FiGrid, FiCalendar, FiClipboard, FiBell, FiUser, FiUsers, FiCheckSquare, FiLogOut, FiMenu, FiX, FiSettings } from "react-icons/fi";

const MENUS = {
  Worker: [
    {
      section: "MAIN MENU",
      items: [
        { to: "/worker/dashboard", label: "Dashboard", icon: <FiGrid /> },
        { to: "/worker/attendance", label: "My Attendance", icon: <FiCalendar /> },
        { to: "/worker/calendar", label: "My Calendar", icon: <FiCalendar /> },
        { to: "/worker/leave", label: "My Leaves", icon: <FiClipboard /> },
        { to: "/worker/notifications", label: "Notifications", icon: <FiBell />, badgeKey: "worker_unread_notifications" },
      ],
    },
    { section: "ACCOUNT", items: [{ to: "/worker/profile", label: "Profile", icon: <FiUser /> }] },
  ],
  HR: [
    {
      section: "MAIN MENU",
      items: [
        { to: "/hr/dashboard", label: "Dashboard", icon: <FiGrid /> },
        { to: "/hr/attendance", label: "Employee Attendance", icon: <FiCalendar /> },
        { to: "/hr/notifications", label: "Notifications", icon: <FiBell />, badgeKey: "hr_unread_notifications" },
      ],
    },
    {
      section: "HR MANAGEMENT",
      items: [
        { to: "/hr/leave-approvals", label: "Leave Approvals", icon: <FiCheckSquare /> },
        { to: "/hr/employees", label: "Employees", icon: <FiUsers /> },
        { to: "/hr/leave-settings", label: "Leave Quota Settings", icon: <FiSettings /> },
        { to: "/hr/attendance-policy", label: "Attendance Settings", icon: <FiSettings /> },
      ],
    },
  ],
};

const safeJSON = (v, fallback = {}) => {
  try {
    return JSON.parse(v);
  } catch {
    return fallback;
  }
};

export default function AppSidebar() {
  const navigate = useNavigate();
  const location = useLocation();

  const user = useMemo(() => safeJSON(localStorage.getItem("user") || "{}", {}), []);
  const role = user.role === "HR" ? "HR" : "Worker";
  const sections = MENUS[role];

  const notificationKey = role === "HR" ? "hr_unread_notifications" : "worker_unread_notifications";
  const fullName = `${user.firstName || user.first_name || "User"} ${user.lastName || user.last_name || ""}`.trim();
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
    const t = setInterval(tick, 700);
    window.addEventListener("storage", tick);
    return () => {
      clearInterval(t);
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

  return (
    <>
      <button className="sb-mobile-toggle" type="button" onClick={() => setMobileOpen((v) => !v)} aria-label="Toggle sidebar">
        {mobileOpen ? <FiX /> : <FiMenu />}
      </button>

      {mobileOpen && <div className="sb-overlay" onClick={() => setMobileOpen(false)} />}

      <aside className={`sb ${mobileOpen ? "sb-mobile-open" : ""}`} aria-label="App Sidebar">
        <div className="sb-top">
          <div className="sb-profile">
            <div className="sb-avatar">{initials}</div>

            <div className="sb-profile-info">
              <div className="sb-name">{fullName}</div>
              <div className="sb-role">{role}</div>
            </div>

            <button className="sb-bell" type="button" title="Notifications" onClick={() => navigate(`/${role.toLowerCase()}/notifications`)}>
              <FiBell />
              {unread > 0 && <span className="sb-badge">{unread > 99 ? "99+" : unread}</span>}
            </button>
          </div>
        </div>

        <nav className="sb-nav">
          {sections.map((sec) => (
            <div className="sb-section" key={sec.section}>
              <div className="sb-section-label">{sec.section}</div>

              {sec.items.map((item) => {
                const showBadge = item.badgeKey === notificationKey;
                const badgeCount = showBadge ? unread : 0;

                return (
                  <NavLink key={item.to} to={item.to} className={({ isActive }) => `sb-item ${isActive ? "active" : ""}`}>
                    <span className="sb-item-ico">
                      {item.icon}
                      {badgeCount > 0 && <span className="sb-item-badge">{badgeCount > 99 ? "99+" : badgeCount}</span>}
                    </span>
                    <span className="sb-item-text">{item.label}</span>
                  </NavLink>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="sb-bottom">
          <button className="sb-logout" onClick={logout} type="button">
            <FiLogOut className="sb-logout-ico" />
            <span className="sb-logout-text">Logout</span>
          </button>
        </div>
      </aside>
    </>
  );
}
