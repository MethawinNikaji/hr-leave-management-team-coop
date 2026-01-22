import React, { useEffect, useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import axiosClient from "../api/axiosClient";
import { alertSuccess, alertError, alertConfirm } from "../utils/sweetAlert";
import {
    FiPlus, FiTrash2, FiEdit, FiSearch
} from "react-icons/fi";
import DataTable from "react-data-table-component";

import "./RoleManagementPage.css";

export default function RoleManagementPage() {
    const { t } = useTranslation();
    const [roles, setRoles] = useState([]);
    const [loading, setLoading] = useState(false);
    const [filterText, setFilterText] = useState("");

    // Modal State
    const [modalOpen, setModalOpen] = useState(false);
    const [editingRole, setEditingRole] = useState(null);
    const [form, setForm] = useState({ roleName: "" });

    const fetchRoles = async () => {
        try {
            setLoading(true);
            const res = await axiosClient.get("/admin/roles");
            if (res.data.success) {
                setRoles(res.data.roles);
            }
        } catch (err) {
            console.error(err);
            alertError(t("common.error"), t("alerts.loadFailed") || "Failed to load roles.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRoles();
    }, []);

    // Filter
    const filteredRoles = useMemo(() => {
        return roles.filter(r =>
            r.roleName.toLowerCase().includes(filterText.toLowerCase())
        );
    }, [roles, filterText]);

    // Actions
    const handleEdit = (role) => {
        setEditingRole(role);
        setForm({ roleName: role.roleName });
        setModalOpen(true);
    };

    const handleDelete = async (role) => {
        const isConfirmed = await alertConfirm(
            t("roles.deleteConfirmTitle", "Delete Role?"),
            t("roles.deleteConfirmText", `Are you sure you want to delete role "${role.roleName}"?`)
        );
        if (!isConfirmed) return;

        try {
            await axiosClient.delete(`/admin/roles/${role.roleId}`);
            alertSuccess(t("common.success"), t("roles.deleted", "Role deleted."));
            fetchRoles();
        } catch (err) {
            console.error(err);
            const msg = err.response?.data?.message || err.message;
            alertError(t("common.error"), msg);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.roleName.trim()) return;

        try {
            if (editingRole) {
                // Update
                await axiosClient.put(`/admin/roles/${editingRole.roleId}`, form);
                alertSuccess(t("common.success"), t("roles.updated", "Role updated."));
            } else {
                // Create
                await axiosClient.post("/admin/roles", form);
                alertSuccess(t("common.success"), t("roles.created", "Role created."));
            }
            setModalOpen(false);
            setEditingRole(null);
            setForm({ roleName: "" });
            fetchRoles();
        } catch (err) {
            console.error(err);
            const msg = err.response?.data?.message || err.message;
            alertError(t("common.error"), msg);
        }
    };

    // Columns
    const columns = [
        {
            name: "ID",
            selector: row => row.roleId,
            sortable: true,
            width: "80px",
        },
        {
            name: t("roles.roleName", "Role Name"),
            selector: row => row.roleName,
            sortable: true,
        },
        {
            name: t("common.actions", "Actions"),
            cell: (row) => (
                <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                        className="role-action-btn edit"
                        onClick={() => handleEdit(row)}
                        title={t("common.edit")}
                    >
                        <FiEdit />
                    </button>

                    {/* Prevent deleting system roles */}
                    {!['Admin', 'HR', 'Worker'].includes(row.roleName) && (
                        <button
                            className="role-action-btn delete"
                            onClick={() => handleDelete(row)}
                            title={t("common.delete")}
                        >
                            <FiTrash2 />
                        </button>
                    )}
                </div>
            ),
            ignoreRowClick: true,
        },
    ];

    const customStyles = {
        headRow: {
            style: {
                border: 'none',
            },
        },
        headCells: {
            style: {
                color: '#94a3b8',
                fontSize: '12px',
                fontWeight: '700',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
            },
        },
        rows: {
            style: {
                minHeight: '60px',
                borderBottom: '1px solid #f1f5f9',
            },
            highlightOnHoverStyle: {
                backgroundColor: '#f8fafc',
                borderBottomColor: '#f1f5f9',
                borderRadius: '12px',
                outline: '1px solid #ffffff',
            },
        },
        pagination: {
            style: {
                border: 'none',
            },
        },
    };

    return (
        <div className="page-card role-mgmt">
            <div className="role-head">
                <div>
                    <h1 className="role-title">
                        {t("sidebar.items.rolesManagement", "Roles Management")}
                    </h1>
                    <p className="role-sub">
                        {t("roles.subtitle", "Manage user roles and permissions.")}
                    </p>
                </div>
            </div>

            <div className="role-tools">
                {/* Search */}
                <div className="role-search-box">
                    <FiSearch className="role-search-icon" />
                    <input
                        type="text"
                        className="role-search-input"
                        placeholder={t("common.search", "Search...")}
                        value={filterText}
                        onChange={(e) => setFilterText(e.target.value)}
                    />
                </div>

                <button
                    className="role-btn role-btn-primary"
                    onClick={() => {
                        setEditingRole(null);
                        setForm({ roleName: "" });
                        setModalOpen(true);
                    }}
                >
                    <FiPlus />
                    {t("roles.addNew", "Add Role")}
                </button>
            </div>

            <div className="role-table-card">
                <DataTable
                    columns={columns}
                    data={filteredRoles}
                    progressPending={loading}
                    pagination
                    highlightOnHover
                    responsive
                    customStyles={customStyles}
                    theme={localStorage.getItem("theme") === "dark" ? "dark" : "default"}
                />
            </div>

            {/* Modal */}
            {modalOpen && (
                <div className="role-modal-overlay" onClick={() => setModalOpen(false)}>
                    <div className="role-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="role-modal-header">
                            <h2 className="role-modal-title">
                                {editingRole ? t("roles.editRole", "Edit Role") : t("roles.newRole", "New Role")}
                            </h2>
                        </div>

                        <form onSubmit={handleSubmit}>
                            <div className="role-modal-body">
                                <div className="role-form-group">
                                    <span className="role-label">
                                        {t("roles.roleName", "Role Name")}
                                    </span>
                                    <input
                                        type="text"
                                        className="role-input"
                                        value={form.roleName}
                                        onChange={(e) => setForm({ ...form, roleName: e.target.value })}
                                        required
                                        placeholder="e.g. Supervisor"
                                    />
                                </div>
                            </div>

                            <div className="role-modal-footer">
                                <button
                                    type="button"
                                    className="role-btn role-btn-secondary"
                                    onClick={() => setModalOpen(false)}
                                >
                                    {t("common.cancel", "Cancel")}
                                </button>
                                <button
                                    type="submit"
                                    className="role-btn role-btn-primary"
                                >
                                    {t("common.save", "Save")}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
