import React, { useEffect } from "react";
import { Outlet } from "react-router-dom";
import AppSidebar from "../components/AppSidebar";
import "./AppLayout.css";
import { useTranslation } from "react-i18next";

// สร้าง WS URL จาก VITE_API_URL (เช่น http://localhost:8000/api -> ws://localhost:8000)
const buildWsUrl = () => {
  const api = (import.meta.env.VITE_API_URL || "http://localhost:8000/api").replace(/\/$/, "");
  const httpBase = api.replace(/\/api$/, "");
  const isHttps = httpBase.startsWith("https://");
  const wsBase = httpBase.replace(/^https?:\/\//, isHttps ? "wss://" : "ws://");
  return `${wsBase}/ws/notifications`;
};

export default function AppLayout() {
  const { t } = useTranslation();
  // ดึงข้อมูล User เพื่อเช็ค Role (ใช้ localStorage เพื่อให้ sidebar ใช้ค่าเดียวกัน)
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const role = user.role === "HR" ? "HR" : "Worker";
  const notificationKey = role === "HR" ? "hr_unread_notifications" : "worker_unread_notifications";
  const token = localStorage.getItem("token");

  useEffect(() => {
    if (!token || !user.employeeId) return;

    let isMounted = true;
    let socket = null;

    const connectWS = () => {
      socket = new WebSocket(buildWsUrl());

      socket.onopen = () => {
        if (isMounted && socket.readyState === WebSocket.OPEN) {
          socket.send(JSON.stringify({ type: "REGISTER", employeeId: user.employeeId }));
        }
      };

      socket.onmessage = (event) => {
        if (!isMounted) return;
        try {
          const message = JSON.parse(event.data);
          if (message.type === "NOTIFICATION") {
            const current = parseInt(localStorage.getItem(notificationKey) || "0", 10);
            localStorage.setItem(notificationKey, String((Number.isFinite(current) ? current : 0) + 1));
            window.dispatchEvent(new Event("storage"));
          }
        } catch (err) {
          console.error("WS Parse Error:", err);
        }
      };

      socket.onclose = () => {
        // ปล่อยเงียบไว้ (จะต่อยอดทำ reconnect ก็ได้)
      };
    };

    connectWS();

    return () => {
      isMounted = false;
      if (socket && socket.readyState === WebSocket.OPEN) socket.close();
    };
  }, [token, user.employeeId, notificationKey]);

  return (
    <div className="app-layout">
      <AppSidebar />
      <main className="app-main">
        <Outlet />
      </main>
    </div>
  );
}