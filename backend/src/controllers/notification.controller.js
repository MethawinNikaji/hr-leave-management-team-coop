// backend/src/controllers/notification.controller.js
const prisma = require('../models/prisma');
const CustomError = require('../utils/customError');

// ✅ AUDIT
const { logAudit } = require("../utils/auditLogger");
const { getClientIp } = require("../utils/requestMeta");
const safeAudit = async (payload) => {
  try { await logAudit(payload); } catch (e) { console.error("AUDIT_LOG_FAIL:", e?.message || e); }
};

// 1. ดึงการแจ้งเตือนของฉัน
exports.getMyNotifications = async (req, res, next) => {
  try {
    const myId = req.user.employeeId;

    const notifications = await prisma.notification.findMany({
      where: { employeeId: myId },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        relatedRequest: {
          include: {
            leaveType: { select: { typeName: true } },
            approvedByHR: { select: { firstName: true, lastName: true } },
          },
        },
        // ✅ ปรับส่วนนี้: ดึงรายการทั้งหมด (ไม่ใช้ take: 1) เพื่อให้เลือกแมตช์ ID ได้ถูกต้อง
        employee: {
          select: {
            profileUpdateRequests: {
              orderBy: { requestedAt: 'desc' },
              // ลบ take: 1 ออก เพื่อให้แจ้งเตือนใบเก่าๆ สามารถหาข้อมูลของตัวเองเจอ
              include: {
                // อ้างอิงตาม schema: ตาราง profileUpdateRequest มีฟิลด์ employeeId
                employee: { select: { firstName: true, lastName: true } } 
              }
            }
          }
        }
      },
    });

    const unreadCount = await prisma.notification.count({
      where: { employeeId: myId, isRead: false }
    });

    res.json({ success: true, notifications, unreadCount });
  } catch (error) {
    next(error);
  }
};

// 2. กดอ่าน (Mark as Read)
exports.markAsRead = async (req, res, next) => {
  try {
    const targetId = parseInt(req.params.id);
    const myId = Number(req.user.employeeId);

    const noti = await prisma.notification.findUnique({
      where: { notificationId: targetId }
    });

    if (!noti) throw CustomError.notFound('Notification not found');
    if (Number(noti.employeeId) !== myId) throw CustomError.forbidden('Not your notification');

    await prisma.notification.update({
      where: { notificationId: targetId },
      data: { isRead: true }
    });

    await safeAudit({
      action: "NOTIFICATION_MARK_READ",
      entity: "Notification",
      entityKey: `Notification:${targetId}`,
      oldValue: { isRead: false },
      newValue: { isRead: true },
      performedByEmployeeId: myId,
      ipAddress: getClientIp(req),
    });

    res.json({ success: true, message: 'Marked as read' });
  } catch (error) {
    next(error);
  }
};

// ฟังก์ชันสำหรับกดอ่านทั้งหมด
exports.markAllAsRead = async (req, res, next) => {
  try {
    const myId = Number(req.user.employeeId);

    await prisma.notification.updateMany({
      where: {
        employeeId: myId,
        isRead: false
      },
      data: {
        isRead: true
      }
    });

    await safeAudit({
      action: "NOTIFICATION_MARK_ALL_READ",
      entity: "Notification",
      entityKey: `Employee:${myId}`,
      oldValue: null,
      newValue: { employeeId: myId },
      performedByEmployeeId: myId,
      ipAddress: getClientIp(req),
    });

    res.json({ success: true, message: 'อ่านการแจ้งเตือนทั้งหมดแล้ว' });
  } catch (error) {
    next(error);
  }
};

// 3. ลบแจ้งเตือนทั้งหมด (Clear All)
exports.clearAll = async (req, res, next) => {
  try {
    const myId = Number(req.user.employeeId);

    await prisma.notification.deleteMany({
      where: { employeeId: myId }
    });

    await safeAudit({
      action: "NOTIFICATION_CLEAR_ALL",
      entity: "Notification",
      entityKey: `Employee:${myId}`,
      oldValue: null,
      newValue: { employeeId: myId },
      performedByEmployeeId: myId,
      ipAddress: getClientIp(req),
    });

    res.json({ success: true, message: 'All notifications cleared' });
  } catch (error) {
    next(error);
  }
};

// 4. ลบแจ้งเตือนแบบเลือก
exports.deleteNoti = async (req, res, next) => {
  try {
    const targetId = parseInt(req.params.id);
    const myId = Number(req.user.employeeId);

    const result = await prisma.notification.deleteMany({
      where: {
        notificationId: targetId,
        employeeId: myId
      }
    });

    if (result.count === 0) {
      return res.status(404).json({ success: false, message: "ไม่พบการแจ้งเตือน หรือไม่มีสิทธิ์ลบ" });
    }

    await safeAudit({
      action: "NOTIFICATION_DELETE_ONE",
      entity: "Notification",
      entityKey: `Notification:${targetId}`,
      oldValue: null,
      newValue: null,
      performedByEmployeeId: myId,
      ipAddress: getClientIp(req),
    });

    res.json({ success: true, message: 'ลบการแจ้งเตือนสำเร็จ' });
  } catch (error) {
    next(error);
  }
};
