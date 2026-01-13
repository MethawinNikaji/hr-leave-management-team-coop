// backend/src/utils/customError.js

/**
 * Custom Error Class for standardized API error responses.
 * Supports i18n message keys + meta for interpolation.
 */
class CustomError extends Error {
  /**
   * @param {number} statusCode - HTTP status code (e.g., 400, 401, 403, 404, 409, 422)
   * @param {string} message - Can be plain text OR i18n key (e.g. "errors.leave.insufficientQuota")
   * @param {object} meta - optional payload for interpolation (e.g. { pendingDays, available, requestedDays })
   */
  constructor(statusCode, message, meta = null) {
    super(message);
    this.statusCode = statusCode;
    this.meta = meta || null;

    // isOperational: แยก error ที่คาดการณ์ได้ ออกจาก error ของโปรแกรม
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      statusCode: this.statusCode,
      message: this.message,
      meta: this.meta || undefined,
    };
  }
}

// Factory methods
CustomError.badRequest = (message = "Invalid input or request.", meta = null) =>
  new CustomError(400, message, meta);

CustomError.unauthorized = (
  message = "Authentication failed. Invalid or missing token.",
  meta = null
) => new CustomError(401, message, meta);

CustomError.forbidden = (
  message = "Access denied. You do not have the required role.",
  meta = null
) => new CustomError(403, message, meta);

CustomError.notFound = (message = "Resource not found.", meta = null) =>
  new CustomError(404, message, meta);

CustomError.conflict = (
  message = "Resource conflict. Data already exists.",
  meta = null
) => new CustomError(409, message, meta);

CustomError.unprocessableEntity = (
  message = "Validation failed. Input data is invalid.",
  meta = null
) => new CustomError(422, message, meta);

module.exports = CustomError;
