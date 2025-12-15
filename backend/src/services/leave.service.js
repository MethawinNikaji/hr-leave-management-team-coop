// backend/src/services/leave.service.js

const prisma = require('../models/prisma');
const CustomError = require('../utils/customError');
const moment = require('moment-timezone');
const { TIMEZONE } = require('../utils/time.utils');

/**
 * Calculates the number of leave days requested (basic logic for half-days).
 */
const calculateTotalDays = (startDate, endDate, startDuration, endDuration) => {
    const start = moment(startDate).tz(TIMEZONE).startOf('day');
    const end = moment(endDate).tz(TIMEZONE).startOf('day');

    if (start.isAfter(end)) {
        throw CustomError.badRequest("Start date cannot be after end date.");
    }
    
    let totalDays = end.diff(start, 'days') + 1; 

    if (totalDays === 1) {
        totalDays = (startDuration === 'HalfMorning' || startDuration === 'HalfAfternoon') ? 0.5 : 1.0;
    } else if (totalDays > 1) {
        if (startDuration === 'HalfMorning' || startDuration === 'HalfAfternoon') {
            totalDays -= 0.5;
        }
        if (endDuration === 'HalfMorning' || endDuration === 'HalfAfternoon') {
            totalDays -= 0.5;
        }
        if (totalDays <= 0) {
            throw CustomError.badRequest("Total days requested must be greater than zero after duration adjustment.");
        }
    }

    return parseFloat(totalDays.toFixed(2));
};

/**
 * Checks if the employee has enough quota.
 */
const checkQuotaAvailability = async (employeeId, leaveTypeId, requestedDays, year) => {
    const leaveType = await prisma.leaveType.findUnique({ where: { leaveTypeId } });
    
    // ถ้าไม่ได้รับค่าจ้าง (เช่น ลาป่วยที่ไม่มีโควต้าจำกัด) ไม่ต้องเช็ค
    if (!leaveType || leaveType.isPaid === false) { 
         return true; 
    }

    const quota = await prisma.leaveQuota.findUnique({
        where: {
            employeeId_leaveTypeId_year: {
                employeeId,
                leaveTypeId,
                year,
            },
        },
    });

    if (!quota) {
        throw CustomError.badRequest(`No paid leave quota assigned for this type (${leaveType.typeName}) and year.`);
    }

    const availableDays = parseFloat((quota.totalDays.toNumber() - quota.usedDays.toNumber()).toFixed(2));

    if (requestedDays > availableDays) {
        throw CustomError.conflict(`Insufficient quota. Available: ${availableDays} days. Requested: ${requestedDays} days.`);
    }

    return quota;
};

/**
 * Updates the usedDays in LeaveQuota. MUST be called inside a transaction.
 */
const updateUsedQuota = async (employeeId, leaveTypeId, requestedDays, year, tx) => {
    const currentQuota = await tx.leaveQuota.findUnique({
        where: {
            employeeId_leaveTypeId_year: {
                employeeId,
                leaveTypeId,
                year,
            },
        },
    });

    if (!currentQuota) return; // ไม่ต้องอัปเดตถ้าไม่มีโควต้า (Non-paid leave)
    
    const newUsedDays = parseFloat((currentQuota.usedDays.toNumber() + requestedDays).toFixed(2));
    
    if (newUsedDays < 0) {
        throw CustomError.badRequest("Quota update resulted in negative used days.");
    }

    await tx.leaveQuota.update({
        where: { quotaId: currentQuota.quotaId },
        data: { usedDays: newUsedDays },
    });
};

module.exports = {
    calculateTotalDays,
    checkQuotaAvailability,
    updateUsedQuota,
};