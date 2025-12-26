// backend/src/utils/time.utils.js

const moment = require('moment-timezone');

// ตั้งค่า Timezone หลักจาก .env หรือใช้ค่าเริ่มต้น (Asia/Bangkok)
const TIMEZONE = process.env.TIMEZONE || 'Asia/Bangkok';
const STANDARD_CHECK_IN_TIME = '09:00:00'; 

/**
 * Returns the current time in the specified timezone using moment-timezone.
 */
const getCurrentTimeInTimezone = () => {
    return moment().tz(TIMEZONE);
};

/**
 * Formats a Date object to YYYY-MM-DD (Date only format for DB storage).
 */
const formatDateOnly = (date) => {
    return moment(date).tz(TIMEZONE).format('YYYY-MM-DD');
};

// ฟังก์ชันสำหรับเช็คว่าสายหรือไม่ โดยเทียบกับนโยบายใน DB
const checkIsLate = (checkInTime, policy) => {
  const { startTime, graceMinutes } = policy;
  
  // แปลงเวลาเข้างานปัจจุบันเป็น Moment เพื่อดึงเฉพาะ ชั่วโมง:นาที
  const now = moment(checkInTime).tz("Asia/Bangkok");
  
  // สร้างเวลาที่เป็นเส้นตาย (Deadline) ของวันนี้จาก Policy
  const [hour, minute] = startTime.split(":").map(Number);
  const deadline = moment(checkInTime).tz("Asia/Bangkok")
    .hour(hour)
    .minute(minute + graceMinutes) // รวมเวลาผ่อนผันแล้ว
    .second(0);

  return now.isAfter(deadline);
};

module.exports = {
    getCurrentTimeInTimezone,
    formatDateOnly,
    checkIsLate,
    TIMEZONE
};