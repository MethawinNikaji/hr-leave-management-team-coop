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
 * Checks if a given check-in time is considered late (later than 9:00:00).
 */
const isLateCheckIn = (checkInTime) => {
    const checkInMoment = moment(checkInTime).tz(TIMEZONE);
    const standardCheckInMoment = checkInMoment.clone()
        .set({ hour: 9, minute: 0, second: 0, millisecond: 0 });

    return checkInMoment.isAfter(standardCheckInMoment, 'second');
};

/**
 * Formats a Date object to YYYY-MM-DD (Date only format for DB storage).
 */
const formatDateOnly = (date) => {
    return moment(date).tz(TIMEZONE).format('YYYY-MM-DD');
};

module.exports = {
    getCurrentTimeInTimezone,
    isLateCheckIn,
    formatDateOnly,
    TIMEZONE
};