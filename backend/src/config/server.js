// backend/src/config/server.js

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const errorMiddleware = require('../middlewares/error.middleware');

// Routes Import (จะสร้างไฟล์เหล่านี้ในขั้นตอนถัดไป)
const authRoute = require('../routes/auth.route');
const adminRoute = require('../routes/admin.route');
const timeRecordRoute = require('../routes/timeRecord.route');
const leaveRequestRoute = require('../routes/leaveRequest.route');

/**
 * Creates and configures the Express application instance.
 * @returns {object} The configured Express app.
 */
const createApp = () => {
    const app = express();

    // favicon.ico ไม่ให้แจ้ง Error
    app.get('/favicon.ico', (req, res) => res.status(204).end());

    // 1. Security Middleware
    app.use(helmet()); 
    app.use(cors({
        // ใน Production ควรระบุ origin ที่ชัดเจน
        origin: process.env.NODE_ENV === 'development' ? '*' : 'http://yourfrontenddomain.com', 
        methods: ['GET', 'POST', 'PUT', 'DELETE'],
        credentials: true
    }));
    
    // 2. Body Parser
    app.use(express.json()); 
    app.use(express.urlencoded({ extended: true })); 

    // 3. Health Check Route
    app.get('/', (req, res) => {
        res.status(200).json({ status: 'ok', message: 'HR/Leave Management API is running.' });
    });

    // 4. API Routes Definition
    app.use('/api/auth', authRoute);
    app.use('/api/admin', adminRoute); 
    app.use('/api/timerecord', timeRecordRoute);
    app.use('/api/leave', leaveRequestRoute);

    // 5. Not Found Route Handler (404)
    app.use((req, res, next) => {
        // ใช้ Custom Error เพื่อส่ง 404
        const CustomError = require('../utils/customError');
        next(CustomError.notFound(`Cannot find ${req.method} ${req.originalUrl}.`));
    });

    // 6. Global Error Handling Middleware (ต้องอยู่ท้ายสุด)
    app.use(errorMiddleware);

    return app;
};

module.exports = createApp;