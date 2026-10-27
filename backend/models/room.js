const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema({
    roomNumber: {
        type: String,
        required: true
    },
    totalBeds: {
        type: Number,
        required: true
    },
    rent: {
        type: Number,
        required: true
    },
    occupiedBeds: {
        type: Number,
        default: 0
    }
});

module.exports = mongoose.model('Room', roomSchema);