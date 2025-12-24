import React, { useEffect, useMemo, useState } from "react";
import moment from "moment";
import "./WorkerAttendancePage.css";
import Pagination from "../components/Pagination";
import { getMyTimeRecords, getMyLateSummary } from "../api/timeRecordService";
import { alertError, alertSuccess } from "../utils/sweetAlert";

const pad2 = (n) => String(n).padStart(2, "0");
const toYMD = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

const buildCSV = (rows) => {
  const escape = (v) => {
    const s = String(v ?? "");
    if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  const header = ["Date", "Check In", "Check Out", "Late", "Note"].join(",");
  const body = rows
    .map((r) => [r.date, r.in, r.out, r.late ? "YES" : "NO", r.note].map(escape).join(","))
    .join("\n");
  return `${header}\n${body}`;
};

export default function WorkerAttendancePage() {
  const today = useMemo(() => new Date(), []);
  const [range, setRange] = useState(() => {
    // default: last 30 days
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 30);
    return { start: toYMD(start), end: toYMD(end) };
  });

  const [q, setQ] = useState("");
  const [onlyLate, setOnlyLate] = useState(false);
  const [loading, setLoading] = useState(false);
  const [records, setRecords] = useState([]);
  const [lateInfo, setLateInfo] = useState(null);

  // pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [recRes, lateRes] = await Promise.all([
        getMyTimeRecords({ startDate: range.start, endDate: range.end }),
        getMyLateSummary(),
      ]);

      const rows = recRes.data?.records || recRes.data?.data?.records || [];
      setRecords(rows);
      setLateInfo(lateRes.data || null);
    } catch (err) {
      console.error(err);
      await alertError("โหลดข้อมูลไม่สำเร็จ", "ไม่สามารถดึงประวัติการลงเวลาได้");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range.start, range.end]);

  const normalized = useMemo(() => {
    const query = q.trim().toLowerCase();

    const mapped = records.map((r) => {
      const date = r.workDate ? moment(r.workDate).format("YYYY-MM-DD") : "";
      const inTime = r.checkInTime ? moment(r.checkInTime).format("HH:mm") : "-";
      const outTime = r.checkOutTime ? moment(r.checkOutTime).format("HH:mm") : "-";
      return {
        id: r.recordId || r.timeRecordId || r.id || `${date}-${inTime}`,
        date,
        in: inTime,
        out: outTime,
        late: !!r.isLate,
        note: r.note || "",
        raw: r,
      };
    });

    let rows = mapped;
    if (onlyLate) rows = rows.filter((x) => x.late);
    if (query) {
      rows = rows.filter((x) =>
        [x.date, x.in, x.out, x.note, x.late ? "late" : "on time"].some((v) =>
          String(v).toLowerCase().includes(query)
        )
      );
    }
    return rows;
  }, [records, q, onlyLate]);

  useEffect(() => {
    setPage(1);
  }, [q, onlyLate, range.start, range.end]);

  const total = normalized.length;
  const startIdx = (page - 1) * pageSize;
  const paged = useMemo(
    () => normalized.slice(startIdx, startIdx + pageSize),
    [normalized, startIdx, pageSize]
  );

  const exportCSV = async () => {
    try {
      const csv = buildCSV(normalized);
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `my_attendance_${range.start}_to_${range.end}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      await alertSuccess("Export สำเร็จ", "ดาวน์โหลดไฟล์ CSV เรียบร้อยแล้ว");
    } catch (e) {
      await alertError("Export ไม่สำเร็จ", "ไม่สามารถสร้างไฟล์ CSV ได้");
    }
  };

  const lateCount = lateInfo?.lateCount ?? null;
  const lateLimit = lateInfo?.lateLimit ?? 5;
  const isExceeded = lateInfo?.isExceeded ?? false;

  return (
    <div className="wa-page">
      <header className="wa-header">
        <div>
          <h1 className="wa-title">My Attendance</h1>
          <p className="wa-subtitle">ประวัติการลงเวลา + ค้นหา/กรอง/Export</p>
        </div>

        <div className="wa-header-right">
          <div className={`wa-pill ${isExceeded ? "danger" : ""}`}>
            Late this month: <strong>{lateCount ?? "-"}</strong> / {lateLimit}
          </div>
          <button className="wa-btn wa-btn-primary" type="button" onClick={exportCSV} disabled={loading}>
            Export CSV
          </button>
        </div>
      </header>

      <section className="wa-panel">
        <div className="wa-controls">
          <div className="wa-control">
            <label>Start</label>
            <input
              type="date"
              value={range.start}
              max={range.end}
              onChange={(e) => setRange((p) => ({ ...p, start: e.target.value }))}
            />
          </div>

          <div className="wa-control">
            <label>End</label>
            <input
              type="date"
              value={range.end}
              min={range.start}
              max={toYMD(today)}
              onChange={(e) => setRange((p) => ({ ...p, end: e.target.value }))}
            />
          </div>

          <div className="wa-control wa-search">
            <label>Search</label>
            <input
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="ค้นหา date / note / time"
            />
          </div>

          <label className="wa-toggle">
            <input type="checkbox" checked={onlyLate} onChange={(e) => setOnlyLate(e.target.checked)} />
            <span>เฉพาะมาสาย</span>
          </label>

          <button className="wa-btn wa-btn-ghost" type="button" onClick={fetchAll} disabled={loading}>
            Refresh
          </button>
        </div>

        <div className="wa-table-wrap">
          {loading ? (
            <div className="wa-empty">Loading...</div>
          ) : total === 0 ? (
            <div className="wa-empty">ไม่พบข้อมูลในช่วงวันที่นี้</div>
          ) : (
            <table className="wa-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Check In</th>
                  <th>Check Out</th>
                  <th>Status</th>
                  <th>Note</th>
                </tr>
              </thead>
              <tbody>
                {paged.map((r) => (
                  <tr key={r.id}>
                    <td className="wa-mono">{r.date}</td>
                    <td className="wa-mono">{r.in}</td>
                    <td className="wa-mono">{r.out}</td>
                    <td>
                      {r.late ? (
                        <span className="wa-badge late">Late</span>
                      ) : (
                        <span className="wa-badge ok">On Time</span>
                      )}
                    </td>
                    <td className="wa-note">{r.note || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="wa-pagination">
          <Pagination
            total={total}
            page={page}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
          />
        </div>
      </section>
    </div>
  );
}
