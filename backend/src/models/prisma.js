// backend/src/models/prisma.js

const { PrismaClient } = require('@prisma/client');

/**
 * Global instance of PrismaClient.
 * This ensures we have a single, efficient connection pool to the database.
 */
const prisma = new PrismaClient({
    // ตั้งค่า log เพื่อดักจับ Error และ Warning จาก Prisma
    log: [
        { level: 'warn', emit: 'event' },
        { level: 'error', emit: 'event' },
    ],
});

// ดักจับ log event สำหรับการแจ้งเตือน Error
prisma.$on('error', (e) => {
    // แสดงข้อผิดพลาดที่เกิดขึ้นใน Prisma (เช่น connection issue)
    console.error('Prisma Error:', e.message);
});

module.exports = prisma;