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
            // ควรจะถูกจับโดย authenticateToken ก่อน แต่เป็น Safety Check
            return next(CustomError.unauthorized("User authentication details are incomplete."));
        }
        
        const userRole = req.user.role;

        // ตรวจสอบว่า role ของผู้ใช้อยู่ใน requiredRoles หรือไม่
        if (requiredRoles.includes(userRole)) {
            next(); // อนุญาตให้เข้าถึง
        } else {
            // โยน 403 Forbidden หากไม่มีสิทธิ์
            return next(CustomError.forbidden(`Access denied. Role '${userRole}' is not permitted.`));
        }
    };
};

module.exports = { authorizeRole };