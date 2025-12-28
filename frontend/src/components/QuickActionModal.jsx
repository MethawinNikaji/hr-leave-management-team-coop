import React, { useState } from "react";
import { 
  FiX, FiCheck, FiXCircle, FiCalendar, FiUser, 
  FiFileText, FiInfo, FiPaperclip, FiExternalLink, FiClock 
} from "react-icons/fi";
import moment from "moment";
import axiosClient from "../api/axiosClient";
import { alertSuccess, alertError } from "../utils/sweetAlert";
import "./QuickActionModal.css"; //

const STATUS_CONFIG = {
  Approved: { label: 'Approved', className: 'status-approved', icon: <FiCheck /> },
  Rejected: { label: 'Rejected', className: 'status-rejected', icon: <FiXCircle /> },
  Pending: { label: 'Pending Review', className: 'status-pending', icon: <FiClock /> }
};

export default function QuickActionModal({ isOpen, onClose, requestData, onActionSuccess }) {
  const [loading, setLoading] = useState(false);

  if (!isOpen || !requestData) return null;

  const handleAction = async (status) => {
    try {
      setLoading(true);
      const actionValue = status === 'Approved' ? 'approve' : 'reject';
      await axiosClient.put(`/leave/admin/approval/${requestData.requestId}`, { action: actionValue });
      
      await alertSuccess("Success", `Request has been ${status.toLowerCase()} successfully.`);
      if (onActionSuccess) onActionSuccess(); 
      onClose();
    } catch (err) {
      alertError("Error", err.response?.data?.message || "Unable to process the request.");
    } finally {
      setLoading(false);
    }
  };

  const currentStatus = STATUS_CONFIG[requestData.status] || STATUS_CONFIG.Pending;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="qa-modal" onClick={(e) => e.stopPropagation()}>
        
        {/* Header */}
        <div className="qa-modal-header">
          <div className="qa-title">
            <div className="qa-icon-header">
              {requestData.isReadOnly ? <FiInfo /> : <FiFileText />}
            </div>
            <span>{requestData.isReadOnly ? "Leave Details" : "Manage Leave Request"}</span>
          </div>
          <button className="qa-close-btn" onClick={onClose} aria-label="Close">
            <FiX />
          </button>
        </div>

        {/* Content Body */}
        <div className="qa-modal-body">
          {requestData.isReadOnly && (
            <div className="qa-status-wrapper">
              <span className={`qa-badge ${currentStatus.className}`}>
                {currentStatus.icon} {currentStatus.label}
              </span>
            </div>
          )}

          <div className="qa-info-list">
            <div className="qa-info-row">
              <FiUser className="qa-row-icon" />
              <span className="qa-label">Employee:</span>
              <span className="qa-value">{requestData.employeeName}</span>
            </div>
            <div className="qa-info-row">
              <FiFileText className="qa-row-icon" />
              <span className="qa-label">Type:</span>
              <span className="qa-value">{requestData.leaveType}</span>
            </div>
            <div className="qa-info-row">
              <FiCalendar className="qa-row-icon" />
              <span className="qa-label">Period:</span>
              <span className="qa-value">
                {moment(requestData.startDate).format("DD MMM")} - {moment(requestData.endDate).format("DD MMM YYYY")}
              </span>
            </div>
          </div>

          <div className="qa-reason-box">
            <span className="qa-reason-label">Reason</span>
            <p className="qa-reason-text">{requestData.reason || "No reason provided."}</p>
          </div>

          {requestData.attachmentUrl && (
            <a 
              href={`http://localhost:8000/uploads/${requestData.attachmentUrl}`} 
              target="_blank" 
              rel="noopener noreferrer"
              className="qa-attachment-link"
            >
              <FiPaperclip />
              <span className="qa-attachment-text">View Attachment</span>
              <FiExternalLink size={14} />
            </a>
          )}
        </div>

        {/* Footer Actions */}
        <div className="qa-modal-footer">
          {requestData.isReadOnly ? (
            <button className="qa-btn qa-btn-outline full" onClick={onClose}>
              Close Window
            </button>
          ) : (
            <div className="qa-btn-group">
              <button 
                className="qa-btn qa-btn-danger" 
                onClick={() => handleAction('Rejected')} 
                disabled={loading}
              >
                <FiXCircle /> Reject
              </button>
              <button 
                className="qa-btn qa-btn-primary" 
                onClick={() => handleAction('Approved')} 
                disabled={loading}
              >
                <FiCheck /> Approve
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}