import { useEffect, useMemo, useState } from "react";
import { FiEdit2, FiSettings, FiRefreshCw, FiUserPlus, FiToggleLeft, FiToggleRight } from "react-icons/fi";
import "./HREmployees.css";
import { alertConfirm, alertError, alertSuccess } from "../utils/sweetAlert";
import axiosClient from "../api/axiosClient";
import { useTranslation } from "react-i18next";

export default function Employees() {

  const { t, i18n } = useTranslation();
  const [employees, setEmployees] = useState([]);
  const [types, setTypes] = useState([]);
  const [loading, setLoading] = useState(true);

  // Phase 2 filters
  const [q, setQ] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [activeFilter, setActiveFilter] = useState("all");

  const [quotaOpen, setQuotaOpen] = useState(false);
  const [empModalOpen, setEmpModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);

  const [activeEmp, setActiveEmp] = useState(null);
  const [quotaRows, setQuotaRows] = useState([]);

  const [empForm, setEmpForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    role: "Worker",
    joiningDate: "",
    isActive: true,
  });

  const fetchEmployees = async () => {
    try {
      const res = await axiosClient.get("/admin/employees");
      setEmployees(res.data.employees || []);
    } catch (err) {
      console.error("Fetch Employees Error:", err);
      await alertError("Error", err.response?.data?.message || err.message);
    }
  };

  const fetchLeaveTypes = async () => {
    try {
      const res = await axiosClient.get("/admin/hr/leave-types");
      setTypes(res.data.types || []);
    } catch (err) {
      console.error("Fetch Leave Types Error:", err);
      await alertError("Error", err.response?.data?.message || err.message);
    }
  };

  useEffect(() => {
    (async () => {
      setLoading(true);
      await Promise.all([fetchEmployees(), fetchLeaveTypes()]);
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openAddModal = () => {
    setIsEditMode(false);
    setActiveEmp(null);
    setEmpForm({
      firstName: "",
      lastName: "",
      email: "",
      password: "",
      role: "Worker",
      joiningDate: "",
      isActive: true,
    });
    setEmpModalOpen(true);
  };

  const formatDateForInput = (dateString) => {
    if (!dateString) return "";
    return dateString.split("T")[0];
  };

  const openEditModal = (emp) => {
    setIsEditMode(true);
    setActiveEmp(emp);
    setEmpForm({
      firstName: emp.firstName || "",
      lastName: emp.lastName || "",
      email: emp.email || "",
      password: "",
      role: emp.role || "Worker",
      joiningDate: formatDateForInput(emp.joiningDate),
      isActive: emp.isActive !== undefined ? emp.isActive : true,
    });
    setEmpModalOpen(true);
  };

  const handleSaveEmployee = async (e) => {
    e.preventDefault();
    try {
      if (isEditMode) {
        await axiosClient.put(`/admin/employees/${activeEmp.employeeId}`, empForm);
      } else {
        await axiosClient.post("/admin/employees", empForm);
      }
      setEmpModalOpen(false);
      fetchEmployees();
      await alertSuccess("Done", `${isEditMode ? "Updated" : "Created"} employee successfully.`);
    } catch (err) {
      await alertError("Error", err.response?.data?.message || err.message);
    }
  };

  const handleSyncQuotas = async () => {
    const ok = await alertConfirm(t("Sync Default Quotas"), t("Apply default leave quotas to all employees for the current year?"),
      "Sync"
    );
    if (!ok) return;

    try {
      setLoading(true);
      await axiosClient.post("/admin/hr/sync-quotas", {});
      await alertSuccess(t("Done"), t("Default quotas have been synced."));
      fetchEmployees();
    } catch (err) {
      await alertError("Error", err.response?.data?.message || t("Unable to sync."));
    } finally {
      setLoading(false);
    }
  };

  const openQuota = async (emp) => {
    setActiveEmp(emp);
    setQuotaOpen(true);
    try {
      const res = await axiosClient.get(`/admin/hr/leave-quota/${emp.employeeId}`);
      const quotasData = res.data.quotas || [];
      const map = new Map(quotasData.map((x) => [x.leaveTypeId, x]));

      const rows = types.map((t) => {
        const hit = map.get(t.leaveTypeId);
        return {
          leaveTypeId: t.leaveTypeId,
          typeName: t.typeName,
          totalDays: hit ? Number(hit.totalDays) : 0,
          usedDays: hit ? Number(hit.usedDays) : 0,
          carriedOverDays: hit ? Number(hit.carriedOverDays) : 0,
          canCarry: t.isCarryForward || t.maxCarryDays > 0,
        };
      });
      setQuotaRows(rows);
    } catch (err) {
      console.error(t("Fetch Quota Error:"), err);
      await alertError("Error", err.response?.data?.message || err.message);
    }
  };

  const saveQuota = async () => {
    try {
      await axiosClient.put(`/admin/hr/leave-quota/${activeEmp.employeeId}`, {
        quotas: quotaRows.map((r) => ({
          leaveTypeId: r.leaveTypeId,
          totalDays: r.totalDays,
          carriedOverDays: r.carriedOverDays,
        })),
      });
      setQuotaOpen(false);
      await alertSuccess(t("Done"), t("Leave quota updated."));
    } catch (err) {
      await alertError("Error", err.response?.data?.message || t("Unable to update quota."));
    }
  };

  // Phase 3: quick deactivate/activate toggle (uses edit endpoint)
  const toggleActive = async (emp) => {
    const next = !emp.isActive;
    const ok = await alertConfirm(
      next ? t("Activate Account") : t("Deactivate Account"),
      next
        ? t("Allow this employee to access the system?")
        : t("Disable login for this employee? (Does not delete data)"),
      next ? "Activate" : "Deactivate"
    );
    if (!ok) return;

    try {
      await axiosClient.put(`/admin/employees/${emp.employeeId}`, {
        ...emp,
        password: "", // backend should ignore if empty (same behavior as your UI)
        isActive: next,
      });
      await alertSuccess("Done", `Employee is now ${next ? "Active" : "Inactive"}.`);
      fetchEmployees();
    } catch (err) {
      await alertError("Error", err.response?.data?.message || err.message);
    }
  };

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return employees.filter((e) => {
      const hay = `${e.firstName} ${e.lastName} ${e.email} ${e.role}`.toLowerCase();
      const okQ = !s || hay.includes(s);
      const okRole = roleFilter === "all" || e.role === roleFilter;
      const okActive =
        activeFilter === "all" ||
        (activeFilter === "active" ? !!e.isActive : !e.isActive);
      return okQ && okRole && okActive;
    });
  }, [employees, q, roleFilter, activeFilter]);

  return (
    <div className="page-card emp">
      <div className="emp-head">
        <div>
          <h2 className="emp-title">{t("Employees")}</h2>
          <p className="emp-sub">{t("Manage employees and leave quotas")}</p>
        </div>

        <div className="emp-tools">
          <input
            className="emp-input"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t("Search name, email, role...")}
          />

          <select
            className="emp-input"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            style={{ maxWidth: 150 }}
          >
            <option value="all">{t("All roles")}</option>
            <option value="HR">{t("HR")}</option>
            <option value="Worker">{t("Worker")}</option>
          </select>

          <select
            className="emp-input"
            value={activeFilter}
            onChange={(e) => setActiveFilter(e.target.value)}
            style={{ maxWidth: 160 }}
          >
            <option value="all">{t("All status")}</option>
            <option value="active">{t("Active only")}</option>
            <option value="inactive">{t("Inactive only")}</option>
          </select>

          <button
            className="emp-btn emp-btn-outline warn"
            onClick={handleSyncQuotas}
            title={t("Sync Default Quotas")}
            disabled={loading}
          >
            <FiRefreshCw className={loading ? "spin" : ""} />{t("Sync Default")}</button>

          <button className="emp-btn emp-btn-primary" onClick={openAddModal}>
            <FiUserPlus />{t("Add New")}</button>

          <button className="emp-btn emp-btn-outline" onClick={fetchEmployees} disabled={loading} title={t("Refresh List")}>
            <FiRefreshCw className={loading ? "spin" : ""} />
            <span className="hidden-mobile">{t("Refresh")}</span>
          </button>
        </div>
      </div>

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th style={{ width: 80 }}>{t("ID")}</th>
              <th>{t("Name")}</th>
              <th>{t("Email / Role")}</th>
              <th className="text-center" style={{ width: 320 }}>{t("Actions")}</th>
            </tr>
          </thead>

          <tbody>
          {loading ? (
            <tr>
              <td colSpan="4" className="empty">{t("Loading...")}</td>
            </tr>
          ) : filtered.length === 0 ? (
            <tr>
              <td colSpan="4" className="empty">{t("No employees found.")}</td>
            </tr>
          ) : (
            filtered.map((emp) => (
              <tr key={emp.employeeId}>
                <td className="emp-mono emp-muted">{emp.employeeId}</td>
                <td className="emp-strong">
                  {emp.firstName} {emp.lastName}
                </td>
                <td>
                  <div className="emp-muted mini">{emp.email}</div>
                  <span className={`badge ${emp.role === "HR" ? "badge-role-hr" : "badge-role-worker"}`}>
                    {emp.role}
                  </span>
                  {!emp.isActive && <span className="badge badge-danger">{t("Inactive")}</span>}
                </td>

                <td className="action-column">
                  <div className="btn-group-row" style={{ justifyContent: "center", gap: 8 }}>
                    <button className="emp-btn emp-btn-outline small info" onClick={() => openEditModal(emp)}>
                      <FiEdit2 />{t("Edit")}
                    </button>

                    <button className="emp-btn emp-btn-outline small quota" onClick={() => openQuota(emp)}>
                      <FiSettings />{t("Quota")}
                    </button>

                    <button
                      className={`emp-btn emp-btn-outline small ${emp.isActive ? "warn" : "info"}`}
                      onClick={() => toggleActive(emp)}
                      title={emp.isActive ? t("Deactivate") : t("Activate")}
                    >
                      {emp.isActive ? <FiToggleLeft /> : <FiToggleRight />}
                      {emp.isActive ? t("Deactivate") : t("Activate")}
                    </button>
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
        </table>
      </div>

      {/* Employee modal */}
      {empModalOpen && (
        <div className="emp-modal-backdrop" onClick={() => setEmpModalOpen(false)}>
          <form className="emp-modal" onClick={(e) => e.stopPropagation()} onSubmit={handleSaveEmployee}>
            <div className="emp-modal-head">
              <div>
                <div className="emp-modal-title">{isEditMode ? t("Edit Employee") : t("Add New Employee")}</div>
                <div className="emp-modal-sub">
                  {isEditMode ? `ID: #${activeEmp.employeeId}` : t("Fill in details to create a new account")}
                </div>
              </div>
              <button className="emp-x" type="button" onClick={() => setEmpModalOpen(false)}>
                ×
              </button>
            </div>

            <div className="emp-modal-body">
              <div className="form-row">
                <div className="form-col">
                  <label>{t("First Name")}</label>
                  <input
                    className="quota-input w-full"
                    value={empForm.firstName}
                    onChange={(e) => setEmpForm({ ...empForm, firstName: e.target.value })}
                    required
                  />
                </div>
                <div className="form-col">
                  <label>{t("Last Name")}</label>
                  <input
                    className="quota-input w-full"
                    value={empForm.lastName}
                    onChange={(e) => setEmpForm({ ...empForm, lastName: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="form-col">
                <label>{t("Email Address")}</label>
                <input
                  className="quota-input w-full"
                  type="email"
                  value={empForm.email}
                  onChange={(e) => setEmpForm({ ...empForm, email: e.target.value })}
                  required
                />
              </div>

              <div className="form-col">
                <label>Password {isEditMode && t("(leave blank to keep current)")}</label>
                <input
                  className="quota-input w-full"
                  type="password"
                  value={empForm.password}
                  onChange={(e) => setEmpForm({ ...empForm, password: e.target.value })}
                  required={!isEditMode}
                />
              </div>

              <div className="form-row">
                <div className="form-col">
                  <label>{t("Role")}</label>
                  <select
                    className="quota-input w-full"
                    value={empForm.role}
                    onChange={(e) => setEmpForm({ ...empForm, role: e.target.value })}
                  >
                    <option value="Worker">{t("Worker")}</option>
                    <option value="HR">{t("HR")}</option>
                  </select>
                </div>

                <div className="form-col">
                  <label>{t("Joining Date")}</label>
                  <input
                    type="date"
                    className="quota-input w-full"
                    value={empForm.joiningDate}
                    onChange={(e) => setEmpForm({ ...empForm, joiningDate: e.target.value })}
                    required
                  />
                </div>
              </div>

              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={empForm.isActive}
                  onChange={(e) => setEmpForm({ ...empForm, isActive: e.target.checked })}
                />
                Account Active (allow system access)
              </label>
            </div>

            <div className="emp-modal-actions">
              <button className="emp-btn emp-btn-outline" type="button" onClick={() => setEmpModalOpen(false)}>
                Cancel
              </button>
              <button className="emp-btn emp-btn-primary" type="submit">{t("Save")}</button>
            </div>
          </form>
        </div>
      )}

      {/* Quota modal */}
      {quotaOpen && (
        <div className="emp-modal-backdrop" onClick={() => setQuotaOpen(false)}>
          <div className="emp-modal" onClick={(e) => e.stopPropagation()}>
            <div className="emp-modal-head">
              <div>
                <div className="emp-modal-title">{t("Set Leave Quota")}</div>
                <div className="emp-modal-sub">
                  {activeEmp?.firstName} {activeEmp?.lastName}
                </div>
              </div>
              <button className="emp-x" onClick={() => setQuotaOpen(false)}>
                ×
              </button>
            </div>

            <div className="emp-modal-body">
              <div
                className="quota-header-row"
                style={{
                  display: "flex",
                  fontWeight: "bold",
                  paddingBottom: 8,
                  borderBottom: "1px solid #eee",
                  marginBottom: 12,
                  fontSize: 13,
                }}
              >
                <div style={{ flex: 1 }}>{t("Leave Type / Used")}</div>
                <div style={{ width: 85, textAlign: "center" }}>{t("This Year")}</div>
                <div style={{ width: 85, textAlign: "center" }}>{t("Carried")}</div>
              </div>

              {quotaRows.map((r) => (
                <div
                  className="quota-row"
                  key={r.leaveTypeId}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "8px 0",
                    borderBottom: "1px solid #f9f9f9",
                  }}
                >
                  <div className="quota-left" style={{ flex: 1 }}>
                    <div className="quota-type" style={{ fontWeight: "bold", fontSize: 14 }}>
                      {r.typeName}
                    </div>
                    <div className="quota-mini" style={{ fontSize: 12, color: "#888" }}>
                      Used: {r.usedDays} day(s)
                    </div>
                  </div>

                  <div className="quota-field">
                    <input
                      className="quota-input"
                      style={{ width: 70, textAlign: "center" }}
                      type="number"
                      min="0"
                      step="0.5"
                      value={r.totalDays}
                      onChange={(e) =>
                        setQuotaRows((prev) =>
                          prev.map((row) =>
                            row.leaveTypeId === r.leaveTypeId ? { ...row, totalDays: Number(e.target.value) } : row
                          )
                        )
                      }
                    />
                  </div>

                  <div className="quota-field">
                    <input
                      className="quota-input highlight-carry"
                      style={{
                        width: 70,
                        textAlign: "center",
                        backgroundColor: r.canCarry ? "#f0fdf4" : "#f1f5f9",
                        borderColor: r.canCarry ? "#bbf7d0" : "#e2e8f0",
                        cursor: r.canCarry ? "text" : "not-allowed",
                      }}
                      type="number"
                      min="0"
                      step="0.5"
                      value={r.carriedOverDays}
                      disabled={!r.canCarry}
                      onChange={(e) =>
                        setQuotaRows((prev) =>
                          prev.map((row) =>
                            row.leaveTypeId === r.leaveTypeId
                              ? { ...row, carriedOverDays: Number(e.target.value) }
                              : row
                          )
                        )
                      }
                    />
                  </div>
                </div>
              ))}

              <div style={{ marginTop: 12, fontSize: 11, color: "#666", fontStyle: "italic" }}>
                * Green field = editable carried over days | Gray field = carry over not allowed (configure in Leave
                Settings)
              </div>
            </div>

            <div className="emp-modal-actions">
              <button className="emp-btn emp-btn-outline" onClick={() => setQuotaOpen(false)}>
                Cancel
              </button>
              <button className="emp-btn emp-btn-primary" onClick={saveQuota}>{t("Save Quota")}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}