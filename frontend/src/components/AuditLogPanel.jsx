import React, { useEffect, useMemo, useState } from "react";
import moment from "moment";
import { FiRefreshCw, FiSearch, FiShield, FiFilter } from "react-icons/fi";

import Pagination from "./Pagination";
import { getAuditLogs } from "../api/auditService";
import { alertError } from "../utils/sweetAlert";

// -----------------------
// 1) Mapping ให้คนอ่านง่าย
// -----------------------
const ACTION_LABELS = {
  // Leave
  LEAVE_REQUEST_CREATE: "ยื่นใบลา",
  LEAVE_REQUEST_CANCEL: "ยกเลิกใบลา",
  LEAVE_REQUEST_APPROVE: "อนุมัติใบลา",
  LEAVE_REQUEST_REJECT: "ไม่อนุมัติใบลา",
  LEAVE_REQUEST_DELETE: "ลบใบลา",

  // Attendance
  CHECKIN: "เช็คอินเข้างาน",
  CHECKIN_LATE: "เช็คอิน (มาสาย)",
  CHECKOUT: "เช็คเอาต์ออกงาน",

  // Leave Type / Policy / Quota / Holiday
  LEAVE_TYPE_CREATE: "สร้างประเภทการลา",
  LEAVE_TYPE_UPDATE: "แก้ไขประเภทการลา",
  LEAVE_TYPE_DELETE: "ลบประเภทการลา",

  QUOTA_CREATE: "ตั้งค่าโควต้า (สร้าง)",
  QUOTA_UPDATE: "ตั้งค่าโควต้า (แก้ไข)",
  EMPLOYEE_QUOTA_BULK_UPDATE: "ปรับโควต้า (รายบุคคล)",

  HOLIDAY_CREATE: "เพิ่มวันหยุด",
  HOLIDAY_DELETE: "ลบวันหยุด",

  ATTENDANCE_POLICY_UPDATE: "ปรับนโยบายเวลาเข้างาน",
  SYNC_DEFAULT_QUOTAS_ALL_EMPLOYEES: "ซิงค์โควต้าเริ่มต้นทั้งบริษัท",
  PROCESS_YEAR_END_CARRY_FORWARD: "ประมวลผลยกยอดโควต้าข้ามปี",

  // Employee
  EMPLOYEE_CREATE: "เพิ่มพนักงาน",
  EMPLOYEE_UPDATE_BY_HR: "แก้ไขข้อมูลพนักงาน",

  // Auth
  REGISTER: "สมัครบัญชี",
  LOGIN_SUCCESS: "เข้าสู่ระบบ",

  // Notification
  NOTIFICATION_MARK_READ: "อ่านแจ้งเตือน",
  NOTIFICATION_MARK_ALL_READ: "อ่านแจ้งเตือนทั้งหมด",
  NOTIFICATION_CLEAR_ALL: "ล้างแจ้งเตือนทั้งหมด",
  NOTIFICATION_DELETE_ONE: "ลบแจ้งเตือน",
};

const CATEGORY_BY_ACTION = (action = "") => {
  if (action.startsWith("LEAVE_")) return "Leave";
  if (action.startsWith("CHECK")) return "Attendance";
  if (action.includes("QUOTA")) return "Quota";
  if (action.includes("HOLIDAY")) return "Holiday";
  if (action.includes("POLICY")) return "Policy";
  if (action.startsWith("EMPLOYEE")) return "Employee";
  if (action.startsWith("NOTIFICATION")) return "Notification";
  if (action.startsWith("LOGIN") || action.startsWith("REGISTER")) return "Auth";
  if (action.startsWith("EXPORT")) return "Report";
  return "Other";
};

const CATEGORY_LABELS = {
  Leave: "การลา",
  Attendance: "ลงเวลา",
  Quota: "โควต้า",
  Holiday: "วันหยุด",
  Policy: "นโยบาย",
  Employee: "พนักงาน",
  Notification: "แจ้งเตือน",
  Auth: "บัญชี",
  Report: "รายงาน",
  Other: "อื่นๆ",
};

