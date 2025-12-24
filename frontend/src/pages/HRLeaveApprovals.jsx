import React, { useState, useEffect, useMemo } from "react";
import Pagination from "../components/Pagination";
import { alertConfirm, alertError, alertSuccess } from "../utils/sweetAlert";
import axiosClient from "../api/axiosClient";
import { buildFileUrl } from "../utils/fileUrl";

export default function HRLeaveApprovals() {
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [selected, setSelected] = useState(new Set());
  const [isLoading, setIsLoading] = useState(false);

  // Phase 2: filters
  const [q, setQ] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");

  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const fetchPendingRequests = async () => {
    try {
      setIsLoading(true);
      const response = await axiosClient.get("/leave/admin/pending");
      setLeaveRequests(response.data.requests || []);
    } catch (err) {
      console.error("Error fetching requests:", err);
      await alertError("Error", err.response?.data?.message || err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setPage(1);
  }, [leaveRequests.length, q, typeFilter]);

  const toggle = (requestId) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(requestId) ? next.delete(requestId) : next.add(requestId);
      return next;
    });
  };

  const handleAction = async (ids, actionType) => {
    const idArray = Array.isArray(ids) ? ids : [ids];
    if (idArray.length === 0) return;

    const label = actionType === "approve" ? "Approve" : "Reject";
    const ok = await alertConfirm(
      `Confirm ${label}`,
      `Do you want to ${label.toLowerCase()} ${idArray.length} request(s)?`,
      label
    );
    if (!ok) return;

    try {
      await Promise.all(
        idArray.map((requestId) =>
          axiosClient.put(`/leave/admin/approval/${requestId}`, { action: actionType })
        )
      );

      await alertSuccess("Done", `Successfully ${label.toLowerCase()}d.`);
      setSelected(new Set());
      fetchPendingRequests();
    } catch (err) {
      console.error(err);
      await alertError("Error", err.response?.data?.message || err.message);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString("en-GB");
  };

  const renderAttachment = (fileName) => {
    if (!fileName) return <span style={{ color: "#9ca3af" }}>No file</span>;

    const isImage = /\.(jpg|jpeg|png|gif)$/i.test(fileName);
    const isPDF = fileName.toLowerCase().endsWith(".pdf");

    const href = buildFileUrl(fileName.startsWith("/uploads") ? fileName : `/uploads/${fileName}`);

    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        title="View Attachment"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          color: "#2563eb",
          textDecoration: "none",
          fontWeight: 700,
          fontSize: 13,
        }}
      >
        {isImage ? "🖼️ Image" : isPDF ? "📄 PDF" : "📁 File"}
      </a>
    );
  };

  const leaveTypes = useMemo(() => {
    const set = new Set(leaveRequests.map((r) => r.leaveType?.typeName).filter(Boolean));
    return ["all", ...Array.from(set)];
  }, [leaveRequests]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return leaveRequests.filter((r) => {
      const name = r.employee ? `${r.employee.firstName} ${r.employee.lastName || ""}` : "";
      const typeName = r.leaveType?.typeName || "Leave";
      const okQ = !s || `${name} ${typeName} ${r.reason || ""}`.toLowerCase().includes(s);
      const okType = typeFilter === "all" || typeName === typeFilter;
      return okQ && okType;
    });
  }, [leaveRequests, q, typeFilter]);

  // Pagination apply
  const total = filtered.length;
  const startIdx = (page - 1) * pageSize;
  const paged = useMemo(() => filtered.slice(startIdx, startIdx + pageSize), [filtered, startIdx, pageSize]);

  const allChecked = filtered.length > 0 && selected.size === filtered.length;

  return (
    <div className="page-card">
      <h1 style={{ margin: 0 }}>Leave Approvals</h1>
      <p style={{ marginTop: 6, color: "#4b5563" }}>
        Review and bulk approve/reject leave requests.
      </p>

      {/* Filters (Phase 2) */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", margin: "10px 0 14px" }}>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search employee / type / reason..."
          style={{
            padding: "8px 10px",
            borderRadius: 10,
            border: "1px solid #e5e7eb",
            minWidth: 280,
          }}
        />

        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          style={{
            padding: "8px 10px",
            borderRadius: 10,
            border: "1px solid #e5e7eb",
          }}
        >
          {leaveTypes.map((t) => (
            <option key={t} value={t}>
              {t === "all" ? "All types" : t}
            </option>
          ))}
        </select>

        <button className="btn outline" onClick={fetchPendingRequests} disabled={isLoading}>
          {isLoading ? "Loading..." : "Refresh"}
        </button>

        <div style={{ flex: 1 }} />

        <button
          className="btn outline"
          onClick={() => handleAction(Array.from(selected), "reject")}
          disabled={selected.size === 0}
        >
          Reject Selected
        </button>
        <button
          className="btn primary"
          onClick={() => handleAction(Array.from(selected), "approve")}
          disabled={selected.size === 0}
        >
          Approve Selected
        </button>
      </div>

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th style={{ width: 44 }}>
                <input
                  type="checkbox"
                  onChange={(e) => {
                    if (e.target.checked) setSelected(new Set(filtered.map((r) => r.requestId)));
                    else setSelected(new Set());
                  }}
                  checked={allChecked}
                />
              </th>
              <th>ID</th>
              <th>Employee</th>
              <th>Type</th>
              <th>Date</th>
              <th>Reason</th>
              <th>Attachment</th>
              <th>Status</th>
              <th style={{ width: 200, textAlign: "right" }}>Action</th>
            </tr>
          </thead>

          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan="9" style={{ textAlign: "center", padding: 20 }}>
                  Loading...
                </td>
              </tr>
            ) : paged.length > 0 ? (
              paged.map((r) => (
                <tr key={r.requestId}>
                  <td>
                    <input
                      type="checkbox"
                      checked={selected.has(r.requestId)}
                      onChange={() => toggle(r.requestId)}
                    />
                  </td>

                  <td>{r.requestId}</td>

                  <td>{r.employee ? `${r.employee.firstName} ${r.employee.lastName || ""}` : `ID: ${r.employeeId}`}</td>

                  <td>
                    <span className="badge">{r.leaveType?.typeName || "Leave"}</span>
                  </td>

                  <td>
                    {formatDate(r.startDate)} → {formatDate(r.endDate)}
                  </td>

                  <td>{r.reason || "-"}</td>

                  <td>{renderAttachment(r.attachmentUrl)}</td>

                  <td>
                    <span className="status pending">{r.status}</span>
                  </td>

                  <td style={{ textAlign: "right" }}>
                    <div style={{ display: "inline-flex", gap: 8 }}>
                      <button className="btn small outline" onClick={() => handleAction(r.requestId, "reject")}>
                        Reject
                      </button>
                      <button className="btn small primary" onClick={() => handleAction(r.requestId, "approve")}>
                        Approve
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="9" style={{ textAlign: "center", padding: 20 }}>
                  No pending requests.
                </td>
              </tr>
            )}
          </tbody>
        </table>

        <Pagination
          total={total}
          page={page}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
        />
      </div>
    </div>
  );
}
