import React from "react";
import AuditLogPanel from "../components/AuditLogPanel";
import { useTranslation } from "react-i18next";

export default function AdminAuditLogPage() {
    const { t } = useTranslation();

    return (
        <div className="page-card">
            <div className="role-head" style={{ marginBottom: "20px" }}>
                <div>
                    <h1 className="role-title">
                        {t("sidebar.items.adminAuditLog", "Admin Audit Log")}
                    </h1>
                    <p className="role-sub">
                        {t("pages.adminAuditLog.subtitle", "View all HR activities and system logs.")}
                    </p>
                </div>
            </div>

            {/* Reusing AuditLogPanel with roleFilter="HR" to show HR actions specifically, or empty for all admin logs. 
          The user asked "can view log ONLY HR actions". So I will set roleFilter="HR". 
          Wait, "can view log specifically for HR actions" -> implies seeing what HR did. 
      */}
            <AuditLogPanel roleFilter="HR" />
        </div>
    );
}
