
function calculateRent(monthlyRent, startDate, endDate) {
    if (monthlyRent < 0) {
        throw new Error('Rent cannot be negative');
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        throw new Error('Invalid dates');
    }

    if (start > end) {
        throw new Error('Start date cannot be after end date');
    }

    const daysInMonth = new Date(
        end.getFullYear(),
        end.getMonth() + 1,
        0
    ).getDate();

    const startDay = start.getDate();
    const endDay = end.getDate();

    const occupiedDays = endDay - startDay + 1;

    return Math.round(
        (monthlyRent / daysInMonth) * occupiedDays
    );
}

module.exports = calculateRent;
