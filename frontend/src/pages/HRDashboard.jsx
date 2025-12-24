import React, { useMemo, useState, useEffect } from "react";
import moment from "moment";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import "./HRDashboard.css";
import Pagination from "../components/Pagination";
import axiosClient from "../api/axiosClient";
import { alertConfirm, alertError, alertInfo } from "../utils/sweetAlert";

/* ===== Helpers ===== */
const pad2 = (n) => String(n).padStart(2, "0");
const toISODate = (d) =>
  `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

function getMonthMatrix(year, monthIndex) {
  const first = new Date(year, monthIndex, 1);
  const startDay = first.getDay(); // 0 = Sun
  const start = new Date(year, monthIndex, 1 - startDay);

  const weeks = [];
  for (let w = 0; w < 6; w++) {
    const week = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + w * 7 + i);
      week.push(d);
    }
    weeks.push(week);
  }
  return weeks;
}

const leaveTypeClass = (typeName = "") => {
  const t = String(typeName || "").toLowerCase();
  if (t.includes("sick")) return "leave-badge sick";
  if (t.includes("personal")) return "leave-badge personal";
  if (t.includes("vacation")) return "leave-badge vacation";
  if (t.includes("paid")) return "leave-badge paid";
  return "leave-badge";
};

// safe call: if endpoint not found, return null
async function safeGet(path, config) {
  try {
    const res = await axiosClient.get(path, config);
    return res.data;
  } catch (err) {
    // ignore 404 for optional features
    if (err?.response?.status === 404) return null;
    throw err;
  }
}

export default function HRDashboard() {
  const [tab, setTab] = useState("overview"); // overview | reports | audit

  const [viewYear, setViewYear] = useState(new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState(new Date().getMonth());
  const [selectedDate, setSelectedDate] = useState(toISODate(new Date()));

  // Data
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [monthLeaveMap, setMonthLeaveMap] = useState({});
  const [loading, setLoading] = useState(false);

  // Chart
  const [chartData, setChartData] = useState([]);

  // Reports (Phase 2)
  const [rangeStart, setRangeStart] = useState(toISODate(new Date(viewYear, viewMonth, 1)));
  const [rangeEnd, setRangeEnd] = useState(toISODate(new Date(viewYear, viewMonth + 1, 0)));
  const [reportSummary, setReportSummary] = useState({
    present: 0,
    leave: 0,
    late: 0,
    total: 0,
    lateRate: 0,
  });
  const [topLate, setTopLate] = useState([]);

  // Phase 3 (UI only) Audit Log
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditItems, setAuditItems] = useState([]);
  const [auditQuery, setAuditQuery] = useState("");

  // Modal
  const [leaveModalOpen, setLeaveModalOpen] = useState(false);
  const [leaveModalDate, setLeaveModalDate] = useState(toISODate(new Date()));
  const [leaveModalItems, setLeaveModalItems] = useState([]);

  // Pagination (table)
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const weeks = useMemo(
    () => getMonthMatrix(viewYear, viewMonth),
    [viewYear, viewMonth]
  );

  // Fetch Month Leaves (Approved only) for calendar badges
  const fetchMonthLeaves = async () => {
    try {
      const startOfMonth = toISODate(new Date(viewYear, viewMonth, 1));
      const endOfMonth = toISODate(new Date(viewYear, viewMonth + 1, 0));

      const res = await axiosClient.get(
        `/leave/admin/all?startDate=${startOfMonth}&endDate=${endOfMonth}`
      );

      const approvedLeaves =
        res.data.requests?.filter((r) => r.status === "Approved") || [];
      const mapping = {};

      approvedLeaves.forEach((leave) => {
        let current = moment(leave.startDate).startOf("day");
        const end = moment(leave.endDate).startOf("day");

        while (current.isSameOrBefore(end, "day")) {
          const dateStr = current.format("YYYY-MM-DD");
          if (!mapping[dateStr]) mapping[dateStr] = [];

          mapping[dateStr].push({
            name: `${leave.employee.firstName} ${leave.employee.lastName}`,
            typeName: leave.leaveType?.typeName || "Leave",
          });

          current.add(1, "day");
        }
      });

      setMonthLeaveMap(mapping);
    } catch (err) {
      console.error("Fetch Month Leaves Error:", err);
    }
  };

  // Fetch Daily Records (Attendance + Approved Leaves)
  const fetchDailyRecords = async () => {
    setLoading(true);
    try {
      const [attRes, leaveRes] = await Promise.all([
        axiosClient.get(
          `/timerecord/all?startDate=${selectedDate}&endDate=${selectedDate}`
        ),
        axiosClient.get(
          `/leave/admin/all?startDate=${selectedDate}&endDate=${selectedDate}`
        ),
      ]);

      setAttendanceRecords(attRes.data.records || []);
      setLeaveRequests(
        leaveRes.data.requests?.filter((r) => r.status === "Approved") || []
      );
    } catch (err) {
      console.error("Fetch Daily Data Error:", err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch Chart Data (late monthly)
  const fetchChartData = async () => {
    try {
      const res = await axiosClient.get("/timerecord/stats/late-monthly");
      setChartData(res.data.data || []);
    } catch (err) {
      console.error("Fetch Stats Error:", err);
    }
  };

  // Phase 2: Reports summary & top late
  const fetchReport = async () => {
    try {
      setLoading(true);

      // 1) attendance records for range
      const att = await axiosClient.get(
        `/timerecord/all?startDate=${rangeStart}&endDate=${rangeEnd}`
      );

      // 2) approved leaves for range
      const lv = await axiosClient.get(
        `/leave/admin/all?startDate=${rangeStart}&endDate=${rangeEnd}`
      );

      const records = att.data.records || [];
      const leaves = (lv.data.requests || []).filter((r) => r.status === "Approved");

      const late = records.filter((r) => r.isLate).length;

      const total = records.length + leaves.length;
      const lateRate = records.length > 0 ? Math.round((late / records.length) * 100) : 0;

      setReportSummary({
        present: records.length,
        leave: leaves.length,
        late,
        total,
        lateRate,
      });

      // Optional endpoint (if backend has it)
      // Expect: [{ employeeId, name, lateCount }]
      const month = moment(rangeStart).format("YYYY-MM");
      const top = await safeGet(`/timerecord/stats/late-top?month=${month}`);
      if (top?.data) setTopLate(top.data);
      else if (Array.isArray(top)) setTopLate(top);
      else {
        // fallback compute from fetched records
        const map = new Map();
        records.forEach((r) => {
          if (!r.isLate) return;
          const id = r.employee?.employeeId || r.employeeId;
          const name = r.employee
            ? `${r.employee.firstName} ${r.employee.lastName}`
            : `ID: ${id}`;
          map.set(id, { employeeId: id, name, lateCount: (map.get(id)?.lateCount || 0) + 1 });
        });
        const arr = Array.from(map.values()).sort((a, b) => b.lateCount - a.lateCount).slice(0, 5);
        setTopLate(arr);
      }
    } catch (err) {
      console.error(err);
      await alertError("Error", err?.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  // Export CSV (attendance)
  const handleExport = async () => {
    const ok = await alertConfirm(
      "Export Attendance",
      "Download attendance report as CSV?",
      "Export"
    );
    if (!ok) return;

    try {
      const response = await axiosClient.get("/timerecord/export", {
        responseType: "blob",
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        `attendance_report_${moment().format("YYYY-MM-DD")}.csv`
      );
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error(err);
      await alertError("Export failed", "Unable to export CSV.");
    }
  };

  // Phase 3: Audit log UI (optional endpoint)
  const fetchAudit = async () => {
    try {
      setAuditLoading(true);
      const q = auditQuery.trim();
      const data = await safeGet(`/audit?query=${encodeURIComponent(q)}`);
      if (!data) {
        // No endpoint yet — show placeholder item
        setAuditItems([
          {
            id: "placeholder",
            time: new Date().toISOString(),
            actor: "System",
            action: "Audit endpoint not found",
            detail:
              "Backend endpoint `/api/audit` is not implemented yet. UI is ready.",
          },
        ]);
        return;
      }
      const items = data.items || data.logs || data.data || [];
      setAuditItems(items);
    } catch (err) {
      console.error(err);
      await alertError("Error", err?.response?.data?.message || err.message);
    } finally {
      setAuditLoading(false);
    }
  };

  useEffect(() => {
    fetchMonthLeaves();
    fetchChartData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewYear, viewMonth]);

  useEffect(() => {
    fetchDailyRecords();
    setPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate]);

  // Prepare Table Data (daily)
  const dayRecords = useMemo(() => {
    const att = attendanceRecords.map((r) => ({
      id: `att-${r.recordId}`,
      name: `${r.employee.firstName} ${r.employee.lastName}`,
      role: r.employee.role,
      checkIn: r.checkInTime ? moment(r.checkInTime).format("HH:mm") : "-",
      checkOut: r.checkOutTime ? moment(r.checkOutTime).format("HH:mm") : "-",
      status: r.isLate ? "Late" : "On Time",
    }));

    const leave = leaveRequests.map((l) => ({
      id: `leave-${l.requestId}`,
      name: `${l.employee.firstName} ${l.employee.lastName}`,
      role: l.employee.role,
      checkIn: "-",
      checkOut: "-",
      status: `Leave (${l.leaveType.typeName})`,
    }));

    return [...att, ...leave];
  }, [attendanceRecords, leaveRequests]);

  const daySummary = useMemo(
    () => ({
      totalPresent: attendanceRecords.length,
      totalLeave: leaveRequests.length,
      totalLate: attendanceRecords.filter((r) => r.isLate).length,
    }),
    [attendanceRecords, leaveRequests]
  );

  const goPrevMonth = () => {
    const m = viewMonth - 1;
    if (m < 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else setViewMonth(m);
  };

  const goNextMonth = () => {
    const m = viewMonth + 1;
    if (m > 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else setViewMonth(m);
  };

  const monthName = new Date(viewYear, viewMonth, 1).toLocaleString("en-US", {
    month: "long",
  });

  const openLeaveModal = (dateStr) => {
    const items = monthLeaveMap[dateStr] || [];
    setLeaveModalDate(dateStr);
    setLeaveModalItems(items);
    setLeaveModalOpen(true);
  };

  const todayStr = toISODate(new Date());
  const todayLeavesCount = (monthLeaveMap[todayStr] || []).length;

  const totalDay = dayRecords.length;
  const startIdx = (page - 1) * pageSize;
  const pagedDayRecords = useMemo(
    () => dayRecords.slice(startIdx, startIdx + pageSize),
    [dayRecords, startIdx, pageSize]
  );

  useEffect(() => {
    // keep report range in sync when switching month (nice UX)
    setRangeStart(toISODate(new Date(viewYear, viewMonth, 1)));
    setRangeEnd(toISODate(new Date(viewYear, viewMonth + 1, 0)));
  }, [viewYear, viewMonth]);

  return (
    <div className="page-card hr-dashboard">
      {/* Header */}
      <header className="hr-header">
        <div>
          <h1 className="hr-title">HR Dashboard</h1>
          <p className="hr-subtitle">Manage attendance, leaves, and reports</p>
        </div>

        <div className="hr-header-right">
          <div className="pill date-pill">
            Selected: {moment(selectedDate).format("DD MMM YYYY")}
          </div>
        </div>
      </header>

      {/* Tabs (Phase 1–3) */}
      <div className="hr-tabs" style={{ display: "flex", gap: 8, margin: "10px 0 16px" }}>
        <button
          className={`btn small ${tab === "overview" ? "primary" : "outline"}`}
          onClick={() => setTab("overview")}
        >
          Overview
        </button>
        <button
          className={`btn small ${tab === "reports" ? "primary" : "outline"}`}
          onClick={() => setTab("reports")}
        >
          Reports
        </button>
        <button
          className={`btn small ${tab === "audit" ? "primary" : "outline"}`}
          onClick={() => setTab("audit")}
          title="Audit Log (UI ready, backend optional)"
        >
          Audit Log
        </button>
      </div>

      {/* ===========================
          TAB: OVERVIEW (Phase 1)
         =========================== */}
      {tab === "overview" && (
        <>
          {/* Calendar */}
          <section className="dashboard-section calendar-section">
            <div className="calendar-top">
              {/* month nav in one line */}
              <div className="calendar-title-group">
                <button className="nav-btn" onClick={goPrevMonth} aria-label="Prev">
                  ‹
                </button>
                <h2 className="month-label">
                  {monthName} {viewYear}
                </h2>
                <button className="nav-btn" onClick={goNextMonth} aria-label="Next">
                  ›
                </button>
              </div>

              <div className="calendar-actions">
                <button className="btn outline small" onClick={() => setSelectedDate(todayStr)}>
                  Go to Today
                </button>

                {todayLeavesCount > 0 && (
                  <button className="btn primary small" onClick={() => openLeaveModal(todayStr)}>
                    Today’s Leaves ({todayLeavesCount})
                  </button>
                )}
              </div>
            </div>

            <div className="calendar">
              <div className="calendar-head">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                  <div className="cal-cell head" key={d}>
                    {d}
                  </div>
                ))}
              </div>

              <div className="calendar-body">
                {weeks.map((week, wIdx) => (
                  <React.Fragment key={wIdx}>
                    {week.map((d) => {
                      const iso = toISODate(d);
                      const inMonth = d.getMonth() === viewMonth;

                      const leaves = monthLeaveMap[iso] || [];
                      const visible = leaves.slice(0, 2);
                      const hiddenCount = Math.max(0, leaves.length - 2);

                      return (
                        <div
                          key={iso}
                          className={`cal-cell ${!inMonth ? "muted" : ""} ${
                            iso === selectedDate ? "selected" : ""
                          }`}
                          onClick={() => setSelectedDate(iso)}
                        >
                          <div className="cal-date-row">
                            <span className="cal-date">{d.getDate()}</span>
                            {hiddenCount > 0 && <span className="more-badge">+{hiddenCount}</span>}
                          </div>

                          <div
                            className="cal-leave-list"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedDate(iso);
                              openLeaveModal(iso);
                            }}
                          >
                            {visible.map((x, i) => (
                              <div
                                key={i}
                                className={`leave-pill ${leaveTypeClass(x.typeName)}`}
                                title={x.name}
                              >
                                {x.name}
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </React.Fragment>
                ))}
              </div>
            </div>
          </section>

          {/* Analytics */}
          <section
            className="dashboard-section analytics-section"
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 2fr",
              gap: "20px",
              marginBottom: "20px",
            }}
          >
            <div className="summary-group" style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <h3 style={{ margin: "0 0 10px", fontSize: "1.1rem" }}>
                Daily Summary ({moment(selectedDate).format("DD MMM")})
              </h3>

              <div
                className="summary-card-item"
                style={{
                  background: "#f0fdf4",
                  padding: "15px",
                  borderRadius: "8px",
                  borderLeft: "4px solid #22c55e",
                }}
              >
                <span style={{ color: "#166534", fontWeight: 600 }}>Present</span>
                <div style={{ fontSize: "1.8rem", fontWeight: "bold", color: "#15803d" }}>
                  {daySummary.totalPresent}
                </div>
              </div>

              <div
                className="summary-card-item"
                style={{
                  background: "#eff6ff",
                  padding: "15px",
                  borderRadius: "8px",
                  borderLeft: "4px solid #3b82f6",
                }}
              >
                <span style={{ color: "#1e40af", fontWeight: 600 }}>On Leave</span>
                <div style={{ fontSize: "1.8rem", fontWeight: "bold", color: "#1d4ed8" }}>
                  {daySummary.totalLeave}
                </div>
              </div>

              <div
                className="summary-card-item"
                style={{
                  background: "#fef2f2",
                  padding: "15px",
                  borderRadius: "8px",
                  borderLeft: "4px solid #ef4444",
                }}
              >
                <span style={{ color: "#991b1b", fontWeight: 600 }}>Late Arrival</span>
                <div style={{ fontSize: "1.8rem", fontWeight: "bold", color: "#b91c1c" }}>
                  {daySummary.totalLate}
                </div>
              </div>
            </div>

            <div
              className="chart-container"
              style={{
                background: "#fff",
                border: "1px solid #e5e7eb",
                borderRadius: "8px",
                padding: "15px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "15px",
                }}
              >
                <h3 style={{ margin: 0, fontSize: "1.1rem", color: "#374151" }}>
                  Monthly Late Statistics
                </h3>

                <button className="btn outline small" onClick={handleExport}>
                  Export CSV
                </button>
              </div>

              <div style={{ width: "100%", height: 250 }}>
                <ResponsiveContainer>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="day" axisLine={false} tickLine={false} />
                    <YAxis axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{
                        borderRadius: "8px",
                        border: "none",
                        boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                      }}
                      cursor={{ fill: "transparent" }}
                    />
                    <Bar dataKey="count" fill="#ef4444" radius={[4, 4, 0, 0]} name="Late" barSize={30} />
                  </BarChart>
                </ResponsiveContainer>

                {chartData.length === 0 && (
                  <p style={{ textAlign: "center", color: "#9ca3af", marginTop: "20px" }}>
                    No late records this month 🎉
                  </p>
                )}
              </div>
            </div>
          </section>

          {/* Table */}
          <section className="dashboard-section details-section">
            <div className="section-header" style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
              <h3 style={{ margin: 0 }}>Daily Employee Records</h3>
              <div style={{ display: "flex", gap: 8 }}>
                <button className="btn outline small" onClick={fetchDailyRecords} disabled={loading}>
                  Refresh
                </button>
              </div>
            </div>

            <div className="table-wrap">
              {loading ? (
                <div className="loading-box">Loading data...</div>
              ) : (
                <table className="table">
                  <thead>
                    <tr>
                      <th>Employee</th>
                      <th>Role</th>
                      <th>Time In</th>
                      <th>Time Out</th>
                      <th>Status</th>
                    </tr>
                  </thead>

                  <tbody>
                    {dayRecords.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="empty">
                          No records found for this date.
                        </td>
                      </tr>
                    ) : (
                      pagedDayRecords.map((r) => (
                        <tr key={r.id}>
                          <td className="fw-500">{r.name}</td>
                          <td className="text-muted">{r.role}</td>
                          <td>{r.checkIn}</td>
                          <td>{r.checkOut}</td>
                          <td>
                            <span
                              className={`status-dot ${
                                r.status.includes("Leave")
                                  ? "dot-blue"
                                  : r.status === "Late"
                                  ? "dot-red"
                                  : "dot-green"
                              }`}
                            />
                            <span
                              className={`badge ${
                                r.status.includes("Leave")
                                  ? "badge-leave"
                                  : r.status === "Late"
                                  ? "badge-late"
                                  : "badge-ok"
                              }`}
                            >
                              {r.status}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              )}
            </div>

            <div className="pagination-wrapper" style={{ marginTop: 20, display: "flex", justifyContent: "flex-end" }}>
              <Pagination
                total={totalDay}
                page={page}
                pageSize={pageSize}
                onPageChange={setPage}
                onPageSizeChange={setPageSize}
              />
            </div>
          </section>

          {/* Leave Modal */}
          {leaveModalOpen && (
            <div className="leave-modal-backdrop" onClick={() => setLeaveModalOpen(false)}>
              <div className="leave-modal" onClick={(e) => e.stopPropagation()}>
                <header className="leave-modal-head">
                  <h3>Leave List</h3>
                  <span className="modal-date">{moment(leaveModalDate).format("LL")}</span>
                  <button className="x-btn" onClick={() => setLeaveModalOpen(false)}>
                    ×
                  </button>
                </header>

                <div className="leave-modal-list">
                  {leaveModalItems.length === 0 ? (
                    <p className="text-center text-muted">No leaves on this day.</p>
                  ) : (
                    leaveModalItems.map((x, i) => (
                      <div key={i} className="leave-modal-row">
                        <span className="leave-modal-name">{x.name}</span>
                        <span className={`leave-type ${leaveTypeClass(x.typeName)}`}>{x.typeName}</span>
                      </div>
                    ))
                  )}
                </div>

                <div className="leave-modal-actions">
                  <button className="btn outline" onClick={() => setLeaveModalOpen(false)}>
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* ===========================
          TAB: REPORTS (Phase 2)
         =========================== */}
      {tab === "reports" && (
        <section className="dashboard-section">
          <div
            className="section-header"
            style={{ display: "flex", justifyContent: "space-between", alignItems: "end", gap: 12, flexWrap: "wrap" }}
          >
            <div>
              <h3 style={{ margin: 0 }}>HR Reports</h3>
              <p style={{ marginTop: 6, color: "#4b5563" }}>
                Attendance & leave summary with late ranking (company overview)
              </p>
            </div>

            <div style={{ display: "flex", gap: 8, alignItems: "end", flexWrap: "wrap" }}>
              <label style={{ fontSize: 12 }}>
                Start
                <input
                  type="date"
                  value={rangeStart}
                  onChange={(e) => setRangeStart(e.target.value)}
                  style={{ display: "block" }}
                />
              </label>
              <label style={{ fontSize: 12 }}>
                End
                <input
                  type="date"
                  value={rangeEnd}
                  onChange={(e) => setRangeEnd(e.target.value)}
                  min={rangeStart}
                  style={{ display: "block" }}
                />
              </label>

              <button className="btn primary small" onClick={fetchReport} disabled={loading}>
                Run Report
              </button>

              <button className="btn outline small" onClick={handleExport}>
                Export CSV
              </button>
            </div>
          </div>

          {/* Summary cards */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
              gap: 10,
              marginTop: 14,
            }}
          >
            <Card title="Present" value={reportSummary.present} tone="green" />
            <Card title="On Leave" value={reportSummary.leave} tone="blue" />
            <Card title="Late" value={reportSummary.late} tone="red" />
            <Card title="Total Items" value={reportSummary.total} tone="gray" />
            <Card title="Late Rate" value={`${reportSummary.lateRate}%`} tone="amber" />
          </div>

          {/* Top late */}
          <div style={{ marginTop: 16, display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 12 }}>
            <div className="table-wrap" style={{ margin: 0 }}>
              <div style={{ padding: "10px 12px", borderBottom: "1px solid #eef2f7", fontWeight: 700 }}>
                Top Late Employees
              </div>
              <table className="table">
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th style={{ width: 120, textAlign: "right" }}>Late Count</th>
                  </tr>
                </thead>
                <tbody>
                  {topLate.length === 0 ? (
                    <tr>
                      <td colSpan={2} className="empty">
                        Run report to calculate ranking.
                      </td>
                    </tr>
                  ) : (
                    topLate.map((x) => (
                      <tr key={x.employeeId || x.id || x.name}>
                        <td className="fw-500">{x.name || x.fullName || `ID: ${x.employeeId}`}</td>
                        <td style={{ textAlign: "right" }}>
                          <span className="badge badge-late">{x.lateCount ?? x.count ?? 0}</span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div
              style={{
                border: "1px solid #e5e7eb",
                borderRadius: 10,
                background: "#fff",
                padding: 12,
              }}
            >
              <div style={{ fontWeight: 700, marginBottom: 6 }}>Notes</div>
              <ul style={{ margin: 0, paddingLeft: 18, color: "#4b5563", fontSize: 13, lineHeight: 1.7 }}>
                <li>Late rate is calculated from attendance records only.</li>
                <li>Leave items are counted separately (approved only).</li>
                <li>
                  If backend endpoint <code>/timerecord/stats/late-top</code> does not exist, ranking is computed on the
                  client.
                </li>
              </ul>
            </div>
          </div>
        </section>
      )}

      {/* ===========================
          TAB: AUDIT LOG (Phase 3 UI)
         =========================== */}
      {tab === "audit" && (
        <section className="dashboard-section">
          <div
            className="section-header"
            style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}
          >
            <div>
              <h3 style={{ margin: 0 }}>Audit Log</h3>
              <p style={{ marginTop: 6, color: "#4b5563" }}>
                Track HR actions (approve/reject, quota changes, employee edits)
              </p>
            </div>

            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input
                value={auditQuery}
                onChange={(e) => setAuditQuery(e.target.value)}
                placeholder="Search action / employee / id..."
                style={{
                  padding: "8px 10px",
                  borderRadius: 10,
                  border: "1px solid #e5e7eb",
                  minWidth: 260,
                }}
              />
              <button className="btn primary small" onClick={fetchAudit} disabled={auditLoading}>
                Search
              </button>
              <button
                className="btn outline small"
                onClick={() => {
                  setAuditQuery("");
                  setAuditItems([]);
                }}
              >
                Clear
              </button>
            </div>
          </div>

          <div className="table-wrap" style={{ marginTop: 12 }}>
            <table className="table">
              <thead>
                <tr>
                  <th style={{ width: 180 }}>Time</th>
                  <th style={{ width: 180 }}>Actor</th>
                  <th style={{ width: 220 }}>Action</th>
                  <th>Detail</th>
                </tr>
              </thead>
              <tbody>
                {auditLoading ? (
                  <tr>
                    <td colSpan={4} style={{ textAlign: "center", padding: 20 }}>
                      Loading...
                    </td>
                  </tr>
                ) : auditItems.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="empty">
                      No audit data. (If backend doesn’t have audit endpoint yet, this is expected.)
                    </td>
                  </tr>
                ) : (
                  auditItems.map((x, idx) => (
                    <tr key={x.id || idx}>
                      <td className="text-muted">{moment(x.time || x.createdAt).format("DD MMM YYYY HH:mm")}</td>
                      <td className="fw-500">{x.actor || x.actorName || "-"}</td>
                      <td>{x.action || x.type || "-"}</td>
                      <td className="text-muted">{x.detail || x.message || "-"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div style={{ marginTop: 10 }}>
            <button
              className="btn outline small"
              onClick={async () => {
                await alertInfo(
                  "Backend Note",
                  "To enable Audit Log, create endpoint `/api/audit` that returns logs. UI is already ready."
                );
              }}
            >
              How to enable?
            </button>
          </div>
        </section>
      )}
    </div>
  );
}

/* lightweight card (avoid new component file) */
function Card({ title, value, tone = "gray" }) {
  const palette = {
    green: { bg: "#f0fdf4", border: "#22c55e", fg: "#166534" },
    blue: { bg: "#eff6ff", border: "#3b82f6", fg: "#1e40af" },
    red: { bg: "#fef2f2", border: "#ef4444", fg: "#991b1b" },
    amber: { bg: "#fffbeb", border: "#f59e0b", fg: "#92400e" },
    gray: { bg: "#f8fafc", border: "#e2e8f0", fg: "#334155" },
  }[tone];

  return (
    <div
      style={{
        background: palette.bg,
        border: `1px solid ${palette.border}33`,
        borderLeft: `4px solid ${palette.border}`,
        borderRadius: 12,
        padding: 12,
      }}
    >
      <div style={{ color: palette.fg, fontWeight: 700, fontSize: 12, letterSpacing: 0.3 }}>{title}</div>
      <div style={{ color: palette.fg, fontWeight: 900, fontSize: 22, marginTop: 4 }}>{value}</div>
    </div>
  );
}
