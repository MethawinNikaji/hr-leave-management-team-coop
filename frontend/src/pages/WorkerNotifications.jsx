import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
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

const api = axios.create({ baseURL: "http://localhost:8000" });
const getAuthHeader = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
});

// ✅ แยก key ของ Worker
const LAST_SEEN_KEY = "worker_notifications_last_seen";
const SIDEBAR_UNREAD_KEY = "worker_unread_notifications";
const stripIdFromMessage = (msg = "") =>
  String(msg).replace(/\s*\(ID:\s*\d+\)\s*/gi, " ").replace(/\s{2,}/g, " ").trim();


export default function WorkerNotifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const setSidebarUnreadZero = () => {
    localStorage.setItem(SIDEBAR_UNREAD_KEY, "0");
    // ให้ sidebar ที่ฟัง storage รีเฟรชทันที
    window.dispatchEvent(new Event("storage"));
  };

  const fetchNotifications = async () => {
    try {
      setLoading(true);

      const lastSeenRaw = localStorage.getItem(LAST_SEEN_KEY);
      const lastSeen = lastSeenRaw ? Number(lastSeenRaw) : 0;

      // ✅ endpoint เหมือน HR
      const res = await api.get("/api/notifications/my", getAuthHeader());
      const fetched = res.data.notifications || [];

      const mapped = fetched.map((n) => {
        const createdMs = new Date(n.createdAt).getTime();
        return { ...n, _isNewSinceLastSeen: createdMs > lastSeen };
      });

      setNotifications(mapped);

      // ✅ เข้าหน้าแล้วเลขที่ sidebar หายทันที
      setSidebarUnreadZero();

      // ✅ บันทึก lastSeen เพื่อให้ NEW แสดงแค่ครั้งแรก
      localStorage.setItem(LAST_SEEN_KEY, String(Date.now()));
    } catch (err) {
      console.error("Failed to fetch Worker notifications:", err);
      await alertError("เกิดข้อผิดพลาด", "โหลดการแจ้งเตือนไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // ✅ เคลียร์เลขทันทีตั้งแต่ mount (กันกรณี fetch ช้า)
    setSidebarUnreadZero();
    fetchNotifications();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const total = notifications.length;
  const startIdx = (page - 1) * pageSize;
  const pagedNotifications = useMemo(
    () => notifications.slice(startIdx, startIdx + pageSize),
    [notifications, startIdx, pageSize]
  );

  const markAsRead = async (id) => {
    try {
      await api.put(`/api/notifications/${id}/read`, {}, getAuthHeader());
      setNotifications((prev) =>
        prev.map((n) => (n.notificationId === id ? { ...n, isRead: true } : n))
      );
    } catch (err) {
      console.error("Mark read failed:", err);
    }
  };

  const markAllAsRead = async () => {
    try {
      await api.put("/api/notifications/mark-all-read", {}, getAuthHeader());
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      await alertSuccess("สำเร็จ", "อ่านการแจ้งเตือนทั้งหมดเรียบร้อยแล้ว");

      // ✅ กันเลขเด้งกลับ
      setSidebarUnreadZero();
    } catch (err) {
      console.error("Mark all read failed:", err);
    }
  };

  const deleteNoti = async (id) => {
    if (!(await alertConfirm("ยืนยันการลบ", "คุณต้องการลบการแจ้งเตือนนี้ใช่หรือไม่?", "ลบ")))
      return;

    try {
      await api.delete(`/api/notifications/${id}`, getAuthHeader());
      setNotifications((prev) => prev.filter((n) => n.notificationId !== id));
      if (pagedNotifications.length === 1 && page > 1) setPage(page - 1);
    } catch (err) {
      console.error("Delete failed:", err);
      await alertError("ไม่สามารถลบได้", "ไม่สามารถลบการแจ้งเตือนได้");
    }
  };

  const handleClearAll = async () => {
    if (
      !(await alertConfirm(
        "ยืนยันการลบทั้งหมด",
        "คุณต้องการลบการแจ้งเตือนทั้งหมดใช่หรือไม่?",
        "ลบทั้งหมด"
      ))
    )
      return;

    try {
      const res = await api.delete("/api/notifications/clear-all", getAuthHeader());
      if (res.data.success) {
        setNotifications([]);
        setPage(1);
        await alertSuccess("สำเร็จ", "ล้างการแจ้งเตือนทั้งหมดเรียบร้อยแล้ว");
        setSidebarUnreadZero();
      }
    } catch (err) {
      console.error("Clear all failed:", err);
      await alertError("เกิดข้อผิดพลาด", "เกิดข้อผิดพลาดในการล้างข้อมูล");
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case "NewRequest":
        return <FiAlertCircle className="noti-ico danger" />;
      case "Approved":
        return <FiCheckCircle className="noti-ico ok" />;
      default:
        return <FiInfo className="noti-ico info" />;
    }
  };

  const getStatusClass = (type) => {
    if (type === "NewRequest") return "danger";
    if (type === "Approved") return "ok";
    return "info";
  };

  const getTitle = (type) => {
    if (type === "NewRequest") return "คำขอลาใหม่";
    if (type === "Approved") return "คำขอลาอนุมัติแล้ว";
    return "ระบบแจ้งเตือน";
  };

  return (
    <div className="page-card wn">
      <div className="wn-head">
        <div>
          <h2 className="wn-title">Worker Notifications</h2>
          <p className="wn-sub">รายการแจ้งเตือนของคุณ (หน้า {page})</p>
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
            <p>กำลังโหลดข้อมูลแจ้งเตือน...</p>
          </div>
        ) : pagedNotifications.length === 0 ? (
          <div className="wn-empty">
            <FiBell style={{ opacity: 0.5 }} size={32} />
            <p>ไม่มีการแจ้งเตือนสำหรับคุณในขณะนี้</p>
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

                  <div className="wn-item-msg">{stripIdFromMessage(n.message)}</div>


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
