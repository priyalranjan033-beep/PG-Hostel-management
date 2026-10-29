const mongoose = require('mongoose');

const tenantSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    phone: {
        type: String,
        required: true
    },
    room: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Room',
        required: true
    },
    bedNumber: {
        type: Number,
        required: true
    },
    rentPaid: {
        type: Boolean,
        default: false
    },
    complaint: {
        type: String,
        default: ''
    },
    complaintStatus: {
        type: String,
        default: 'Pending'
    },
    checkInDate: {
        type: Date,
        default: Date.now
    },
    checkOutDate: {
        type: Date,
        default: null
    },

    // Security deposit tracking
    securityDeposit: {
        type: Number,
        default: 0,
        min: 0
    },
    depositDeduction: {
        type: Number,
        default: 0,
        min: 0
    },
    deductionReason: {
        type: String,
        default: ''
    },
    depositRefunded: {
        type: Number,
        default: 0,
        min: 0
    },
    depositSettled: {
        type: Boolean,
        default: false
    }
});

module.exports = mongoose.model('Tenant', tenantSchema);