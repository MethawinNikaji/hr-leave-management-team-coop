// src/components/WorkerModal.jsx
import React from 'react';
import moment from 'moment';
import { FiX, FiInfo, FiCalendar, FiClock, FiActivity, FiUser, FiCheckCircle, FiCoffee } from 'react-icons/fi';
import './WorkerModal.css';

const WorkerDateModal = ({ isOpen, onClose, date, data }) => {
  if (!isOpen) return null;

  const getStatusColor = (status) => {
    const s = String(status || "").toLowerCase();
    if (s.includes("holiday")) return "status-primary";
    if (s.includes("weekend")) return "status-secondary"; // Added for weekend
    if (s.includes("upcoming")) return "status-default";  // Added for future
    if (s.includes("approved") || s.includes("normal") || s.includes("present")) return "status-success";
    if (s.includes("pending")) return "status-warning";
    if (s.includes("reject") || s.includes("late") || s.includes("absent")) return "status-danger";
    return "status-default";
  };

  const isLeave = data?.type === 'leave';
  const isHoliday = data?.type === 'holiday';
  const isFuture = data?.type === 'future';
  const isWeekend = data?.type === 'weekend';

  const approvedByName =
    data?.approvedByName ||
    data?.approvedBy ||
    (data?.approvedByHR
      ? `${data.approvedByHR.firstName || ""} ${data.approvedByHR.lastName || ""}`.trim()
      : "") ||
    "";

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="header-title">
            <FiInfo className="header-icon" />
            <span>Daily Details : {moment(date).format("DD MMM YYYY")}</span>
          </div>
          <button className="close-btn-icon" onClick={onClose}><FiX /></button>
        </div>

        <div className="status-section">
          <span className={`status-pill ${getStatusColor(data?.status)}`}>
            {data?.status || "No Data"}
          </span>
        </div>

        <div className="modal-body">
          {/* ✅ CASE: COMPANY HOLIDAY OR WEEKEND */}
          {isHoliday || isWeekend ? (
            <div className="detail-row">
              <div className="detail-icon"><FiCoffee /></div>
              <div className="detail-label">Notice:</div>
              <div className="detail-value">
                {isHoliday ? "Official Non-working Day" : "Weekly Rest Day"}
              </div>
            </div>
          ) : isFuture ? (
            /* ✅ CASE: FUTURE DATE */
            <div className="detail-row">
              <div className="detail-icon"><FiClock /></div>
              <div className="detail-label">Status:</div>
              <div className="detail-value">Waiting for this date...</div>
            </div>
          ) : (
            /* ✅ CASE: LEAVE OR ATTENDANCE (PAST/PRESENT) */
            <>
              <div className="detail-row">
                <div className="detail-icon"><FiUser /></div>
                <div className="detail-label">Employee:</div>
                <div className="detail-value">{data?.employeeName || "You"}</div>
              </div>

              {isLeave ? (
                <>
                  <div className="detail-row">
                    <div className="detail-icon"><FiActivity /></div>
                    <div className="detail-label">Type:</div>
                    <div className="detail-value">{data?.leaveType || "-"}</div>
                  </div>
                  <div className="detail-row">
                    <div className="detail-icon"><FiCalendar /></div>
                    <div className="detail-label">Period:</div>
                    <div className="detail-value">
                      {moment(data?.startDate).format("DD MMM")} - {moment(data?.endDate).format("DD MMM YYYY")}
                    </div>
                  </div>
                  {approvedByName && (
                    <div className="detail-row">
                      <div className="detail-icon"><FiCheckCircle /></div>
                      <div className="detail-label">Approved by:</div>
                      <div className="detail-value">{approvedByName}</div>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div className="detail-row">
                    <div className="detail-icon"><FiClock /></div>
                    <div className="detail-label">Check In:</div>
                    <div className="detail-value">{data?.checkIn ? moment(data.checkIn).format("HH:mm") : "--:--"}</div>
                  </div>
                  <div className="detail-row">
                    <div className="detail-icon"><FiClock /></div>
                    <div className="detail-label">Check Out:</div>
                    <div className="detail-value">{data?.checkOut ? moment(data.checkOut).format("HH:mm") : "--:--"}</div>
                  </div>
                </>
              )}
            </>
          )}

          <div className="reason-box">
            <label className="reason-label">
              {isHoliday || isWeekend ? "REST DAY DESCRIPTION" : "NOTE / REASON"}
            </label>
            <p className="reason-text">
              {data?.reason || "No specific details provided for this date."}
            </p>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn-close-window" onClick={onClose}>
            Close Window
          </button>
        </div>
      </div>
    </div>
  );
};

export default WorkerDateModal;