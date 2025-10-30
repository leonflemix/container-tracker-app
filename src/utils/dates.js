// File: src/utils/dates.js
// Location: src/utils

export const safeToDate = (timestamp) => {
    // Accept Firebase Timestamp, JS Date, and object with seconds
    if (!timestamp) return null;
    if (timestamp.toDate && typeof timestamp.toDate === 'function') {
        try { return timestamp.toDate(); } catch { /* fallthrough */ }
    }
    if (timestamp instanceof Date) return timestamp;
    if (typeof timestamp.seconds === 'number') return new Date(timestamp.seconds * 1000);
    return null;
};

export const calculateDaysBetween = (start, end) => {
    const startDate = safeToDate(start);
    const endDate = safeToDate(end);
    if (!startDate || !endDate) return 0;
    const oneDay = 1000 * 60 * 60 * 24;
    return Math.max(0, Math.floor((endDate - startDate) / oneDay));
};
