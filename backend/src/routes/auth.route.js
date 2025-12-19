// backend/src/routes/auth.route.js

const express = require('express');
const { body } = require('express-validator');
const authController = require('../controllers/auth.controller');
const { validate } = require('../middlewares/validation.middleware');
const authenticateToken = require('../middlewares/auth.middleware');

const router = express.Router();

// --- 1. Register Route (สมัครสมาชิก) ---
router.post(
    '/register',
    [
        // Validation Checks using express-validator
        body('email').isEmail().withMessage('Invalid email format.'),
        body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long.'),
        body('firstName').notEmpty().withMessage('First name is required.'),
        body('lastName').notEmpty().withMessage('Last name is required.'),
        // joiningDate ต้องเป็น YYYY-MM-DD
        body('joiningDate').isISO8601().toDate().withMessage('Joining date must be a valid date (YYYY-MM-DD).'),
        // Middleware ที่จะโยน Error 422 หาก validation ล้มเหลว
        validate
    ],
    authController.register
);

// --- 2. Login Route (เข้าสู่ระบบ) ---
router.post(
    '/login',
    [
        // Validation Checks
        body('email').isEmail().withMessage('Invalid email format.'),
        body('password').notEmpty().withMessage('Password is required.'),
        validate
    ],
    authController.login
);

router.get('/me', authenticateToken, authController.getMe);

module.exports = router;