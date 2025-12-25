import React, { useState, useEffect, useMemo } from "react";
import Pagination from "../components/Pagination";
import { alertConfirm, alertError, alertSuccess } from "../utils/sweetAlert";
import axiosClient from "../api/axiosClient";
import { buildFileUrl } from "../utils/fileUrl";
import "./HRLeaveApprovals.css";

export default function HRLeaveApprovals() {
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [selected, setSelected] = useState(new Set());
  const [isLoading, setIsLoading] = useState(false);

  // ✅ Detail modal (Phase 2.3)
  const [active, setActive] = useState(null);

  // Phase 2: filters
  const [q, setQ] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");

  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // ✅ Days deducted (supports multiple possible backend field names)
  const getDeductedDays = (r) => {
    const candidates = [r?.deductedDays, r?.totalDaysDeducted, r?.totalDays, r?.totalDaysRequested];
    for (const v of candidates) {
      const n = Number(v);
      if (Number.isFinite(n) && n >= 0) return n;
    }
    return 0;
  };

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

  // ✅ Attachment meta (for preview)
  const getAttachmentMeta = (url) => {
    if (!url) return { kind: "none", href: "" };
    const href = buildFileUrl(url);
    const lower = href.toLowerCase();
    if (/(\.png|\.jpg|\.jpeg|\.gif|\.webp)$/i.test(lower)) return { kind: "image", href };
    if (lower.endsWith(".pdf")) return { kind: "pdf", href };
    return { kind: "file", href };
  };

  const renderAttachment = (fileName) => {
    if (!fileName) return <span style={{ color: "#9ca3af" }}>No file</span>;

    const href = buildFileUrl(fileName);
    const lower = href.toLowerCase();
    const isImage = /(\.png|\.jpg|\.jpeg|\.gif|\.webp)$/i.test(lower);
    const isPDF = lower.endsWith(".pdf");

    return (
      <a className="hrla-link" href={href} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>
        {isImage ? "🖼️ Image" : isPDF ? "📄 PDF" : "📁 File"}
      </a>
    );
  };

  // (duplicate getAttachmentMeta removed)

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
    <div className="page-card hr-leave-approvals">
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
              <th style={{ width: 90 }}>Days</th>
              <th>Reason</th>
              <th>Attachment</th>
              <th>Status</th>
              <th style={{ width: 200, textAlign: "right" }}>Action</th>
            </tr>
          </thead>

          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan="10" style={{ textAlign: "center", padding: 20 }}>
                  Loading...
                </td>
              </tr>
            ) : paged.length > 0 ? (
              paged.map((r) => (
                <tr key={r.requestId} className="hrla-row" onClick={() => setActive(r)}>
                  <td>
                    <input
                      type="checkbox"
                      checked={selected.has(r.requestId)}
                      onChange={() => toggle(r.requestId)}
                      onClick={(e) => e.stopPropagation()}
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

                  <td>
                    <div className="hrla-days">
                      <div className="hrla-days-main">{getDeductedDays(r)}</div>
                      <div className="hrla-days-sub">deducted</div>
                    </div>
                  </td>

                  <td>{r.reason || "-"}</td>

                  <td>
                    <span onClick={(e) => e.stopPropagation()}>{renderAttachment(r.attachmentUrl)}</span>
                  </td>

                  <td>
                    <span className="status pending">{r.status}</span>
                  </td>

                  <td style={{ textAlign: "right" }}>
                    <div style={{ display: "inline-flex", gap: 8 }} onClick={(e) => e.stopPropagation()}>
                      <button className="btn small outline" onClick={() => setActive(r)}>
                        Details
                      </button>
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
                <td colSpan="10" style={{ textAlign: "center", padding: 20 }}>
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

      {/* ✅ Detail Modal (Phase 2.3) */}
      {active && (
        <div className="hrla-modal-backdrop" onClick={() => setActive(null)}>
          <div className="hrla-modal" onClick={(e) => e.stopPropagation()}>
            <div className="hrla-modal-head">
              <div>
                <div className="hrla-modal-title">Leave Request Details</div>
                <div className="hrla-modal-sub">
                  {formatDate(active.startDate)} → {formatDate(active.endDate)}
                </div>
              </div>
              <button className="hrla-x" type="button" onClick={() => setActive(null)}>
                ✕
              </button>
            </div>

            <div className="hrla-modal-grid">
              <div className="hrla-block">
                <div className="hrla-kv">
                  <div className="hrla-k">Employee</div>
                  <div className="hrla-v">
                    {active.employee ? `${active.employee.firstName} ${active.employee.lastName || ""}` : `ID: ${active.employeeId}`}
                  </div>
                </div>
                <div className="hrla-kv">
                  <div className="hrla-k">Type</div>
                  <div className="hrla-v">{active.leaveType?.typeName || "Leave"}</div>
                </div>
                <div className="hrla-kv">
                  <div className="hrla-k">Days deducted</div>
                  <div className="hrla-v"><strong>{getDeductedDays(active)}</strong></div>
                </div>
                <div className="hrla-kv hrla-kv-full">
                  <div className="hrla-k">Reason</div>
                  <div className="hrla-v">{active.reason || "-"}</div>
                </div>

                <div className="hrla-modal-actions">
                  <button className="btn outline" type="button" onClick={() => setActive(null)}>
                    Close
                  </button>
                  <button className="btn outline" type="button" onClick={() => handleAction(active.requestId, "reject")}>
                    Reject
                  </button>
                  <button className="btn primary" type="button" onClick={() => handleAction(active.requestId, "approve")}>
                    Approve
                  </button>
                </div>
              </div>

              <div className="hrla-block">
                <div className="hrla-block-title">Attachment</div>
                {active.attachmentUrl ? (() => {
                  const meta = getAttachmentMeta(active.attachmentUrl);
                  return (
                    <>
                      <div className="hrla-attach-actions">
                        <a className="hrla-attach-btn" href={meta.href} target="_blank" rel="noreferrer">Open</a>
                        <a className="hrla-attach-btn" href={meta.href} download>Download</a>
                      </div>
                      <div className="hrla-preview">
                        {meta.kind === "image" ? (
                          <img src={meta.href} alt="Attachment preview" />
                        ) : meta.kind === "pdf" ? (
                          <iframe title="PDF preview" src={meta.href} />
                        ) : (
                          <div className="hrla-preview-empty">Preview not available for this file type.</div>
                        )}
                      </div>
                    </>
                  );
                })() : (
                  <div className="hrla-preview-empty">No attachment.</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
