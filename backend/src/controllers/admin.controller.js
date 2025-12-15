// backend/src/controllers/admin.controller.js

const prisma = require('../models/prisma');
const CustomError = require('../utils/customError');

// --- Leave Type Management (CRUD) ---
const getLeaveTypes = async (req, res, next) => {
    try {
        const types = await prisma.leaveType.findMany({ orderBy: { typeName: 'asc' } });
        res.status(200).json({ success: true, types });
    } catch (error) { next(error); }
};
const createLeaveType = async (req, res, next) => {
    try {
        const { typeName, isPaid } = req.body;
        const newType = await prisma.leaveType.create({ data: { typeName, isPaid: isPaid !== undefined ? isPaid : true } });
        res.status(201).json({ success: true, message: 'Leave type created.', type: newType });
    } catch (error) { next(error); }
};
const updateLeaveType = async (req, res, next) => {
    try {
        const leaveTypeId = parseInt(req.params.leaveTypeId);
        const { typeName, isPaid } = req.body;
        const updatedType = await prisma.leaveType.update({ where: { leaveTypeId }, data: { typeName, isPaid } });
        res.status(200).json({ success: true, message: 'Leave type updated.', type: updatedType });
    } catch (error) {
        if (error.code === 'P2025') { return next(CustomError.notFound(`Leave type ID ${req.params.leaveTypeId} not found.`)); }
        next(error);
    }
};
const deleteLeaveType = async (req, res, next) => {
    try {
        await prisma.leaveType.delete({ where: { leaveTypeId: parseInt(req.params.leaveTypeId) } });
        res.status(200).json({ success: true, message: 'Leave type deleted successfully.' });
    } catch (error) {
        if (error.code === 'P2025') { return next(CustomError.notFound(`Leave type ID ${req.params.leaveTypeId} not found.`)); }
        next(error);
    }
};

// --- Leave Quota Management (CRUD) ---
const getQuotas = async (req, res, next) => {
    try {
        const quotas = await prisma.leaveQuota.findMany({
            include: { employee: { select: { employeeId: true, firstName: true, lastName: true } }, leaveType: true },
            orderBy: [{ year: 'desc' }, { employeeId: 'asc' }]
        });
        res.status(200).json({ success: true, quotas });
    } catch (error) { next(error); }
};
const createQuota = async (req, res, next) => {
    try {
        const { employeeId, leaveTypeId, year, totalDays } = req.body;
        const newQuota = await prisma.leaveQuota.create({
            data: { employeeId, leaveTypeId, year, totalDays: parseFloat(totalDays), usedDays: 0.00 }
        });
        res.status(201).json({ success: true, message: 'Quota assigned.', quota: newQuota });
    } catch (error) { next(error); }
};
const updateQuota = async (req, res, next) => {
    try {
        const updatedQuota = await prisma.leaveQuota.update({
            where: { quotaId: parseInt(req.params.quotaId) },
            data: { totalDays: parseFloat(req.body.totalDays) },
        });
        res.status(200).json({ success: true, message: 'Quota updated.', quota: updatedQuota });
    } catch (error) {
        if (error.code === 'P2025') { return next(CustomError.notFound(`Quota ID ${req.params.quotaId} not found.`)); }
        next(error);
    }
};

// --- Holiday Management (CRUD) ---
const getHolidays = async (req, res, next) => {
    try {
        const holidays = await prisma.holiday.findMany({ orderBy: { holidayDate: 'asc' } });
        res.status(200).json({ success: true, holidays });
    } catch (error) { next(error); }
};
const createHoliday = async (req, res, next) => {
    try {
        const { holidayDate, holidayName } = req.body;
        const newHoliday = await prisma.holiday.create({ data: { holidayDate: new Date(holidayDate), holidayName } });
        res.status(201).json({ success: true, message: 'Holiday created.', holiday: newHoliday });
    } catch (error) { next(error); }
};
const deleteHoliday = async (req, res, next) => {
    try {
        await prisma.holiday.delete({ where: { holidayId: parseInt(req.params.holidayId) } });
        res.status(200).json({ success: true, message: 'Holiday deleted successfully.' });
    } catch (error) {
        if (error.code === 'P2025') { return next(CustomError.notFound(`Holiday ID ${req.params.holidayId} not found.`)); }
        next(error);
    }
};

module.exports = { getLeaveTypes, createLeaveType, updateLeaveType, deleteLeaveType, getQuotas, createQuota, updateQuota, getHolidays, createHoliday, deleteHoliday };