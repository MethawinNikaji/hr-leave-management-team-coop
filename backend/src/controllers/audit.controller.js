const prisma = require("../models/prisma");

exports.getAuditLogs = async (req, res, next) => {
  try {
    const logs = await prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 200,
      include: {
        performer: {
          select: {
            employeeId: true,
            firstName: true,
            lastName: true,
            role: true,
          },
        },
      },
    });

    res.json(logs);
  } catch (err) {
    next(err);
  }
};
