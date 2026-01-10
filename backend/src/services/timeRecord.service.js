const prisma = require('../models/prisma');
const CustomError = require('../utils/customError');
const moment = require('moment-timezone');
// 🔥 ปรับ Import: เอา isLateCheckIn ออก และนำ checkIsLate เข้ามาแทน
const { getCurrentTimeInTimezone, formatDateOnly, checkIsLate, TIMEZONE } = require('../utils/time.utils');

/**
 * Handles the employee's check-in operation.
 */
const checkIn = async (employeeId) => {
    const nowMoment = getCurrentTimeInTimezone();
    const now = nowMoment.toDate();
    const todayStr = formatDateOnly(now);

    // 1. ดึงข้อมูลเบื้องต้น: Record วันนี้, Policy, และใบลาที่ Approved
    const [existingRecord, policy, leave] = await Promise.all([
        prisma.timeRecord.findUnique({
            where: { employeeId_workDate: { employeeId, workDate: new Date(todayStr) } }
        }),
        prisma.attendancePolicy.findFirst({ where: { policyId: 1 } }),
        prisma.leaveRequest.findFirst({
            where: {
                employeeId,
                status: 'Approved',
                startDate: { lte: new Date(todayStr) },
                endDate: { gte: new Date(todayStr) }
            }
        })
    ]);

    if (existingRecord) throw CustomError.conflict("คุณได้เช็คอินไปแล้วในวันนี้");
    if (!policy) throw CustomError.notFound("ไม่พบการตั้งค่านโยบายการเข้างาน");

    // 🚩 อุดช่องโหว่ข้อ 5: เช็ควันหยุด (Special Holidays จาก Policy)
    if (policy.specialHolidays?.includes(todayStr)) {
        throw CustomError.badRequest("วันนี้เป็นวันหยุดพิเศษตามนโยบาย ไม่สามารถลงเวลาได้");
    }

    let targetInTime = policy.startTime;
    let isLate = false;

    // 🚩 Logic 3.5 & 3.2: เช็คสถานะการลา
    if (leave) {
        // กรณีลาเต็มวัน (3.5)
        if (leave.startDuration === 'Full' || (leave.startDuration === 'HalfMorning' && leave.endDuration === 'HalfAfternoon')) {
            throw CustomError.badRequest("คุณมีการลาเต็มวันที่ได้รับอนุมัติแล้ว ไม่ต้องลงเวลาทำงาน");
        }

        // กรณีลาครึ่งวันเช้า (3.2)
        if (leave.startDuration === 'HalfMorning') {
            const breakStartMoment = moment.tz(`${todayStr} ${policy.breakStartTime}`, TIMEZONE);
            if (nowMoment.isBefore(breakStartMoment)) {
                throw CustomError.badRequest(`คุณลาครึ่งวันเช้า จะเริ่มเช็คอินได้ตั้งแต่เวลาพัก (${policy.breakStartTime}) เป็นต้นไป`);
            }
            // ใช้เวลาจบพักเป็นเกณฑ์เช็คสาย
            targetInTime = policy.breakEndTime;
        }
    }

    // คำนวณสถานะสาย
    isLate = checkIsLate(now, targetInTime, policy.graceMinutes);

    return await prisma.timeRecord.create({
        data: {
            employeeId,
            workDate: new Date(todayStr),
            checkInTime: now,
            isLate
        }
    });
};

/**
 * Handles the employee's check-out operation. (โค้ดส่วนนี้โอเคแล้วครับ)
 */
const checkOut = async (employeeId) => {
    const nowMoment = getCurrentTimeInTimezone();
    const now = nowMoment.toDate();
    const todayStr = formatDateOnly(now);

    const [existingRecord, policy, leave] = await Promise.all([
        prisma.timeRecord.findUnique({
            where: { employeeId_workDate: { employeeId, workDate: new Date(todayStr) } }
        }),
        prisma.attendancePolicy.findFirst({ where: { policyId: 1 } }),
        prisma.leaveRequest.findFirst({
            where: {
                employeeId,
                status: 'Approved',
                startDate: { lte: new Date(todayStr) },
                endDate: { gte: new Date(todayStr) }
            }
        })
    ]);

    if (!existingRecord) throw CustomError.badRequest("ไม่พบข้อมูลการเช็คอินของวันนี้");
    if (existingRecord.checkOutTime) throw CustomError.badRequest("คุณได้เช็คเอาท์ไปแล้ว");

    // กำหนดเวลาที่สามารถออกได้ (Earliest Exit Time)
    let earliestExitTimeStr = policy.endTime;

    // 🚩 Logic 3.3: ถ้าลาครึ่งบ่าย อนุญาตให้ออกได้ตั้งแต่ Break Start
    if (leave && (leave.endDuration === 'HalfAfternoon' || leave.startDuration === 'HalfAfternoon')) {
        earliestExitTimeStr = policy.breakStartTime;
    }

    const exitDeadline = moment.tz(`${todayStr} ${earliestExitTimeStr}`, TIMEZONE);

    // 🚩 อุดช่องโหว่ 3.3 & 3.4: เช็คว่าออกก่อนเวลาหรือไม่
    if (nowMoment.isBefore(exitDeadline)) {
        const msg = leave && (leave.endDuration === 'HalfAfternoon' || leave.startDuration === 'HalfAfternoon')
            ? `คุณลาครึ่งบ่าย แต่ยังไม่ถึงเวลาเริ่มพัก (${policy.breakStartTime})`
            : `ยังไม่ถึงเวลาเลิกงานตามนโยบาย (${policy.endTime})`; // หากพนักงานปกติ ก็แจ้งตาม Policy
        
        throw CustomError.badRequest(msg);
    }

    return await prisma.timeRecord.update({
        where: { recordId: existingRecord.recordId },
        data: { checkOutTime: now }
    });
};

module.exports = {
    checkIn,
    checkOut,
};