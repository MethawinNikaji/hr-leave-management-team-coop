// backend/src/middlewares/validation.middleware.js

const { validationResult } = require('express-validator');
const CustomError = require('../utils/customError');

/**
 * Middleware function to check validation results from express-validator.
 * If errors are found, throws a 422 CustomError.
 */
const validate = (req, res, next) => {
    const errors = validationResult(req);
    
    // ถ้าไม่มี error, ไปยัง Controller
    if (errors.isEmpty()) {
        return next();
    }
    
    // ดึง error แรกที่พบ (หรือจะรวมทั้งหมดก็ได้)
    const firstError = errors.array({ onlyFirstError: true })[0];
    
    // โยน Custom Error 422 Unprocessable Entity
    // ข้อความ error จะใช้ข้อความที่มาจาก check() ของ express-validator
    throw CustomError.unprocessableEntity(firstError.msg);
};

module.exports = { validate };