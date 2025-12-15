// backend/src/middlewares/auth.middleware.js

const jwt = require('jsonwebtoken');
const CustomError = require('../utils/customError');

/**
 * Middleware to verify JWT token from Authorization header.
 * Attaches decoded user payload (employeeId, role) to req.user.
 */
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    // Format: "Bearer <TOKEN>"
    const token = authHeader && authHeader.split(' ')[1]; 

    // 1. ตรวจสอบว่ามี Token หรือไม่
    if (!token) {
        // โยน 401 Unauthorized หากไม่มี Token
        return next(CustomError.unauthorized("Authentication token is missing."));
    }

    // 2. ตรวจสอบความถูกต้องของ Token
    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) {
            // โยน 401 Unauthorized หาก Token ไม่ถูกต้องหรือหมดอายุ
            console.error('JWT Verification Error:', err.message);
            return next(CustomError.unauthorized("Invalid or expired token."));
        }
        
        // 3. เก็บข้อมูลผู้ใช้ที่ถอดรหัสแล้วไว้ใน req.user
        // payload ควรมี employeeId และ role
        req.user = decoded; 
        next();
    });
};

module.exports = authenticateToken;