
const { test } = require('node:test');
const assert = require('node:assert/strict');
const calculateRent = require('../utils/rentCalculator');

test('calculates full month rent', () => {
    assert.equal(
        calculateRent(3000, '2026-10-01', '2026-10-31'),
        3000
    );
});

test('calculates prorated rent for half a month', () => {
    assert.equal(
        calculateRent(3000, '2026-10-16', '2026-10-31'),
        1548
    );
});

test('calculates rent for one day', () => {
    assert.equal(
        calculateRent(3000, '2026-10-01', '2026-10-01'),
        97
    );
});

test('rejects negative rent', () => {
    assert.throws(
        () => calculateRent(-100, '2026-10-01', '2026-10-31'),
        /Rent cannot be negative/
    );
});

test('rejects start date after end date', () => {
    assert.throws(
        () => calculateRent(3000, '2026-10-20', '2026-10-10'),
        /Start date cannot be after end date/
    );
});

test('rejects invalid dates', () => {
    assert.throws(
        () => calculateRent(3000, 'invalid', '2026-10-31'),
        /Invalid dates/
    );
});
