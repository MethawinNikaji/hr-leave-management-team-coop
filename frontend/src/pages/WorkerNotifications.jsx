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
import { useTranslation } from "react-i18next";

const api = axios.create({ baseURL: "http://localhost:8000" });
const getAuthHeader = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
});

const LAST_SEEN_KEY = "worker_notifications_last_seen";
const SIDEBAR_UNREAD_KEY = "worker_unread_notifications";

export default function WorkerNotifications() {
  const { t } = useTranslation();

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
      alertError(t("Error"), t("Failed to load notifications."));
    } finally {
      setLoading(false);
    }
  };

  // Handle clicking a notification
  const handleNotiClick = (noti) => {
    if (!noti.isRead) markAsRead(noti.notificationId);

    // 1. ตรวจสอบว่าเป็นเรื่อง Profile Update หรือไม่ (เช็คจาก Message)
    if (noti.message?.toLowerCase().includes("profile update")) {
    
      // ✅ STEP A: ดึงเลข ID ออกจากข้อความแจ้งเตือน (เช่นจาก "ID: 15")
      const matchId = noti.message.match(/ID: (\d+)/);
      const targetId = matchId ? Number(matchId[1]) : null;

      // ✅ STEP B: ค้นหาคำร้องจากรายการทั้งหมดที่ Backend ส่งมา ให้ตรงกับ ID ที่ได้
      const allRequests = noti.employee?.profileUpdateRequests || [];
      const profileReq = targetId 
        ? allRequests.find(r => Number(r.requestId) === targetId) // หาใบที่ ID ตรงกัน
        : allRequests[0]; // ถ้าหา ID ในข้อความไม่เจอ ให้ใช้ใบแจ้งเตือนล่าสุดแทน

      if (profileReq) {
        setSelectedRequest({
          type: 'PROFILE',
          requestId: profileReq.requestId,
          // ✅ ตอนนี้ status จะตรงตามใบจริง (Approved หรือ Rejected)
          status: profileReq.status, 
          oldName: `${profileReq.oldFirstName} ${profileReq.oldLastName}`,
          newName: `${profileReq.newFirstName} ${profileReq.newLastName}`,
          reason: profileReq.reason || t("Requested via profile settings"),
          attachmentUrl: profileReq.attachmentUrl,
          isReadOnly: true,
        });
        setIsModalOpen(true);
      }
      return; // จบการทำงาน
    }

    // 2. กรณีใบลา (Logic เดิมของคุณ - ไม่ต้องลบ)
    if (noti.relatedRequestId && noti.relatedRequest) {
      const rr = noti.relatedRequest;
      setSelectedRequest({
        type: 'LEAVE', // ✅ เพิ่ม Flag
        requestId: noti.relatedRequestId,
        employeeName: t("Your Request"),
        leaveType: rr.leaveType?.typeName || "Unknown",
        startDate: rr.startDate,
        endDate: rr.endDate,
        reason: rr?.reason || t("No reason provided."),
        status: rr.status,
        attachmentUrl: rr.attachmentUrl,
        isReadOnly: true,
        approvedByHR: rr.approvedByHR,
        approvalDate: rr.approvalDate,
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
      await alertSuccess(t("Success"), t("All notifications marked as read."));
      setSidebarUnreadZero();
    } catch (err) {
      console.error(err);
    }
  };

  const deleteNoti = async (id) => {
    if (
      !(await alertConfirm(t("Delete Notification"), t("Are you sure you want to delete this?"),
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
      alertError(t("Error"), t("Failed to delete notification."));
    }
  };

  const handleClearAll = async () => {
    if (!(await alertConfirm(t("Clear All"), t("Delete all notifications?"), t("Clear All"))))
      return;

    try {
      await api.delete("/api/notifications/clear-all", getAuthHeader());
      setNotifications([]);
      await alertSuccess(t("Success"), t("All notifications cleared."));
      setSidebarUnreadZero();
    } catch (err) {
      alertError(t("Error"), t("Failed to clear notifications."));
    }
  };

  const getTitle = (type, message) => {
    if (message?.includes("profile update") || message?.includes("change name")) {
      return t("Profile Update Update");
    }
    if (type === "NewRequest") return t("New Request Submitted");
    if (type === "Approved") return t("Leave Request Approved");
    if (type === "Rejected") return t("Leave Request Rejected");
    return t("System Notification");
  };

  return (
    <div className="page-card wn">
      <div className="wn-head">
        <div>
          <h2 className="wn-title">{t("Notifications")}</h2>
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
            <FiTrash2 />{t("Clear All")}</button>
          <button
            className="emp-btn emp-btn-primary small"
            onClick={markAllAsRead}
            disabled={notifications.length === 0}
          >
            <FiCheck />{t("Mark all read")}</button>
        </div>
      </div>

      <div className="wn-list">
        {loading ? (
            <div className="wn-empty">
              <FiRefreshCw className="spin" size={24} />
              <p>{t("Loading...")}</p>
            </div>
          ) : pagedNotifications.length === 0 ? (
            <div className="wn-empty">
              <FiBell style={{ opacity: 0.5 }} size={32} />
              <p>{t("No notifications found.")}</p>
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
                    {getTitle(n.notificationType, n.message)}
                    {n._isNewSinceLastSeen && <span className="badge-new">{t("NEW")}</span>}
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