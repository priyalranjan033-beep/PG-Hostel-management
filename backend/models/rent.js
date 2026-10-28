
const mongoose = require('mongoose');

const rentSchema = new mongoose.Schema({
    tenant: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Tenant',
        required: true
    },
    month: {
        type: Number,
        required: true,
        min: 1,
        max: 12
    },
    year: {
        type: Number,
        required: true
    },
    rentAmount: {
        type: Number,
        required: true,
        min: 0
    },
    amountPaid: {
        type: Number,
        default: 0,
        min: 0
    },
    dueDate: {
        type: Date,
        required: true
    },
    status: {
        type: String,
        enum: ['Due', 'Paid', 'Overdue'],
        default: 'Due'
    }
}, {
    timestamps: true
});

rentSchema.index(
    { tenant: 1, month: 1, year: 1 },
    { unique: true }
);

module.exports = mongoose.model('Rent', rentSchema);
