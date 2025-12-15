// backend/src/server.js

const dotenv = require('dotenv');
// โหลด environment variables จาก .env
dotenv.config({ path: './.env' }); 

const http = require('http');
const createApp = require('./config/server');
const notificationService = require('./services/notification.service'); 
const prisma = require('./models/prisma'); // เพื่อให้มั่นใจว่า connection ถูกสร้าง

const PORT = process.env.PORT || 8000;

const app = createApp();
const server = http.createServer(app);

// Initialize Web Socket Server
notificationService.initializeWebSocket(server);

// Start Listening
server.listen(PORT, async () => {
    try {
        // ตรวจสอบการเชื่อมต่อ DB
        await prisma.$connect();
        console.log('✅ Database connected successfully.');
        console.log(`🚀 Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
    } catch (error) {
        console.error('❌ Failed to connect to database or start server:', error.message);
        process.exit(1);
    }
});

// จัดการ Unhandled Rejection (ป้องกัน Process Crash)
process.on('unhandledRejection', (err) => {
    console.error('UNHANDLED REJECTION! 💥 Shutting down...');
    console.error(err.name, err.message);
    server.close(() => {
        process.exit(1); // ออกจาก Process
    });
});