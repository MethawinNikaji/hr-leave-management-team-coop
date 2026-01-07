import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { getMyNotifications } from "../api/notificationService";
import { useAuth } from "./AuthContext";
import { useTranslation } from "react-i18next";

const NotificationContext = createContext(null);

export function NotificationProvider({ children }) {
  const { t } = useTranslation();

  const { isReady, isAuthenticated, user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  const getKey = () => {
    const role = user?.role === "HR" ? "HR" : "Worker";
    return role === "HR" ? "hr_unread_notifications" : "worker_unread_notifications";
  };

  const syncToLocalStorage = (count) => {
    const key = getKey();
    try {
      localStorage.setItem(key, String(count));
      // ให้ AppSidebar ที่ฟัง storage event อัปเดตทันที
      window.dispatchEvent(new Event("storage"));
    } catch {
      // ignore
    }
  };

  const refresh = async () => {
    try {
      const res = await getMyNotifications();
      const list = res.data?.notifications || res.data || [];
      const unread = list.filter((n) => !n.isRead).length;
      setUnreadCount(unread);
      syncToLocalStorage(unread);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    if (!isReady) return;

    if (!isAuthenticated) {
      setUnreadCount(0);
      // reset key count
      try {
        localStorage.setItem("hr_unread_notifications", "0");
        localStorage.setItem("worker_unread_notifications", "0");
        window.dispatchEvent(new Event("storage"));
      } catch {
        // ignore
      }
      return;
    }

    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isReady, isAuthenticated, user?.role]);

  const value = useMemo(() => ({ unreadCount, setUnreadCount, refresh }), [unreadCount]);

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
}

export const useNotification = () => useContext(NotificationContext);