import React, { useEffect, useMemo, useState } from "react";
import {
  FiBell,
  FiTrash2,
  FiCheckCircle,
  FiRefreshCw,
  FiAlertCircle,
  FiCheck,
  FiInfo,
} from "react-icons/fi";
import "./WorkerNotifications.css";
import Pagination from "../components/Pagination";
import { alertConfirm, alertError, alertSuccess } from "../utils/sweetAlert";
import axiosClient from "../api/axiosClient";
import { useNotification } from "../context/NotificationContext";

const LAST_SEEN_KEY = "hr_notifications_last_seen";

async function tryCall(calls) {
  // calls: [{ method, url, data }]
  for (const c of calls) {
    try {
      if (c.method === "get") return await axiosClient.get(c.url);
      if (c.method === "post") return await axiosClient.post(c.url, c.data || {});
      if (c.method === "put") return await axiosClient.put(c.url, c.data || {});
      if (c.method === "patch") return await axiosClient.patch(c.url, c.data || {});
      if (c.method === "delete") return await axiosClient.delete(c.url);
    } catch (err) {
      // if endpoint not found, try next
      if (err?.response?.status === 404) continue;
      throw err;
    }
  }
  throw new Error("No matching endpoint");
}

export default function HRNotifications() {
  const notiCtx = useNotification();

  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const setSidebarUnreadZero = () => {
    localStorage.setItem("hr_unread_notifications", "0");
    window.dispatchEvent(new Event("storage"));
  };

  const fetchNotifications = async () => {
    try {
      setLoading(true);

      const lastSeenRaw = localStorage.getItem(LAST_SEEN_KEY);
      const lastSeen = lastSeenRaw ? Number(lastSeenRaw) : 0;

      // support both routes (new + old)
      const res = await tryCall([
        { method: "get", url: "/notifications/my" },
        { method: "get", url: "/notifications" }, // fallback if your backend uses different path
      ]);

      const fetched = res.data.notifications || res.data || [];

      const mapped = fetched.map((n) => {
        const createdMs = new Date(n.createdAt).getTime();
        return { ...n, _isNewSinceLastSeen: createdMs > lastSeen };
      });

      setNotifications(mapped);

      // entering page -> set sidebar to 0 + sync context
      setSidebarUnreadZero();
      try {
        await notiCtx?.refresh?.();
      } catch {
        // ignore
      }

      // update last seen time
      localStorage.setItem(LAST_SEEN_KEY, String(Date.now()));
    } catch (err) {
      console.error("Failed to fetch HR notifications:", err);
      await alertError("Error", err?.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setPage(1);
  }, [notifications.length]);

  const total = notifications.length;
  const startIdx = (page - 1) * pageSize;
  const pagedNotifications = useMemo(
    () => notifications.slice(startIdx, startIdx + pageSize),
    [notifications, startIdx, pageSize]
  );

  const markAsRead = async (id) => {
    try {
      await tryCall([
        { method: "patch", url: `/notifications/${id}/read` },
        { method: "put", url: `/notifications/${id}/read` }, // fallback legacy
      ]);
      setNotifications((prev) =>
        prev.map((n) => (n.notificationId === id ? { ...n, isRead: true } : n))
      );
      try {
        await notiCtx?.refresh?.();
      } catch {
        // ignore
      }
    } catch (err) {
      console.error("Mark read failed:", err);
    }
  };

  const markAllAsRead = async () => {
    try {
      await tryCall([
        { method: "patch", url: "/notifications/read-all" },
        { method: "put", url: "/notifications/mark-all-read" }, // fallback legacy
      ]);
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      await alertSuccess("Done", "All notifications have been marked as read.");
      try {
        await notiCtx?.refresh?.();
      } catch {
        // ignore
      }
    } catch (err) {
      console.error("Mark all read failed:", err);
      await alertError("Error", err?.response?.data?.message || err.message);
    }
  };

  const deleteNoti = async (id) => {
    const ok = await alertConfirm("Confirm Delete", "Delete this notification?", "Delete");
    if (!ok) return;

    try {
      await tryCall([
        { method: "delete", url: `/notifications/${id}` },
      ]);
      setNotifications((prev) => prev.filter((n) => n.notificationId !== id));
      if (pagedNotifications.length === 1 && page > 1) setPage(page - 1);
      try {
        await notiCtx?.refresh?.();
      } catch {
        // ignore
      }
    } catch (err) {
      console.error("Delete failed:", err);
      await alertError("Error", "Unable to delete notification.");
    }
  };

  const handleClearAll = async () => {
    const ok = await alertConfirm("Confirm Clear All", "Delete all notifications?", "Clear All");
    if (!ok) return;

    try {
      const res = await tryCall([
        { method: "delete", url: "/notifications/clear-all" },
      ]);
      const success = res.data?.success ?? true;
      if (success) {
        setNotifications([]);
        setPage(1);
        await alertSuccess("Done", "All notifications cleared.");
        try {
          await notiCtx?.refresh?.();
        } catch {
          // ignore
        }
      }
    } catch (err) {
      console.error("Clear all failed:", err);
      await alertError("Error", "Unable to clear notifications.");
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case "NewRequest":
        return <FiAlertCircle className="noti-ico danger" />;
      case "Approval":
      case "Approved":
        return <FiCheckCircle className="noti-ico ok" />;
      case "Rejection":
      case "Rejected":
        return <FiAlertCircle className="noti-ico danger" />;
      default:
        return <FiInfo className="noti-ico info" />;
    }
  };

  const getStatusClass = (type) => {
    if (type === "NewRequest") return "danger";
    if (type === "Approval" || type === "Approved") return "ok";
    if (type === "Rejection" || type === "Rejected") return "danger";
    return "info";
  };

  const getTitle = (type) => {
    if (type === "NewRequest") return "New Leave Request";
    if (type === "Approval" || type === "Approved") return "Leave Approved";
    if (type === "Rejection" || type === "Rejected") return "Leave Rejected";
    return "Notification";
  };

  return (
    <div className="page-card wn">
      <div className="wn-head">
        <div>
          <h2 className="wn-title">HR Notifications</h2>
          <p className="wn-sub">Leave requests and activity updates (page {page})</p>
        </div>

        <div className="wn-actions">
          <button className="emp-btn emp-btn-outline small" onClick={fetchNotifications} title="Refresh">
            <FiRefreshCw className={loading ? "spin" : ""} />
          </button>

          <button
            className="emp-btn emp-btn-outline small"
            onClick={handleClearAll}
            disabled={notifications.length === 0}
          >
            <FiTrash2 /> Clear All
          </button>

          <button
            className="emp-btn emp-btn-primary small"
            onClick={markAllAsRead}
            disabled={notifications.length === 0}
          >
            <FiCheck /> Mark all read
          </button>
        </div>
      </div>

      <div className="wn-list">
        {loading ? (
          <div className="wn-empty">
            <FiRefreshCw className="spin" size={24} />
            <p>Loading notifications...</p>
          </div>
        ) : pagedNotifications.length === 0 ? (
          <div className="wn-empty">
            <FiBell style={{ opacity: 0.5 }} size={32} />
            <p>No notifications right now.</p>
          </div>
        ) : (
          pagedNotifications.map((n) => (
            <div
              key={n.notificationId}
              className={`wn-item ${getStatusClass(n.notificationType)} ${n.isRead ? "read" : "unread"}`}
              onClick={() => !n.isRead && markAsRead(n.notificationId)}
              role="button"
              tabIndex={0}
            >
              <div className="wn-row">
                <div className="noti-icon-box">{getNotificationIcon(n.notificationType)}</div>

                <div className="wn-body">
                  <div className="wn-item-title">
                    {getTitle(n.notificationType)}
                    {n._isNewSinceLastSeen && <span className="badge-new">NEW</span>}
                  </div>

                  <div className="wn-item-msg">{n.message}</div>

                  <div className="wn-item-time">
                    {new Date(n.createdAt).toLocaleString("en-GB", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                </div>

                <button
                  className="delete-btn-icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteNoti(n.notificationId);
                  }}
                  title="Delete"
                  aria-label="Delete notification"
                >
                  <FiTrash2 size={16} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {!loading && notifications.length > 0 && (
        <div className="wn-footer">
          <Pagination
            total={total}
            page={page}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
          />
        </div>
      )}
    </div>
  );
}
