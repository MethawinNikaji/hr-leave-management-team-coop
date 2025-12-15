// backend/src/models/leave.model.js

const prisma = require('./prisma');

/**
 * Creates a new leave request.
 */
const createLeaveRequest = async (data) => {
    return prisma.leaveRequest.create({
        data,
    });
};

/**
 * Retrieves a single leave request by ID with relations.
 */
const getLeaveRequestById = async (requestId) => {
    return prisma.leaveRequest.findUnique({
        where: { requestId },
        include: {
            employee: { select: { employeeId: true, firstName: true, lastName: true, role: true } },
            leaveType: true,
            approvedByHR: { select: { employeeId: true, firstName: true, lastName: true } }
        }
    });
};

/**
 * Updates the status of a leave request (used in $transaction).
 */
const updateRequestStatusTx = async (requestId, status, hrId, tx) => {
    return tx.leaveRequest.update({
        where: { requestId },
        data: {
            status: status,
            approvedByHrId: hrId,
            approvalDate: new Date(),
        },
        // Select fields needed for notification
        select: {
            requestId: true,
            employeeId: true,
            leaveTypeId: true,
            status: true,
        }
    });
};

module.exports = {
    createLeaveRequest,
    getLeaveRequestById,
    updateRequestStatusTx,
};