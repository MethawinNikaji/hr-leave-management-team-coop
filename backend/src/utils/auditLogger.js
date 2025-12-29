// backend/src/utils/auditLogger.js
const prisma = require("../models/prisma");

const logAudit = async ({
  action,
  entity,
  entityKey = null,
  oldValue = null,
  newValue = null,
  performedByEmployeeId,
  ipAddress = null,
}) => {
  return prisma.auditLog.create({
    data: {
      action,
      entity,
      entityKey,
      oldValue,
      newValue,
      performedByEmployeeId: Number(performedByEmployeeId),
      ipAddress,
    },
  });
};

module.exports = { logAudit };
