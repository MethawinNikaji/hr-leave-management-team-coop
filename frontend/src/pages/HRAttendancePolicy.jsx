import React, { useEffect, useMemo, useState } from "react";
import "./HRAttendancePolicy.css";
import { alertConfirm, alertSuccess, alertError } from "../utils/sweetAlert";

// ✅ Frontend-only policy settings (until backend policy/shift table & API is ready)
// We keep it in localStorage so UI can be used immediately.
const STORAGE_KEY = "attendance_policy_v1";

const DAYS = [
  { key: "mon", label: "Mon" },
  { key: "tue", label: "Tue" },
  { key: "wed", label: "Wed" },
  { key: "thu", label: "Thu" },
  { key: "fri", label: "Fri" },
  { key: "sat", label: "Sat" },
  { key: "sun", label: "Sun" },
];

const defaultPolicy = {
  startTime: "09:00",
  graceMinutes: 5,
  workingDays: { mon: true, tue: true, wed: true, thu: true, fri: true, sat: false, sun: false },
  specialHolidays: [], // YYYY-MM-DD strings
  shiftsEnabled: false, // Phase next
  shifts: [
    { id: "day", name: "Day Shift", startTime: "09:00", graceMinutes: 5 },
  ],
};

const safeParse = (raw, fallback) => {
  try {
    const v = JSON.parse(raw);
    return v && typeof v === "object" ? v : fallback;
  } catch {
    return fallback;
  }
};

const clampInt = (v, min, max) => {
  const n = Number(v);
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, Math.trunc(n)));
};

export default function HRAttendancePolicy() {
  const [policy, setPolicy] = useState(defaultPolicy);
  const [holidayInput, setHolidayInput] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const saved = safeParse(localStorage.getItem(STORAGE_KEY) || "", null);
    if (saved) {
      // merge defaults (forward-compatible)
      setPolicy((prev) => ({
        ...prev,
        ...saved,
        workingDays: { ...prev.workingDays, ...(saved.workingDays || {}) },
        shifts: Array.isArray(saved.shifts) && saved.shifts.length ? saved.shifts : prev.shifts,
        specialHolidays: Array.isArray(saved.specialHolidays) ? saved.specialHolidays : prev.specialHolidays,
      }));
    }
  }, []);

  const workingSummary = useMemo(() => {
    const on = DAYS.filter((d) => policy.workingDays?.[d.key]).map((d) => d.label);
    return on.length ? on.join(", ") : "—";
  }, [policy.workingDays]);

  const save = async () => {
    const ok = await alertConfirm(
      "Save Attendance Policy",
      "This will update work policy used by the system (frontend only for now).",
      "Save"
    );
    if (!ok) return;

    try {
      setSaving(true);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(policy));
      await alertSuccess("Saved", "Attendance policy saved successfully.");
    } catch (e) {
      console.error(e);
      await alertError("Error", "Cannot save policy.");
    } finally {
      setSaving(false);
    }
  };

  const reset = async () => {
    const ok = await alertConfirm(
      "Reset to Default",
      "This will reset all policy values to default.",
      "Reset"
    );
    if (!ok) return;
    setPolicy(defaultPolicy);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultPolicy));
    await alertSuccess("Reset", "Policy reset to default.");
  };

  const addHoliday = () => {
    const d = holidayInput.trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return;
    setPolicy((p) => {
      const set = new Set(p.specialHolidays || []);
      set.add(d);
      return { ...p, specialHolidays: Array.from(set).sort() };
    });
    setHolidayInput("");
  };

  const removeHoliday = (d) => {
    setPolicy((p) => ({ ...p, specialHolidays: (p.specialHolidays || []).filter((x) => x !== d) }));
  };

  return (
    <div className="page-card hr-policy">
      <div className="hrp-head">
        <div>
          <h1 className="hrp-title">Attendance Settings</h1>
          <p className="hrp-sub">
            Configure work start time, late grace period, working days and special holidays.
          </p>
        </div>

        <div className="hrp-actions">
          <button className="btn outline" type="button" onClick={reset} disabled={saving}>
            Reset
          </button>
          <button className="btn primary" type="button" onClick={save} disabled={saving}>
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>

      <div className="hrp-grid">
        <section className="hrp-card">
          <h3 className="hrp-card-title">Work Policy</h3>

          <div className="hrp-row">
            <div className="hrp-field">
              <label>Start time</label>
              <input
                type="time"
                value={policy.startTime}
                onChange={(e) => setPolicy((p) => ({ ...p, startTime: e.target.value }))}
              />
            </div>

            <div className="hrp-field">
              <label>Late after (grace minutes)</label>
              <input
                type="number"
                min={0}
                max={180}
                value={policy.graceMinutes}
                onChange={(e) => setPolicy((p) => ({ ...p, graceMinutes: clampInt(e.target.value, 0, 180) }))}
              />
            </div>
          </div>

          <div className="hrp-divider" />

          <div className="hrp-field">
            <label>Working days</label>
            <div className="hrp-days">
              {DAYS.map((d) => (
                <label className="hrp-day" key={d.key}>
                  <input
                    type="checkbox"
                    checked={!!policy.workingDays?.[d.key]}
                    onChange={(e) =>
                      setPolicy((p) => ({
                        ...p,
                        workingDays: { ...p.workingDays, [d.key]: e.target.checked },
                      }))
                    }
                  />
                  <span>{d.label}</span>
                </label>
              ))}
            </div>
            <div className="hrp-hint">Currently: <strong>{workingSummary}</strong></div>
          </div>
        </section>

        <section className="hrp-card">
          <h3 className="hrp-card-title">Special Holidays</h3>
          <p className="hrp-sub2">Add one-off holidays (YYYY-MM-DD) that should be treated as non-working days.</p>

          <div className="hrp-holiday-row">
            <input
              className="hrp-holiday-input"
              placeholder="YYYY-MM-DD"
              value={holidayInput}
              onChange={(e) => setHolidayInput(e.target.value)}
            />
            <button className="btn outline" type="button" onClick={addHoliday}>
              Add
            </button>
          </div>

          {(!policy.specialHolidays || policy.specialHolidays.length === 0) ? (
            <div className="hrp-empty">No holidays added.</div>
          ) : (
            <div className="hrp-holiday-list">
              {policy.specialHolidays.map((d) => (
                <div className="hrp-holiday" key={d}>
                  <span className="hrp-holiday-date">{d}</span>
                  <button className="hrp-holiday-x" type="button" onClick={() => removeHoliday(d)}>
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="hrp-card hrp-card-muted">
          <h3 className="hrp-card-title">Shift (Next Phase)</h3>
          <p className="hrp-sub2">
            Shift support requires backend tables (policy/shift) and check-in logic. This UI is prepared for next phase.
          </p>

          <label className="hrp-shift-toggle">
            <input
              type="checkbox"
              checked={!!policy.shiftsEnabled}
              onChange={(e) => setPolicy((p) => ({ ...p, shiftsEnabled: e.target.checked }))}
            />
            Enable shift system
          </label>

          <div className="hrp-hint">
            When backend is ready, we will allow creating multiple shifts and assign them to employees.
          </div>
        </section>
      </div>
    </div>
  );
}
