import React, { useMemo, useState, useEffect } from "react";
import axios from "axios"; // หรือ import axiosClient จากไฟล์ config ของคุณ
import moment from "moment";
import "./HRDashboard.css";

/* ===== Helpers ===== */
const pad2 = (n) => String(n).padStart(2, "0");
const toISODate = (d) =>
  `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

function getMonthMatrix(year, monthIndex) {
  const first = new Date(year, monthIndex, 1);
  const startDay = first.getDay();
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

export default function HRDashboard() {
  const [viewYear, setViewYear] = useState(new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState(new Date().getMonth());
  const [selectedDate, setSelectedDate] = useState(toISODate(new Date()));
  
  // States สำหรับข้อมูลจาก DB
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [loading, setLoading] = useState(false);

  const getAuthHeader = () => {
    const token = localStorage.getItem("token");
    return { headers: { Authorization: `Bearer ${token}` } };
  };

  const weeks = useMemo(
    () => getMonthMatrix(viewYear, viewMonth),
    [viewYear, viewMonth]
  );

  // --- 🔥 ฟังก์ชันดึงข้อมูลจาก Database ---
  const fetchDailyRecords = async () => {
    setLoading(true);
    try {
      // 1. ดึงข้อมูล Attendance ทั้งหมดของวันที่เลือก
      const attRes = await axios.get(
        `http://localhost:8000/api/timerecord/all?startDate=${selectedDate}&endDate=${selectedDate}`,
        getAuthHeader()
      );
      
      // 2. ดึงข้อมูลการลาที่อนุมัติแล้ว (Approved) ของวันที่เลือก
      const leaveRes = await axios.get(
        `http://localhost:8000/api/leave/admin/all?startDate=${selectedDate}&endDate=${selectedDate}`,
        getAuthHeader()
      );

      setAttendanceRecords(attRes.data.records || []);
      // กรองเอาเฉพาะรายการลาที่สถานะเป็น Approved เท่านั้นมาแสดงใน Dashboard
      setLeaveRequests(leaveRes.data.requests?.filter(r => r.status === 'Approved') || []);
    } catch (err) {
      console.error("Fetch HR Data Error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDailyRecords();
  }, [selectedDate]);

  // --- 📊 ประมวลผลข้อมูลเพื่อแสดงในตาราง (Merge Attendance & Leave) ---
  const dayRecords = useMemo(() => {
    // แปลงข้อมูล Attendance ให้เข้ากับ format ตาราง
    const attendanceMapped = attendanceRecords.map(r => ({
      id: `att-${r.recordId}`,
      name: `${r.employee.firstName} ${r.employee.lastName}`,
      role: r.employee.role,
      checkIn: r.checkInTime ? moment(r.checkInTime).format("HH:mm") : "-",
      checkOut: r.checkOutTime ? moment(r.checkOutTime).format("HH:mm") : "-",
      status: r.isLate ? "Late" : "On Time",
      note: "-"
    }));

    // แปลงข้อมูล Leave ให้เข้ากับ format ตาราง
    const leaveMapped = leaveRequests.map(l => ({
      id: `leave-${l.requestId}`,
      name: `${l.employee.firstName} ${l.employee.lastName}`,
      role: l.employee.role,
      checkIn: "-",
      checkOut: "-",
      status: `Leave (${l.leaveType.typeName})`,
      note: l.reason || "-"
    }));

    return [...attendanceMapped, ...leaveMapped];
  }, [attendanceRecords, leaveRequests]);

  const daySummary = useMemo(() => {
    return {
      totalPresent: attendanceRecords.length,
      totalLeave: leaveRequests.length,
      totalLate: attendanceRecords.filter((r) => r.isLate).length,
    };
  }, [attendanceRecords, leaveRequests]);

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

  return (
    <div className="page-card">
      <header className="hr-header">
        <div>
          <h1 className="hr-title">HR Dashboard</h1>
          <p className="hr-subtitle">Calendar + Attendance Overview</p>
        </div>
        <div className="hr-header-right">
          <div className="pill">{selectedDate}</div>
          <button className="icon-btn">🔔</button>
        </div>
      </header>

      <div className="calendar-top">
        <div className="calendar-title">
          <button className="nav-btn" onClick={goPrevMonth}>‹</button>
          <div className="month-label">{monthName} {viewYear}</div>
          <button className="nav-btn" onClick={goNextMonth}>›</button>
        </div>
        <div className="hint">คลิกวันที่เพื่อดูสรุปการทำงานของพนักงานจากฐานข้อมูล</div>
      </div>

      <div className="calendar">
        <div className="calendar-head">
          {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map((d) => (
            <div className="cal-cell head" key={d}>{d}</div>
          ))}
        </div>
        <div className="calendar-body">
          {weeks.map((week, wIdx) => (
            <React.Fragment key={wIdx}>
              {week.map((d) => {
                const iso = toISODate(d);
                const inMonth = d.getMonth() === viewMonth;
                const isSelected = iso === selectedDate;

                return (
                  <button
                    key={iso}
                    className={`cal-cell ${!inMonth ? "muted" : ""} ${isSelected ? "selected" : ""}`}
                    onClick={() => setSelectedDate(iso)}
                  >
                    <div className="cal-date">{d.getDate()}</div>
                  </button>
                );
              })}
            </React.Fragment>
          ))}
        </div>
      </div>

      <section className="summary-row">
        <div className="summary-card">
          <h4>Present</h4>
          <p className="big">{daySummary.totalPresent}</p>
          <span className="mutetext">คนมาทำงาน</span>
        </div>
        <div className="summary-card">
          <h4>Leave</h4>
          <p className="big">{daySummary.totalLeave}</p>
          <span className="mutetext">คนลา (อนุมัติแล้ว)</span>
        </div>
        <div className="summary-card">
          <h4>Late</h4>
          <p className="big">{daySummary.totalLate}</p>
          <span className="mutetext">คนมาสาย</span>
        </div>
      </section>

      <section className="table-section">
        <h2 className="section-title">Daily Records ({selectedDate})</h2>
        <div className="table-wrap">
          {loading ? (
            <div className="loading-box">กำลังดึงข้อมูลจากระบบ...</div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Role</th>
                  <th>Check-in</th>
                  <th>Check-out</th>
                  <th>Status</th>
                  <th>Note</th>
                </tr>
              </thead>
              <tbody>
                {dayRecords.length === 0 ? (
                  <tr><td colSpan="6" className="empty">ไม่มีข้อมูลการทำงานหรือการลาในวันนี้</td></tr>
                ) : (
                  dayRecords.map((r) => (
                    <tr key={r.id}>
                      <td>{r.name}</td>
                      <td>{r.role}</td>
                      <td>{r.checkIn}</td>
                      <td>{r.checkOut}</td>
                      <td>
                        <span className={`badge ${
                          r.status === "Late" ? "badge-late" : 
                          r.status.includes("Leave") ? "badge-leave" : "badge-ok"
                        }`}>
                          {r.status}
                        </span>
                      </td>
                      <td>{r.note}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </div>
  );
}