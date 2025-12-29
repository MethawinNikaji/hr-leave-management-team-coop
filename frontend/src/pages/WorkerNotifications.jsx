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
import QuickActionModal from "../components/QuickActionModal";

const api = axios.create({ baseURL: "http://localhost:8000" });
const getAuthHeader = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
});

const LAST_SEEN_KEY = "worker_notifications_last_seen";
const SIDEBAR_UNREAD_KEY = "worker_unread_notifications";

export default function WorkerNotifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);

  const setSidebarUnreadZero = () => {
    localStorage.setItem(SIDEBAR_UNREAD_KEY, "0");
    window.dispatchEvent(new Event("storage"));
  };

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const lastSeen = Number(localStorage.getItem(LAST_SEEN_KEY)) || 0;
      const res = await api.get("/api/notifications/my", getAuthHeader());
      const fetched = res.data.notifications || [];

      const mapped = fetched.map((n) => ({
        ...n,
        _isNewSinceLastSeen: new Date(n.createdAt).getTime() > lastSeen,
      }));

      setNotifications(mapped);
      setSidebarUnreadZero();
      localStorage.setItem(LAST_SEEN_KEY, String(Date.now()));
    } catch (err) {
      alertError("Error", "Failed to load notifications.");
    } finally {
      setLoading(false);
    }
  };

  // Handle clicking a notification
  const handleNotiClick = (noti) => {
    if (!noti.isRead) markAsRead(noti.notificationId);

    // ✅ Keep the same guard: only open modal when backend provides relatedRequest
    if (noti.relatedRequestId && noti.relatedRequest) {
      const rr = noti.relatedRequest;

      setSelectedRequest({
        requestId: noti.relatedRequestId,
        employeeName: "Your Request",
        leaveType: rr.leaveType?.typeName || "Unknown",
        startDate: rr.startDate,
        endDate: rr.endDate,
        reason: rr?.reason || "No reason provided.",
        status: rr.status,
        attachmentUrl: rr.attachmentUrl,
        isReadOnly: true, // Always read-only for workers

        // ✅ NEW: for Approved by / Rejected by
        approvedByHR: rr.approvedByHR || null,
        approvalDate: rr.approvalDate || null,
      });

      setIsModalOpen(true);
    }
  };

  useEffect(() => {
    setSidebarUnreadZero();
    fetchNotifications();
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
        prev.map((n) =>
          n.notificationId === id ? { ...n, isRead: true } : n
        )
      );
    } catch (err) {
      console.error(err);
    }
  };

  const markAllAsRead = async () => {
    try {
      await api.put("/api/notifications/mark-all-read", {}, getAuthHeader());
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      await alertSuccess("Success", "All notifications marked as read.");
      setSidebarUnreadZero();
    } catch (err) {
      console.error(err);
    }
  };

  const deleteNoti = async (id) => {
    if (
      !(await alertConfirm(
        "Delete Notification",
        "Are you sure you want to delete this?",
        "Delete"
      ))
    )
      return;

    try {
      await api.delete(`/api/notifications/${id}`, getAuthHeader());
      setNotifications((prev) =>
        prev.filter((n) => n.notificationId !== id)
      );
    } catch (err) {
      alertError("Error", "Failed to delete notification.");
    }
  };

  const handleClearAll = async () => {
    if (!(await alertConfirm("Clear All", "Delete all notifications?", "Clear All")))
      return;

    try {
      await api.delete("/api/notifications/clear-all", getAuthHeader());
      setNotifications([]);
      await alertSuccess("Success", "All notifications cleared.");
      setSidebarUnreadZero();
    } catch (err) {
      alertError("Error", "Failed to clear notifications.");
    }
  };

  const getTitle = (type) => {
    if (type === "NewRequest") return "New Request Submitted";
    if (type === "Approved") return "Leave Request Approved";
    if (type === "Rejected") return "Leave Request Rejected";
    return "System Notification";
  };

  return (
    <div className="page-card wn">
      <div className="wn-head">
        <div>
          <h2 className="wn-title">Notifications</h2>
          <p className="wn-sub">
            Your personal activity and leave updates (Page {page})
          </p>
        </div>

        <div className="wn-actions">
          <button className="emp-btn emp-btn-outline small" onClick={fetchNotifications}>
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
            <p>Loading...</p>
          </div>
        ) : pagedNotifications.length === 0 ? (
          <div className="wn-empty">
            <FiBell style={{ opacity: 0.5 }} size={32} />
            <p>No notifications found.</p>
          </div>
        ) : (
          pagedNotifications.map((n) => (
            <div
              key={n.notificationId}
              className={`wn-item ${
                n.notificationType === "Approved"
                  ? "ok"
                  : n.notificationType === "Rejected"
                  ? "danger"
                  : "info"
              } ${n.isRead ? "read" : "unread"}`}
              onClick={() => handleNotiClick(n)}
            >
              <div className="wn-row">
                <div className="noti-icon-box">
                  {n.notificationType === "Approved" ? (
                    <FiCheckCircle className="noti-ico ok" />
                  ) : n.notificationType === "Rejected" ? (
                    <FiAlertCircle className="noti-ico danger" />
                  ) : (
                    <FiInfo className="noti-ico info" />
                  )}
                </div>

                <div className="wn-body">
                  <div className="wn-item-title">
                    {getTitle(n.notificationType)}{" "}
                    {n._isNewSinceLastSeen && <span className="badge-new">NEW</span>}
                  </div>
                  <div className="wn-item-msg">{n.message}</div>
                  <div className="wn-item-time">
                    {new Date(n.createdAt).toLocaleString("en-GB")}
                  </div>
                </div>

                <button
                  className="delete-btn-icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteNoti(n.notificationId);
                  }}
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

      {/* Leave Detail Modal for Worker */}
      <QuickActionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        requestData={selectedRequest}
      />
    </div>
  );
}
