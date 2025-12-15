// backend/src/services/timeRecord.service.js

const prisma = require('../models/prisma');
const CustomError = require('../utils/customError');
const moment = require('moment-timezone');
const { getCurrentTimeInTimezone, isLateCheckIn, formatDateOnly } = require('../utils/time.utils');

/**
 * Handles the employee's check-in operation.
 */
const checkIn = async (employeeId) => {
    const now = getCurrentTimeInTimezone().toDate();
    const todayDateOnly = formatDateOnly(now);

    // 1. ตรวจสอบว่ามีการ Check-in ไปแล้วหรือยัง
    const existingRecord = await prisma.timeRecord.findUnique({
        where: {
            employeeId_workDate: {
                employeeId: employeeId,
                workDate: todayDateOnly,
            },
        },
    });

    if (existingRecord) {
        throw CustomError.conflict(`Employee ID ${employeeId} has already checked in today (${todayDateOnly}).`);
    }

    // 2. คำนวณสถานะการมาสาย
    const lateStatus = isLateCheckIn(now);

    // 3. สร้าง TimeRecord
    const newRecord = await prisma.timeRecord.create({
        data: {
            employeeId: employeeId,
            workDate: todayDateOnly,
            checkInTime: now,
            isLate: lateStatus,
        },
    });

    return newRecord;
};

/**
 * Handles the employee's check-out operation.
 */
const checkOut = async (employeeId) => {
    const now = getCurrentTimeInTimezone().toDate();
    const todayDateOnly = formatDateOnly(now);

    // 1. ค้นหา Record ของวันนี้ที่ยังไม่ได้ Check-out
    const existingRecord = await prisma.timeRecord.findUnique({
        where: {
            employeeId_workDate: {
                employeeId: employeeId,
                workDate: todayDateOnly,
            },
        },
    });

    if (!existingRecord || existingRecord.checkOutTime) {
        throw CustomError.badRequest(existingRecord ? "Employee has already checked out today." : "Cannot check out: Employee has not checked in today.");
    }
    
    if (moment(now).isBefore(existingRecord.checkInTime)) {
        throw CustomError.badRequest("Check-out time cannot be earlier than check-in time.");
    }

    // 2. Update Record
    const updatedRecord = await prisma.timeRecord.update({
        where: { recordId: existingRecord.recordId },
        data: { checkOutTime: now },
    });

    return updatedRecord;
};

module.exports = {
    checkIn,
    checkOut,
};