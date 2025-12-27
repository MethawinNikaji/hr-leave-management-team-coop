import React, { useState } from "react";
import { FiX, FiCheck, FiXCircle, FiCalendar, FiUser, FiFileText, FiInfo, FiPaperclip, FiExternalLink } from "react-icons/fi";
import moment from "moment";
import axiosClient from "../api/axiosClient";
import { alertSuccess, alertError } from "../utils/sweetAlert";

export default function QuickActionModal({ isOpen, onClose, requestData, onActionSuccess }) {
  const [loading, setLoading] = useState(false);

  if (!isOpen || !requestData) return null;

  const handleAction = async (status) => {
    try {
      setLoading(true);
      const actionValue = status === 'Approved' ? 'approve' : 'reject';
      await axiosClient.put(`/leave/admin/approval/${requestData.requestId}`, { action: actionValue });
      await alertSuccess("สำเร็จ", `ดำเนินการ ${status} เรียบร้อยแล้ว`);
      if (onActionSuccess) onActionSuccess(); 
      onClose();
    } catch (err) {
      alertError("ผิดพลาด", err.response?.data?.message || "ไม่สามารถดำเนินการได้");
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Approved': return { label: '✅ อนุมัติแล้ว', className: 'badge-ok' };
      case 'Rejected': return { label: '❌ ปฏิเสธแล้ว', className: 'badge-late' };
      default: return { label: '⏳ รอการตรวจสอบ', className: 'badge-leave' };
    }
  };

  const statusInfo = getStatusBadge(requestData.status);

  return (
    <div className="modal-backdrop">
      <div className="modal" style={{ maxWidth: '450px' }}>
        <div className="modal-head-row">
          <h3>
            {requestData.isReadOnly ? (
              <><FiInfo style={{ marginBottom: '-3px' }} /> รายละเอียดการลา</>
            ) : (
              "จัดการคำขอลา"
            )}
          </h3>
          <button className="close-x" onClick={onClose}><FiX /></button>
        </div>

        <div className="quick-info-body" style={{ padding: '15px 0' }}>
          {requestData.isReadOnly && (
            <div style={{ marginBottom: '20px', textAlign: 'center' }}>
               <span className={`badge ${statusInfo.className}`} style={{ fontSize: '1rem', padding: '6px 16px', borderRadius: '20px' }}>
                  {statusInfo.label}
               </span>
            </div>
          )}

          <div className="info-item"><FiUser /> <strong>พนักงาน:</strong> {requestData.employeeName}</div>
          <div className="info-item"><FiFileText /> <strong>ประเภท:</strong> {requestData.leaveType}</div>
          <div className="info-item"><FiCalendar /> <strong>วันที่:</strong> {moment(requestData.startDate).format("DD MMM")} - {moment(requestData.endDate).format("DD MMM YYYY")}</div>
          
          <div className="info-item" style={{ marginTop: '15px', padding: '12px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
             <div style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '4px' }}>เหตุผลการลา:</div>
             <div style={{ color: '#334155' }}>{requestData.reason || "ไม่ได้ระบุเหตุผล"}</div>
          </div>

          {/* 🔥 ส่วนแสดงไฟล์แนบ (ถ้ามี) */}
          {requestData.attachmentUrl && (
            <div className="info-item" style={{ marginTop: '10px' }}>
              <div style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '6px' }}>ไฟล์แนบหลักฐาน:</div>
              <a 
                href={`http://localhost:8000/uploads/${requestData.attachmentUrl}`} 
                target="_blank" 
                rel="noopener noreferrer"
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '8px', 
                  padding: '10px', 
                  background: '#eff6ff', 
                  color: '#2563eb', 
                  borderRadius: '8px', 
                  textDecoration: 'none',
                  fontSize: '0.9rem',
                  fontWeight: '500',
                  border: '1px dashed #3b82f6'
                }}
              >
                <FiPaperclip /> ดูไฟล์แนบหลักฐาน <FiExternalLink size={14} />
              </a>
            </div>
          )}
        </div>

        <div className="modal-actions" style={{ marginTop: '10px' }}>
          {requestData.isReadOnly ? (
            <button className="btn outline" onClick={onClose} style={{ width: '100%' }}>ปิดหน้าต่าง</button>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', width: '100%' }}>
              <button className="btn outline" onClick={() => handleAction('Rejected')} disabled={loading} style={{ color: '#ef4444', borderColor: '#ef4444' }}>
                <FiXCircle /> ปฏิเสธ
              </button>
              <button className="btn primary" onClick={() => handleAction('Approved')} disabled={loading}>
                <FiCheck /> อนุมัติ
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}