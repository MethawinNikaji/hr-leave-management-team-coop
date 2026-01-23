import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTranslation } from "react-i18next";
import { getRedirectPath } from "../utils/navigation";

export default function RoleRoute({ allow = [], permission, children }) {
  const { isReady, user } = useAuth();
  const { t } = useTranslation();

  if (!isReady) return null;

  const role = user?.role;
  if (!role) return <Navigate to="/login" replace />;

  const permissions = user?.permissions || [];

  // 1. Admin always has access (Golden Key)
  if (role === 'Admin') {
    return children;
  }

  // 2. Check Role (if restricted by role list)
  // If allow is empty, it means "allow all roles" (unless permission restricts?) 
  // But typically in this app allow is always specific.
  const hasRole = allow.length === 0 || allow.includes(role);

  // 3. Check Permission (if restricted by permission)
  const hasPermission = !permission || permissions.includes(permission);

  // Authorization Logic:
  // If the user has the Role OR the Permission, they can access.
  // This allows "Cross-Role" access via permissions.
  if (hasRole || hasPermission) {
    return children;
  }

  // If unauthorized:
  // If trying to access a page they can't see, send them to their main dashboard
  const target = getRedirectPath(user);
  return <Navigate to={target} replace />;
}