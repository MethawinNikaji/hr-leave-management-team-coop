import React from "react";
import moment from "moment";
import {
  FiX,
  FiInfo,
  FiCalendar,
  FiClock,
  FiUser,
  FiCheckCircle,
  FiXCircle,
  FiFileText,
} from "react-icons/fi";

import "./QuickActionModal.css";

const QuickActionModal = ({ isOpen, onClose, requestData }) => {
  if (!isOpen || !requestData) return null;

  const status = requestData?.status || "Pending";
  const isApproved = status === "Approved";
  const isRejected = status === "Rejected";

  const decisionLabel = isApproved
    ? "Approved by:"
    : isRejected
    ? "Rejected by:"
    : null;

  const decisionName =
    requestData?.approvedByHR &&
    `${requestData.approvedByHR.firstName || ""} ${requestData.approvedByHR.lastName || ""}`.trim();

  const statusClass = isApproved
    ? "status-success"
    : isRejected
    ? "status-danger"
    : "status-warning";

  const statusIcon = isApproved ? <FiCheckCircle /> : isRejected ? <FiXCircle /> : <FiClock />;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div className="header-title">
            <FiInfo className="header-icon" />
            <span>Leave Request Detail</span>
          </div>
          <button className="close-btn-icon" onClick={onClose} aria-label="Close">
            <FiX />
          </button>
        </div>

        {/* Status */}
        <div className="status-section">
          <span className={`status-pill ${statusClass}`}>
            {statusIcon} {status}
          </span>
        </div>

        {/* Body */}
        <div className="modal-body">
          <div className="detail-row">
            <div className="detail-icon">
              <FiUser />
            </div>
            <div className="detail-label">Employee:</div>
            <div className="detail-value">{requestData.employeeName || "-"}</div>
          </div>

          <div className="detail-row">
            <div className="detail-icon">
              <FiFileText />
            </div>
            <div className="detail-label">Leave Type:</div>
            <div className="detail-value">{requestData.leaveType || "-"}</div>
          </div>

          <div className="detail-row">
            <div className="detail-icon">
              <FiCalendar />
            </div>
            <div className="detail-label">Period:</div>
            <div className="detail-value">
              {requestData.startDate
                ? moment(requestData.startDate).format("DD MMM")
                : "-"}{" "}
              -{" "}
              {requestData.endDate
                ? moment(requestData.endDate).format("DD MMM YYYY")
                : "-"}
            </div>
          </div>

          {/* ✅ Approved by / Rejected by */}
          {decisionLabel && decisionName && (
            <div className="detail-row">
              <div className="detail-icon">
                {isApproved ? <FiCheckCircle /> : <FiXCircle />}
              </div>
              <div className="detail-label">{decisionLabel}</div>
              <div className="detail-value">{decisionName}</div>
            </div>
          )}

          {/* ✅ เวลา approve/reject */}
          {requestData.approvalDate && (
            <div className="detail-row">
              <div className="detail-icon">
                <FiClock />
              </div>
              <div className="detail-label">Decision at:</div>
              <div className="detail-value">
                {moment(requestData.approvalDate).format("DD MMM YYYY, HH:mm")}
              </div>
            </div>
          )}

          {/* Reason */}
          <div className="reason-box">
            <label className="reason-label">Reason</label>
            <p className="reason-text">
              {requestData.reason || "No reason provided."}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="modal-footer">
          <button className="btn-close-window" onClick={onClose}>
            Close Window
          </button>
        </div>
      </div>
    </div>
  );
};

export default QuickActionModal;
