// HRDashboard.jsx
import React, { useMemo, useState, useEffect } from "react";
import axios from "axios";
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

export default function HRDashboard() {
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

  // Modal
  const [leaveModalOpen, setLeaveModalOpen] = useState(false);
  const [leaveModalDate, setLeaveModalDate] = useState(toISODate(new Date()));
  const [leaveModalItems, setLeaveModalItems] = useState([]);

  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const getAuthHeader = () => {
    const token = localStorage.getItem("token");
    return { headers: { Authorization: `Bearer ${token}` } };
  };

  const weeks = useMemo(
    () => getMonthMatrix(viewYear, viewMonth),
    [viewYear, viewMonth]
  );

  // Fetch Month Leaves
  const fetchMonthLeaves = async () => {
    try {
      const startOfMonth = toISODate(new Date(viewYear, viewMonth, 1));
      const endOfMonth = toISODate(new Date(viewYear, viewMonth + 1, 0));

      const res = await axios.get(
        `http://localhost:8000/api/leave/admin/all?startDate=${startOfMonth}&endDate=${endOfMonth}`,
        getAuthHeader()
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

  // Fetch Daily Records
  const fetchDailyRecords = async () => {
    setLoading(true);
    try {
      const [attRes, leaveRes] = await Promise.all([
        axios.get(
          `http://localhost:8000/api/timerecord/all?startDate=${selectedDate}&endDate=${selectedDate}`,
          getAuthHeader()
        ),
        axios.get(
          `http://localhost:8000/api/leave/admin/all?startDate=${selectedDate}&endDate=${selectedDate}`,
          getAuthHeader()
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

  // Fetch Chart Data
  const fetchChartData = async () => {
    try {
      const res = await axios.get(
        "http://localhost:8000/api/timerecord/stats/late-monthly",
        getAuthHeader()
      );
      setChartData(res.data.data || []);
    } catch (err) {
      console.error("Fetch Stats Error:", err);
    }
  };

  // Export CSV
  const handleExport = () => {
    if (!window.confirm("Download attendance report as CSV?")) return;

    axios
      .get("http://localhost:8000/api/timerecord/export", {
        ...getAuthHeader(),
        responseType: "blob",
      })
      .then((response) => {
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
      })
      .catch((err) => {
        console.error(err);
        alert("Export failed!");
      });
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

  // Prepare Table Data
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

  return (
    <div className="page-card hr-dashboard">
      {/* Header */}
      <header className="hr-header">
        <div>
          <h1 className="hr-title">HR Overview</h1>
          <p className="hr-subtitle">Manage attendance and monitor leaves</p>
        </div>
        <div className="hr-header-right">
          <div className="pill date-pill">
            Selected: {moment(selectedDate).format("DD MMM YYYY")}
          </div>
        </div>
      </header>

      {/* Calendar */}
      <section className="dashboard-section calendar-section">
        <div className="calendar-top">
          {/* ✅ ปุ่ม + เดือน อยู่บรรทัดเดียวกัน */}
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
            <button
              className="btn outline small"
              onClick={() => setSelectedDate(todayStr)}
            >
              Go to Today
            </button>

            {todayLeavesCount > 0 && (
              <button
                className="btn primary small"
                onClick={() => openLeaveModal(todayStr)}
              >
                Today's Leaves ({todayLeavesCount})
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
                        {hiddenCount > 0 && (
                          <span className="more-badge">+{hiddenCount}</span>
                        )}
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
                            className={`leave-pill ${leaveTypeClass(
                              x.typeName
                            )}`}
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
        <div
          className="summary-group"
          style={{ display: "flex", flexDirection: "column", gap: "10px" }}
        >
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
            <div
              style={{
                fontSize: "1.8rem",
                fontWeight: "bold",
                color: "#15803d",
              }}
            >
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
            <div
              style={{
                fontSize: "1.8rem",
                fontWeight: "bold",
                color: "#1d4ed8",
              }}
            >
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
            <span style={{ color: "#991b1b", fontWeight: 600 }}>
              Late Arrival
            </span>
            <div
              style={{
                fontSize: "1.8rem",
                fontWeight: "bold",
                color: "#b91c1c",
              }}
            >
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
              📉 Monthly Late Statistics
            </h3>

            <button
              className="btn outline small"
              onClick={handleExport}
              style={{
                borderColor: "#10b981",
                color: "#10b981",
                display: "flex",
                alignItems: "center",
                gap: "5px",
                padding: "4px 8px",
                fontSize: "0.85rem",
              }}
            >
              📥 Export CSV
            </button>
          </div>

          <div style={{ width: "100%", height: 250 }}>
            <ResponsiveContainer>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="day"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: "#6b7280" }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: "#6b7280" }}
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: "8px",
                    border: "none",
                    boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                  }}
                  cursor={{ fill: "transparent" }}
                />
                <Bar
                  dataKey="count"
                  fill="#ef4444"
                  radius={[4, 4, 0, 0]}
                  name="Late (Person)"
                  barSize={30}
                />
              </BarChart>
            </ResponsiveContainer>

            {chartData.length === 0 && (
              <p
                style={{
                  textAlign: "center",
                  color: "#9ca3af",
                  marginTop: "20px",
                }}
              >
                No late records this month 🎉
              </p>
            )}
          </div>
        </div>
      </section>

      {/* Table */}
      <section className="dashboard-section details-section">
        <div className="section-header">
          <h3>Employee List</h3>
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

        <div
          className="pagination-wrapper"
          style={{ marginTop: "20px", display: "flex", justifyContent: "flex-end" }}
        >
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
        <div
          className="leave-modal-backdrop"
          onClick={() => setLeaveModalOpen(false)}
        >
          <div className="leave-modal" onClick={(e) => e.stopPropagation()}>
            <header className="leave-modal-head">
              <h3>Leave List</h3>
              <span className="modal-date">
                {moment(leaveModalDate).format("LL")}
              </span>
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
                    <span className={`leave-type ${leaveTypeClass(x.typeName)}`}>
                      {x.typeName}
                    </span>
                  </div>
                ))
              )}
            </div>

            <div className="leave-modal-actions">
              <button
                className="btn outline"
                onClick={() => setLeaveModalOpen(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
