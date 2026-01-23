// backend/src/middlewares/role.middleware.js

const CustomError = require('../utils/customError');

/**
 * Middleware for role-based access control (RBAC).
 * @param {string[]} requiredRoles - Array of roles that are allowed to access the route (e.g., ['HR', 'Worker']).
 * @returns {function} Express middleware function.
 */
const authorizeRole = (requiredRoles) => {
    return (req, res, next) => {
        // ต้องมั่นใจว่า req.user ถูก set จาก authenticateToken ก่อน
        if (!req.user || !req.user.role) {
            return next(CustomError.unauthorized("User authentication details are incomplete."));
        }

        const userRole = req.user.role;

        if (requiredRoles.includes(userRole)) {
            next();
        } else {
            return next(CustomError.forbidden(`Access denied. Role '${userRole}' is not permitted.`));
        }
    };
};

/**
 * Middleware for Permission-based access control.
 * Admins are always allowed (Golden Key).
 * Users with the specific permission are allowed.
 * @param {string} permission - The permission required (e.g., 'access_employee_list')
 */
const authorizePermission = (permission) => {
    return (req, res, next) => {
        if (!req.user) {
            return next(CustomError.unauthorized("User authentication details are incomplete."));
        }

        const { role, permissions } = req.user;

        // 1. Admin always has access
        if (role === 'Admin') return next();

        // 2. Check if user has the specific permission
        // permissions should be an array of strings from the token
        if (permissions && permissions.includes(permission)) {
            return next();
        }

        return next(CustomError.forbidden(`Access denied. Required permission: '${permission}'.`));
    };
};

module.exports = { authorizeRole, authorizePermission };