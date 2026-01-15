const prisma = require('../models/prisma');
const CustomError = require('../utils/customError');
const { logAudit } = require("../utils/auditLogger");

const getDepartments = async (req, res, next) => {
    try {
        const departments = await prisma.department.findMany({
            orderBy: { deptName: 'asc' },
            include: {
                _count: {
                    select: { employees: true }
                }
            }
        });
        res.status(200).json({ success: true, departments });
    } catch (error) {
        next(error);
    }
};

const createDepartment = async (req, res, next) => {
    try {
        const { deptName, description } = req.body;
        if (!deptName) throw new CustomError(400, "Department name is required.");

        const existing = await prisma.department.findUnique({ where: { deptName } });
        if (existing) throw new CustomError(400, "Department name already exists.");

        const newDept = await prisma.department.create({
            data: { deptName, description }
        });

        await logAudit({
            action: "DEPARTMENT_CREATE",
            entity: "Department",
            entityKey: `Department:${newDept.deptId}`,
            newValue: newDept,
            performedByEmployeeId: req.user.employeeId,
            ipAddress: req.ip
        });

        res.status(201).json({ success: true, department: newDept });
    } catch (error) {
        next(error);
    }
};

const updateDepartment = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { deptName, description } = req.body;

        const oldDept = await prisma.department.findUnique({ where: { deptId: Number(id) } });
        if (!oldDept) throw new CustomError(404, "Department not found.");

        const updated = await prisma.department.update({
            where: { deptId: Number(id) },
            data: { deptName, description }
        });

        await logAudit({
            action: "DEPARTMENT_UPDATE",
            entity: "Department",
            entityKey: `Department:${id}`,
            oldValue: oldDept,
            newValue: updated,
            performedByEmployeeId: req.user.employeeId,
            ipAddress: req.ip
        });

        res.status(200).json({ success: true, department: updated });
    } catch (error) {
        next(error);
    }
};

const deleteDepartment = async (req, res, next) => {
    try {
        const { id } = req.params;

        // Check if any employees in this department
        const count = await prisma.employee.count({ where: { departmentId: Number(id) } });
        if (count > 0) throw new CustomError(400, "Cannot delete department with assigned employees.");

        const oldDept = await prisma.department.findUnique({ where: { deptId: Number(id) } });
        await prisma.department.delete({ where: { deptId: Number(id) } });

        await logAudit({
            action: "DEPARTMENT_DELETE",
            entity: "Department",
            entityKey: `Department:${id}`,
            oldValue: oldDept,
            performedByEmployeeId: req.user.employeeId,
            ipAddress: req.ip
        });

        res.status(200).json({ success: true, message: "Department deleted." });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getDepartments,
    createDepartment,
    updateDepartment,
    deleteDepartment
};
