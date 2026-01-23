export const REDIRECT_RULES = [
    { path: "/hr/dashboard", permission: "access_hr_dashboard" },
    { path: "/worker/dashboard", permission: "access_worker_dashboard" },
    { path: "/hr/employees", permission: "access_employee_list" },
    { path: "/hr/attendance", permission: "access_attendance_list" },
    { path: "/hr/leave-approvals", permission: "access_leave_approval" },
    { path: "/hr/profile-requests", permission: "access_profile_requests" },
    { path: "/admin/roles", permission: "access_role_management" },
    { path: "/hr/leave-settings", permission: "access_leave_settings" },
    { path: "/hr/attendance-policy", permission: "access_attendance_policy" },
    { path: "/worker/attendance", permission: "access_my_attendance" },
    { path: "/worker/leave", permission: "access_my_leaves" },
    { path: "/worker/profile", permission: "access_view_profile" },
];

export const getRedirectPath = (user) => {
    if (!user) return "/login";

    // Admin bypass
    if (user.role === "Admin") {
        return "/hr/dashboard";
    }

    const permissions = user.permissions || [];

    // Find the first permission the user has
    const target = REDIRECT_RULES.find((r) => permissions.includes(r.permission));

    if (target) {
        return target.path;
    }

    // Default fallback if no permissions match
    if (user.role === "HR") return "/hr/dashboard";

    return "/worker/dashboard";
};
