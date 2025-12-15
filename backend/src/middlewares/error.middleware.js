// backend/src/middlewares/error.middleware.js

const CustomError = require('../utils/customError');

/**
 * Global Error Handling Middleware.
 * Catches all errors and standardizes the response format.
 */
// ต้องรับ 4 arguments (err, req, res, next) เพื่อให้ Express รู้ว่าเป็น Error Middleware
const errorMiddleware = (err, req, res, next) => {
    // Log error stack สำหรับ Debug ใน Server
    if (process.env.NODE_ENV === 'development') {
        console.error('--- Global Error Handler Activated ---');
        console.error(err.stack); 
        console.error('--------------------------------------');
    }

    let statusCode = 500;
    let message = 'Internal Server Error. Please try again later.';

    // 1. จัดการ CustomError
    if (err instanceof CustomError) {
        statusCode = err.statusCode;
        message = err.message;
    } 
    
    // 2. จัดการ Prisma Error (เช่น Unique Constraint P2002)
    else if (err.code && err.code.startsWith('P')) {
        if (err.code === 'P2002') { // Unique constraint violation
            const field = err.meta?.target?.join(', ') || 'data';
            statusCode = 409; // Conflict
            message = `Duplicate entry for ${field}. This record already exists.`;
        }
        // เพิ่มการจัดการ Prisma Error อื่นๆ ตามความจำเป็น
    }

    // ส่ง Response กลับไปยัง Client
    res.status(statusCode).json({
        success: false,
        message: message,
        statusCode: statusCode,
    });
};

module.exports = errorMiddleware;