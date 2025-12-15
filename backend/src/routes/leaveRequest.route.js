// backend/src/routes/leaveRequest.route.js

const express = require('express');
const { body, param } = require('express-validator');
const leaveController = require('../controllers/leave.controller');
const authenticateToken = require('../middlewares/auth.middleware');
const { authorizeRole } = require('../middlewares/role.middleware');
const { validate } = require('../middlewares/validation.middleware');
const router = express.Router();

router.use(authenticateToken); 

// POST /api/leave/request (Worker submits request)
router.post(
    '/request',
    authorizeRole(['Worker', 'HR']),
    [
        body('leaveTypeId').isInt().withMessage('Leave Type ID must be an integer.'),
        body('startDate').isISO8601().toDate().withMessage('Start date must be a valid date (YYYY-MM-DD).'),
        body('endDate').isISO8601().toDate().custom((value, { req }) => {
            if (new Date(value) < new Date(req.body.startDate)) {
                throw new Error('End date cannot be before start date.');
            }
            return true;
        }),
        body('startDuration').isIn(['Full', 'HalfMorning', 'HalfAfternoon']).withMessage('Invalid start duration.'),
        body('endDuration').isIn(['Full', 'HalfMorning', 'HalfAfternoon']).withMessage('Invalid end duration.'),
        body('reason').optional().isString().trim(),
        validate
    ],
    leaveController.requestLeave
);

// GET /api/leave/my
router.get('/my', authorizeRole(['Worker', 'HR']), leaveController.getMyRequests);

// GET /api/leave/admin/pending (HR views all pending requests)
router.get('/admin/pending', authorizeRole(['HR']), leaveController.getAllPendingRequests);

// PUT /api/leave/admin/approval/:requestId (HR approves/rejects)
router.put(
    '/admin/approval/:requestId',
    authorizeRole(['HR']),
    [
        param('requestId').isInt().withMessage('Request ID must be an integer.'),
        body('action').isIn(['approve', 'reject']).withMessage('Action must be "approve" or "reject".'),
        validate
    ],
    leaveController.handleApproval
);

// GET /api/leave/:requestId (Shared detail view)
router.get(
    '/:requestId',
    authorizeRole(['Worker', 'HR']),
    [ param('requestId').isInt().withMessage('Request ID must be an integer.'), validate ],
    leaveController.getRequestDetail
);

module.exports = router;