// -----------------------
// 2) Helper แปลง entityKey ให้เป็นคำอธิบาย
// -----------------------
const parseEntityText = (log) => {
  const entity = log?.entity || "";
  const key = log?.entityKey || "";

  // LeaveRequest:4
  if (entity === "LeaveRequest") {
    const m = key.match(/LeaveRequest:(\d+)/i);
    const id = m?.[1];
    return id ? `ใบลา #${id}` : "ใบลา";
  }

  // LeaveType:1
  if (entity === "LeaveType") {
    const m = key.match(/LeaveType:(\d+)/i);
    const id = m?.[1];
    // ถ้ามีชื่อใน newValue/oldValue ก็โชว์ด้วย
    const name = log?.newValue?.typeName || log?.oldValue?.typeName;
    return id ? `ประเภทการลา #${id}${name ? ` (${name})` : ""}` : "ประเภทการลา";
  }

  // Employee:1:WorkDate:2025-12-29
  if (entity === "TimeRecord") {
    const m = key.match(/Employee:(\d+):WorkDate:(\d{4}-\d{2}-\d{2})/i);
    const empId = m?.[1];
    const date = m?.[2];
    return `ลงเวลา${date ? ` (${moment(date).format("DD MMM YYYY")})` : ""}${empId ? ` • พนักงาน #${empId}` : ""}`;
  }

  if (entity === "Holiday") {
    const m = key.match(/Holiday:(\d+)/i);
    const id = m?.[1];
    const name = log?.newValue?.holidayName || log?.oldValue?.holidayName;
    const d = log?.newValue?.holidayDate || log?.oldValue?.holidayDate;
    const dateText = d ? moment(d).format("DD MMM YYYY") : "";
    return `วันหยุด${id ? ` #${id}` : ""}${name ? ` (${name})` : ""}${dateText ? ` • ${dateText}` : ""}`;
  }

  if (entity === "AttendancePolicy") return "นโยบายเวลาเข้างาน";

  if (entity === "LeaveQuota") {
    // Employee:12:Year:2025
    if (key.includes("Employee:") && key.includes("Year:")) {
      const m = key.match(/Employee:(\d+):Year:(\d{4})/i);
      return `โควต้าพนักงาน #${m?.[1] || ""} • ปี ${m?.[2] || ""}`.trim();
    }
    // Quota:xx
    const m = key.match(/Quota:(\d+)/i);
    return m?.[1] ? `รายการโควต้า #${m[1]}` : "โควต้า";
  }

  if (entity === "Employee") {
    const m = key.match(/Employee:(\d+)/i);
    const id = m?.[1];
    return id ? `พนักงาน #${id}` : "พนักงาน";
  }

  if (entity === "Notification") {
    const m = key.match(/Notification:(\d+)/i);
    const id = m?.[1];
    return id ? `แจ้งเตือน #${id}` : "แจ้งเตือน";
  }

  // fallback
  if (entity && key) return `${entity} • ${key}`;
  return entity || key || "-";
};

// สรุปสั้น ๆ สำหรับคนอ่าน
const buildSummary = (log) => {
  const action = log?.action || "";
  const label = ACTION_LABELS[action] || action;
  const target = parseEntityText(log);

  // เพิ่ม hint บางเคสให้อ่านง่าย
  if (action === "LEAVE_REQUEST_APPROVE") return `${label} → ${target}`;
  if (action === "LEAVE_REQUEST_REJECT") return `${label} → ${target}`;
  if (action === "CHECKIN_LATE") return `${label} → ${target}`;
  if (action === "LEAVE_REQUEST_CREATE") {
    const days = log?.newValue?.totalDaysRequested;
    return `${label} → ${target}${days ? ` • ${days} วัน` : ""}`;
  }
  return `${label} → ${target}`;
};

const badgeClass = (category) => {
  // ใช้ class ที่มีอยู่เดิม (badge-ok) แต่เพิ่มอีก 2-3 แบบเพื่อแยกสีได้ง่าย
  switch (category) {
    case "Leave":
      return "badge badge-ok";
    case "Attendance":
      return "badge badge-warn";
    case "Policy":
    case "Quota":
      return "badge badge-info";
    case "Employee":
      return "badge badge-dark";
    default:
      return "badge";
  }
};

