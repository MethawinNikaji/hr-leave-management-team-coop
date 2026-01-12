// backend/src/middlewares/error.middleware.js

const CustomError = require("../utils/customError");

/**
 * Global Error Handling Middleware.
 * Catches all errors and standardizes the response format.
 */
// ต้องรับ 4 arguments (err, req, res, next) เพื่อให้ Express รู้ว่าเป็น Error Middleware
const errorMiddleware = (err, req, res, next) => {
  // Debug log
  if (process.env.NODE_ENV === "development") {
    console.error("--- Global Error Handler Activated ---");
    console.error(err);
    console.error("--------------------------------------");
  }

  let statusCode = 500;
  let message = "Internal server error.";
  let meta = null;

  // ✅ CustomError (รองรับ i18n key + meta)
  if (err instanceof CustomError) {
    statusCode = err.statusCode || 500;
    message = err.message || message;
    meta = err.meta || null;
  } else {
    // Multer / Upload
    if (err?.name === "MulterError") {
      statusCode = 400;
      message = err.message || "Invalid file upload.";
    } else if (err?.name === "PrismaClientKnownRequestError") {
      // Prisma known errors (กันไว้แบบคร่าว ๆ)
      statusCode = 400;
      message = err.message || "Database error.";
    } else if (err?.name === "ValidationError") {
      statusCode = 422;
      message = err.message || "Validation failed.";
    } else if (err?.statusCode) {
      statusCode = err.statusCode;
      message = err.message || message;
    } else if (err?.message) {
      message = err.message;
    }

    // ถ้าเป็น error ที่ไม่ชัดเจน ให้กันไว้ไม่ส่ง 500 แบบเละ ๆ (optional)
    if (statusCode === 500 && (err?.name === "MulterError")) {
      statusCode = 400;
    }
  }

  // ส่ง Response กลับไปยัง Client (✅ ส่ง meta ไปด้วยถ้ามี)
  res.status(statusCode).json({
    success: false,
    message,
    meta: meta || undefined,
    statusCode,
  });
};

module.exports = errorMiddleware;
