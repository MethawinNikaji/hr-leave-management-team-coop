import React, { useState, useEffect, useMemo } from "react";
import { useLocation } from "react-router-dom";
import Pagination from "../components/Pagination";
import { alertConfirm, alertError, alertSuccess } from "../utils/sweetAlert";
import axiosClient from "../api/axiosClient";
import { FiUser, FiCheck, FiX, FiInfo, FiExternalLink, FiClock } from "react-icons/fi";
import moment from "moment";
import "./HRLeaveApprovals.css"; // ใช้ CSS ร่วมกับหน้า Leave เพื่อความคุมโทน

export default function HRProfileRequests() {
  const location = useLocation();
  const [requests, setRequests] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [active, setActive] = useState(null); // สำหรับ Detail Modal

  // Filters & Pagination
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const setSidebarUnreadZero = () => {
    localStorage.setItem("hr_unread_notifications", "0");
    window.dispatchEvent(new Event("storage"));
    };

  const fetchRequests = async () => {
    try {
      setIsLoading(true);
      const res = await axiosClient.get("/auth/admin/profile-requests");
      const fetchedData = res.data.requests || []; // ✅ เก็บข้อมูลที่ดึงมาได้เข้าตัวแปรก่อน
      setRequests(fetchedData);

      // ✅ 3. ตรวจสอบว่ามี autoOpenId ส่งมาจากหน้า Notifications หรือไม่
      // เราเช็คจาก location.state ที่คุณ Navigate มา
      if (location.state?.autoOpenId) {
        const targetId = Number(location.state.autoOpenId);
        // ค้นหาคำร้องในรายการที่เพิ่งดึงมา
        const targetRequest = fetchedData.find(r => r.requestId === targetId);
        
        if (targetRequest) {
          setActive(targetRequest); // สั่งเปิด Modal รายละเอียดทันที
          
          // (Optional) เคลียร์ state เพื่อไม่ให้มันเปิดซ้ำเมื่อ Refresh หน้าจอ
          window.history.replaceState({}, document.title);
        }
      }
    } catch (err) {
      console.error(err);
      alertError("Error", "Unable to fetch profile update requests");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchRequests(); setSidebarUnreadZero(); }, []);

  // ✅ เพิ่ม useEffect ตัวนี้เข้าไปเพื่อดักเปิด Modal เมื่อข้อมูลมาครบแล้ว
    useEffect(() => {
    if (location.state?.autoOpenId && requests.length > 0) {
        const targetId = Number(location.state.autoOpenId);
        console.log("Searching for Request ID:", targetId); // ไว้ Check ใน Console

        const targetRequest = requests.find(r => Number(r.requestId) === targetId);
        
        if (targetRequest) {
        console.log("Found! Opening Modal...");
        setActive(targetRequest);
        
        // เคลียร์ state ทิ้งเพื่อป้องกันการเด้งเปิดใหม่เวลา HR กด Refresh หน้าจอ
        window.history.replaceState({}, document.title);
        }
    }
    }, [location.state, requests]); // ทำงานทุกครั้งที่ requests มีการเปลี่ยนแปลง

  const handleAction = async (requestId, actionType) => {
    const label = actionType === "approve" ? "Approve" : "Reject";
    const ok = await alertConfirm(
      `Confirm ${label}`,
      `Are you sure you want to ${actionType === "approve" ? "approve" : "reject"} this name change request?`,
      label
    );
    if (!ok) return;

    try {
      await axiosClient.put(`/auth/admin/profile-approval/${requestId}`, { action: actionType });
      await alertSuccess("Done", `Successfully ${label}ed the request`);
      fetchRequests(); // รีโหลดข้อมูล
      setActive(null); // ปิด modal ถ้าเปิดอยู่
    } catch (err) {
      alertError("Error", err.response?.data?.message || "ดำเนินการล้มเหลว");
    }
  };

  // Filter Logic
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return requests.filter((r) => {
      const name = `${r.employee?.firstName} ${r.employee?.lastName}`.toLowerCase();
      const newName = `${r.newFirstName} ${r.newLastName}`.toLowerCase();
      return name.includes(s) || newName.includes(s) || r.reason?.toLowerCase().includes(s);
    });
  }, [requests, q]);

  const startIdx = (page - 1) * pageSize;
  const paged = filtered.slice(startIdx, startIdx + pageSize);

  return (
    <div className="page-card hr-leave-approvals">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ margin: 0 }}>Profile Update Requests</h1>
          <p style={{ marginTop: 6, color: "#64748b" }}>Review and approve employee name change requests</p>
        </div>
        <button className="btn outline" onClick={fetchRequests} disabled={isLoading}>
          {isLoading ? "Loading..." : "Refresh List"}
        </button>
      </div>

      {/* Filters */}
      <div style={{ margin: "20px 0" }}>
        <input
          className="audit-input"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search employee name or proposed name..."
          style={{ width: "320px", borderRadius: "12px" }}
        />
      </div>

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Request ID</th>
              <th>Employee</th>
              <th>Current Name</th>
              <th>Proposed Name</th>
              <th>Request Date</th>
              <th>Status</th>
              <th style={{ textAlign: "right" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan="7" style={{ textAlign: "center", padding: 40 }}>Loading...</td></tr>
            ) : paged.length > 0 ? (
              paged.map((r) => (
                <tr key={r.requestId} className="hrla-row" onClick={() => setActive(r)}>
                  <td>#{r.requestId}</td>
                  <td>
                    <div style={{ fontWeight: 700 }}>{r.employee?.firstName} {r.employee?.lastName}</div>
                    <div style={{ fontSize: '12px', color: '#94a3b8' }}>ID: {r.employeeId}</div>
                  </td>
                  <td style={{ color: '#64748b' }}>{r.oldFirstName} {r.oldLastName}</td>
                  <td style={{ fontWeight: 700, color: '#16a34a' }}>{r.newFirstName} {r.newLastName}</td>
                  <td>
                    <div style={{ fontSize: '13px' }}><FiClock style={{ marginBottom: -2 }} /> {moment(r.requestedAt).format("DD MMM YYYY")}</div>
                  </td>
                  <td><span className="status pending">{r.status}</span></td>
                  <td style={{ textAlign: "right" }}>
                    <div style={{ display: "inline-flex", gap: 8 }} onClick={(e) => e.stopPropagation()}>
                      <button className="btn small outline" onClick={() => setActive(r)}>Details</button>
                      <button className="btn small primary" onClick={() => handleAction(r.requestId, "approve")}><FiCheck /></button>
                      <button className="btn small outline danger" style={{ borderColor: '#ef4444', color: '#ef4444' }} onClick={() => handleAction(r.requestId, "reject")}><FiX /></button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr><td colSpan="7" style={{ textAlign: "center", padding: 40 }}>No pending requests.</td></tr>
            )}
          </tbody>
        </table>
        <Pagination total={filtered.length} page={page} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={setPageSize} />
      </div>

      {/* ✅ Detail Modal (เปรียบเทียบข้อมูลเดิม vs ใหม่) */}
      {active && (
        <div className="p-modal-overlay" onClick={() => setActive(null)}>
          <div className="p-modal-content" style={{ maxWidth: '600px' }} onClick={e => e.stopPropagation()}>
            <div className="p-modal-header">
              <div className="p-header-icon" style={{ background: '#eff6ff', color: '#3b82f6' }}><FiUser /></div>
              <div className="p-header-text">
                <h3>Request Details</h3>
                <p>Compare details before approval</p>
              </div>
              <button className="p-modal-close" onClick={() => setActive(null)}><FiX /></button>
            </div>
            
            <div className="p-modal-form" style={{ padding: '0 32px 32px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div className="p-current-info">
                  <label>Current Name (Old)</label>
                  <div className="p-name-badge" style={{ background: '#f1f5f9', borderStyle: 'solid' }}>
                    {active.oldFirstName} {active.oldLastName}
                  </div>
                </div>
                <div className="p-current-info">
                  <label>Proposed Name (New)</label>
                  <div className="p-name-badge" style={{ background: '#f0fdf4', borderColor: '#22c55e', color: '#166534', borderStyle: 'solid' }}>
                    {active.newFirstName} {active.newLastName}
                  </div>
                </div>
              </div>

              <div className="p-input-group" style={{ marginTop: '10px' }}>
                <label>Reason for change</label>
                <div style={{ padding: '12px', background: '#f8fafc', borderRadius: '12px', fontSize: '14px', border: '1.5px solid #f1f5f9' }}>
                  {active.reason || "No reason provided"}
                </div>
              </div>

              {active.attachmentUrl && (
                <div className="p-input-group p-attachment-section">
                    <label>Supporting Document</label>
                    <a 
                    href={`http://localhost:8000/uploads/profiles/${active.attachmentUrl}`} 
                    target="_blank" 
                    rel="noreferrer"
                    className="p-file-preview-card"
                    >
                    <div className="p-file-icon">
                        <FiExternalLink />
                    </div>
                    <div className="p-file-info">
                        <span className="p-file-name">View Attachment</span>
                        <span className="p-file-desc">Official document (PDF/Image)</span>
                    </div>
                    <div className="p-file-action">Open</div>
                    </a>
                </div>
                )}

              <div className="p-modal-footer" style={{ marginTop: '20px' }}>
                <button type="button" className="p-btn-cancel" onClick={() => handleAction(active.requestId, "reject")}>Reject Request</button>
                <button type="button" className="p-btn-submit" onClick={() => handleAction(active.requestId, "approve")}>Approve & Update Profile</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}