export default function AuditLogPanel() {
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState([]);

  const [q, setQ] = useState("");
  const [category, setCategory] = useState("All");

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const fetchAudit = async () => {
    setLoading(true);
    try {
      const rows = await getAuditLogs();
      setLogs(Array.isArray(rows) ? rows : []);
    } catch (err) {
      console.error(err);
      alertError("Error", "Unable to load audit logs.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAudit();
  }, []);

  const normalized = useMemo(() => {
    return (logs || []).map((l) => {
      const cat = CATEGORY_BY_ACTION(l?.action || "");
      const user = l?.performer
        ? `${l.performer.firstName || ""} ${l.performer.lastName || ""}`.trim()
        : "-";

      return {
        ...l,
        __category: cat,
        __categoryLabel: CATEGORY_LABELS[cat] || cat,
        __actionLabel: ACTION_LABELS[l?.action] || l?.action || "-",
        __userLabel: user || "-",
        __targetLabel: parseEntityText(l),
        __summary: buildSummary(l),
      };
    });
  }, [logs]);

  const filtered = useMemo(() => {
    const kw = q.trim().toLowerCase();

    return normalized.filter((l) => {
      if (category !== "All" && l.__category !== category) return false;
      if (!kw) return true;

      const hay = [
        l.__summary,
        l.__actionLabel,
        l.__targetLabel,
        l.__userLabel,
        l?.ipAddress,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return hay.includes(kw);
    });
  }, [normalized, q, category]);

  useEffect(() => setPage(1), [q, category]);

  const paged = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page, pageSize]);

  const categories = useMemo(() => {
    const set = new Set(normalized.map((l) => l.__category));
    return ["All", ...Array.from(set)];
  }, [normalized]);

  return (
    <section className="dashboard-section audit-section">
      <div className="section-header reports-header" style={{ alignItems: "center" }}>
        <div>
          <h3 style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <FiShield /> Audit Log
          </h3>
          <p>ดูประวัติการกระทำสำคัญในระบบแบบเข้าใจง่าย (ใครทำอะไร กับอะไร เมื่อไหร่)</p>
        </div>

        <div className="reports-controls" style={{ alignItems: "center", gap: 14 }}>
          {/* Category filter */}
          <div className="input-group" style={{ minWidth: 180 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <FiFilter /> ประเภท
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: 10,
                border: "1px solid #e2e8f0",
                fontSize: 13,
                outline: "none",
                background: "white",
              }}
            >
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c === "All" ? "ทั้งหมด" : (CATEGORY_LABELS[c] || c)}
                </option>
              ))}
            </select>
          </div>

          {/* Search */}
          <div className="input-group" style={{ minWidth: 320 }}>
            <label>ค้นหา</label>
            <div className="audit-search">
              <FiSearch className="audit-search-icon" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="ค้นหา: ใบลา #, ชื่อผู้ใช้, ประเภท..."
              />
            </div>
          </div>

          <button className="btn outline small" onClick={fetchAudit} disabled={loading}>
            <FiRefreshCw className={loading ? "spin" : ""} /> Refresh
          </button>
        </div>
      </div>

      <div className="table-wrap" style={{ marginTop: 18 }}>
        <div className="table-header-title" style={{ fontSize: 16 }}>
          Latest Activity
        </div>

        <table className="table">
          <thead>
            <tr>
              <th style={{ width: 190 }}>เวลา</th>
              <th style={{ width: 160 }}>ผู้ใช้งาน</th>
              <th style={{ width: 120 }}>ประเภท</th>
              <th>รายละเอียด</th>
              <th style={{ width: 140 }}>IP</th>
            </tr>
          </thead>

          <tbody>
            {paged.length === 0 ? (
              <tr>
                <td colSpan="5" className="empty">
                  {loading ? "Loading..." : "No audit logs found."}
                </td>
              </tr>
            ) : (
              paged.map((l) => (
                <tr key={l.auditLogId}>
                  <td className="text-muted">
                    {l.createdAt ? moment(l.createdAt).format("DD MMM YYYY, HH:mm") : "-"}
                  </td>

                  <td className="fw-500">{l.__userLabel}</td>

                  <td>
                    <span className={badgeClass(l.__category)}>
                      {l.__categoryLabel}
                    </span>
                  </td>

                  <td>
                    <div style={{ fontWeight: 700 }}>{l.__actionLabel}</div>
                    <div className="text-muted" style={{ marginTop: 2 }}>
                      {l.__summary}
                    </div>
                  </td>

                  <td className="text-muted">
                    {l.ipAddress === "::1" ? "Localhost" : (l.ipAddress || "-")}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: 20, display: "flex", justifyContent: "flex-end" }}>
        <Pagination
          total={filtered.length}
          page={page}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
        />
      </div>
    </section>
  );
}
