// backend/src/controllers/auth.controller.js

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const authModel = require('../models/auth.model');
const CustomError = require('../utils/customError');

const SALT_ROUNDS = 10; // จำนวนรอบในการ Hashing

/**
 * Generates a JWT token for the authenticated user.
 * @param {object} employee - Employee object (must contain employeeId and role).
 * @returns {string} The generated JWT token.
 */
const generateToken = (employee) => {
    const payload = {
        employeeId: employee.employeeId,
        role: employee.role,
        // เพิ่มข้อมูลอื่นๆ ที่จำเป็น
    };

    return jwt.sign(payload, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN || '7d', // 7 วัน หรือตาม .env
    });
};


// --- Controller for Registration ---
const register = async (req, res, next) => {
    try {
        const { email, password, firstName, lastName, joiningDate, role } = req.body;

        // 1. Hashing Password
        const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

        // 2. สร้าง Employee
        const newEmployeeData = {
            email,
            passwordHash,
            firstName,
            lastName,
            // ในขั้นตอน Register นี้ เราจะตั้ง role เป็น Worker เสมอ 
            // HR จะต้องถูกสร้างโดย HR อีกคน หรือโดย seed data
            role: role === 'HR' ? 'HR' : 'Worker', 
            joiningDate: new Date(joiningDate), // แปลง string เป็น Date Object
        };

        const employee = await authModel.registerEmployee(newEmployeeData);

        // 3. สร้าง JWT Token และส่งกลับ
        const token = generateToken(employee);

        res.status(201).json({
            success: true,
            message: 'Registration successful.',
            token,
            user: {
                employeeId: employee.employeeId,
                email: employee.email,
                role: employee.role,
                firstName: employee.firstName,
                lastName: employee.lastName,
            }
        });

    } catch (error) {
        // ส่ง Error ไปที่ Global Error Handler (เช่น Prisma Unique Conflict 409)
        next(error); 
    }
};

// --- Controller for Login ---
const login = async (req, res, next) => {
    try {
        const { email, password } = req.body;

        // 1. ค้นหา Employee
        const employee = await authModel.findEmployeeByEmail(email);

        if (!employee) {
            // ใช้ Unauthorized เพื่อซ่อนว่าเป็นการไม่พบ Email หรือ Password ผิด
            throw CustomError.unauthorized('Invalid credentials.');
        }

        // 2. ตรวจสอบสถานะ isActive
        if (!employee.isActive) {
            throw CustomError.forbidden('Your account is currently inactive.');
        }

        // 3. เปรียบเทียบ Password
        const isMatch = await bcrypt.compare(password, employee.passwordHash);

        if (!isMatch) {
            throw CustomError.unauthorized('Invalid credentials.');
        }

        // 4. สร้าง JWT Token
        const token = generateToken(employee);

        // 5. ส่ง Response
        res.status(200).json({
            success: true,
            message: 'Login successful.',
            token,
            user: {
                employeeId: employee.employeeId,
                email: employee.email,
                role: employee.role,
                firstName: employee.firstName,
                lastName: employee.lastName,
            }
        });

    } catch (error) {
        next(error);
    }
};

module.exports = {
    register,
    login,
};