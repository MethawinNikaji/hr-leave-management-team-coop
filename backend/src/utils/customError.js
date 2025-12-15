// backend/src/utils/customError.js

/**
 * Custom Error Class for standardized API error responses.
 * It assigns an appropriate HTTP status code to the error.
 */
class CustomError extends Error {
    /**
     * @param {number} statusCode - HTTP status code (e.g., 401, 403, 409, 422)
     * @param {string} message - Error message detail
     */
    constructor(statusCode, message) {
        super(message);
        this.statusCode = statusCode;
        // isOperational: สำหรับแยก Error ที่คาดการณ์ได้ (เช่น validation fail) 
        // จาก Error ของโปรแกรม (เช่น reference error)
        this.isOperational = true; 
        
        Error.captureStackTrace(this, this.constructor);
    }
}

// Factory methods สำหรับสร้าง Error ที่มีสถานะโค้ดเฉพาะ
CustomError.badRequest = (message = "Invalid input or request.") => new CustomError(400, message);
CustomError.unauthorized = (message = "Authentication failed. Invalid or missing token.") => new CustomError(401, message);
CustomError.forbidden = (message = "Access denied. You do not have the required role.") => new CustomError(403, message);
CustomError.notFound = (message = "Resource not found.") => new CustomError(404, message);
CustomError.conflict = (message = "Resource conflict. Data already exists.") => new CustomError(409, message); // ใช้สำหรับ Register (Email ซ้ำ)
CustomError.unprocessableEntity = (message = "Validation failed. Input data is invalid.") => new CustomError(422, message);

module.exports = CustomError;