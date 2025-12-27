const timeRecordService = require('../services/timeRecord.service');
const prisma = require('../models/prisma');
const moment = require('moment-timezone');

const handleCheckIn = async (req, res, next) => {
    try {
        const employeeId = req.user.employeeId;
        const record = await timeRecordService.checkIn(employeeId);
        
        const message = record.isLate ? 'Check-in successful, but recorded as LATE.' : 'Check-in successful.';
        res.status(201).json({ success: true, message, record });
    } catch (error) { next(error); }
};

const handleCheckOut = async (req, res, next) => {
    try {
        const employeeId = req.user.employeeId;
        const record = await timeRecordService.checkOut(employeeId);
        res.status(200).json({ success: true, message: 'Check-out successful.', record });
    } catch (error) { next(error); }
};

const getMyTimeRecords = async (req, res, next) => {
    try {
        const employeeId = req.user.employeeId;
        const { startDate, endDate } = req.query;

        const records = await prisma.timeRecord.findMany({
            where: {
                employeeId,
                workDate: {
                    ...(startDate && { gte: new Date(startDate) }),
                    ...(endDate && { lte: new Date(endDate) }),
                }
            },
            orderBy: { workDate: 'desc' }
        });
        res.status(200).json({ success: true, records });
    } catch (error) { next(error); }
};

const getAllTimeRecords = async (req, res, next) => {
    try {
        const { startDate, endDate, employeeId } = req.query; 

        const records = await prisma.timeRecord.findMany({
            where: {
                workDate: {
                    ...(startDate && { gte: new Date(startDate) }), 
                    ...(endDate && { lte: new Date(endDate) }),
                },
                ...(employeeId && { employeeId: parseInt(employeeId) })
            },
            include: { employee: { select: { employeeId: true, firstName: true, lastName: true } } },
            orderBy: { workDate: 'desc' }
        });
        res.status(200).json({ success: true, records });
    } catch (error) { next(error); }
};

const getMonthlyLateSummary = async (req, res, next) => {
    try {
        const employeeId = req.user.employeeId;
        const startOfMonth = moment().startOf('month').toDate();
        const endOfMonth = moment().endOf('month').toDate();
        
        const lateCount = await prisma.timeRecord.count({
            where: {
                employeeId: employeeId,
                isLate: true,
                workDate: {
                    gte: startOfMonth,
                    lte: endOfMonth,
                }
            }
        });

        res.status(200).json({ 
            success: true, 
            lateCount, 
            lateLimit: 5, 
            isExceeded: lateCount > 5 
        });
    } catch (error) { 
        next(error); 
    }
};

// 📊 1. API ดึงสถิติการมาสายของเดือนนี้
const getMonthlyLateStats = async (req, res, next) => {
    try {
        const today = new Date();
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

        const records = await prisma.timeRecord.findMany({
            where: {
                workDate: {
                    gte: startOfMonth,
                    lte: endOfMonth
                },
                isLate: true
            },
            orderBy: { workDate: 'asc' }
        });

        const stats = {};
        records.forEach(rec => {
            const day = new Date(rec.workDate).getDate(); 
            stats[day] = (stats[day] || 0) + 1;
        });

        const chartData = Object.keys(stats).map(day => ({
            day: `Day ${day}`,
            count: stats[day]
        }));

        res.json({ success: true, data: chartData });
    } catch (error) {
        next(error);
    }
};

// 📄 2. API Export CSV
const exportAttendanceCSV = async (req, res, next) => {
    try {
        const records = await prisma.timeRecord.findMany({
            include: { employee: { select: { firstName: true, lastName: true } } },
            orderBy: { workDate: 'desc' }
        });

        let csv = 'Date,Employee Name,Check In,Check Out,Status\n';

        records.forEach(rec => {
            const name = `"${rec.employee.firstName} ${rec.employee.lastName}"`;
            const date = new Date(rec.workDate).toLocaleDateString();
            const checkIn = rec.checkInTime ? new Date(rec.checkInTime).toLocaleTimeString() : '-';
            const checkOut = rec.checkOutTime ? new Date(rec.checkOutTime).toLocaleTimeString() : '-';
            const status = rec.isLate ? 'Late' : 'On Time'; 

            csv += `${date},${name},${checkIn},${checkOut},${status}\n`;
        });

        res.header('Content-Type', 'text/csv');
        res.attachment('attendance_report.csv');
        return res.send(csv);

    } catch (error) {
        next(error);
    }
};

const getTopLateEmployees = async (req, res, next) => {
    try {
        const { month } = req.query; // เช่น "2025-12"
        const startOfMonth = moment(month).startOf('month').toDate();
        const endOfMonth = moment(month).endOf('month').toDate();

        const lateStats = await prisma.timeRecord.groupBy({
            by: ['employeeId'],
            where: {
                workDate: { gte: startOfMonth, lte: endOfMonth },
                isLate: true
            },
            _count: { isLate: true },
            orderBy: { _count: { isLate: 'desc' } },
            take: 5
        });

        const result = await Promise.all(lateStats.map(async (item) => {
            const emp = await prisma.employee.findUnique({
                where: { employeeId: item.employeeId },
                select: { firstName: true, lastName: true }
            });
            return {
                employeeId: item.employeeId,
                name: `${emp.firstName} ${emp.lastName}`,
                lateCount: item._count.isLate
            };
        }));

        res.json({ success: true, data: result });
    } catch (error) { next(error); }
};

// 👇 บรรทัดนี้สำคัญมากครับ ต้องมีปิดท้ายไฟล์เสมอ ห้ามขาด!
module.exports = { 
    handleCheckIn, 
    handleCheckOut, 
    getMyTimeRecords, 
    getAllTimeRecords, 
    getMonthlyLateSummary, 
    getMonthlyLateStats, 
    exportAttendanceCSV,
    getTopLateEmployees
};