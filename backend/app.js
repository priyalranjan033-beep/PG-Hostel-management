const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const Rent = require('./models/rent');
const Room = require('./models/room');
const Tenant = require('./models/tenant');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/', (req, res) => {
    res.send('PG Hostel Manager Backend is running');
});

// Add room
app.post('/rooms', async (req, res) => {
    try {
        const room = await Room.create(req.body);
        res.json(room);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// View all rooms
app.get('/rooms', async (req, res) => {
    const rooms = await Room.find();
    res.json(rooms);
});

// Delete room if no active tenants
app.delete('/rooms/:id', async (req, res) => {
    const tenants = await Tenant.find({
        room: req.params.id,
        checkOutDate: null
    });

    if (tenants.length > 0) {
        return res.status(400).json({
            message: 'Room has active tenants'
        });
    }

    const room = await Room.findByIdAndDelete(req.params.id);

    if (!room) {
        return res.status(404).json({ message: 'Room not found' });
    }

    res.json({ message: 'Room deleted successfully' });
});

// Tenant check-in
app.post('/tenants', async (req, res) => {
    try {
        const { name, phone, room, bedNumber } = req.body;
        const selectedRoom = await Room.findById(room);

        if (!selectedRoom) {
            return res.status(404).json({ message: 'Room not found' });
        }

        if (bedNumber < 1 || bedNumber > selectedRoom.totalBeds) {
            return res.status(400).json({ message: 'Invalid bed number' });
        }

        if (selectedRoom.occupiedBeds >= selectedRoom.totalBeds) {
            return res.status(400).json({ message: 'Room is full' });
        }

        const bedTaken = await Tenant.findOne({
            room,
            bedNumber,
            checkOutDate: null
        });

        if (bedTaken) {
            return res.status(400).json({ message: 'Bed is already occupied' });
        }

        const tenant = await Tenant.create({
            name,
            phone,
            room,
            bedNumber
        });

        selectedRoom.occupiedBeds += 1;
        await selectedRoom.save();

        res.json(tenant);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// View all tenants
app.get('/tenants', async (req, res) => {
    const tenants = await Tenant.find().populate('room');
    res.json(tenants);
});

// Tenant check-out
app.put('/tenants/checkout/:id', async (req, res) => {
    const tenant = await Tenant.findById(req.params.id);

    if (!tenant) {
        return res.status(404).json({ message: 'Tenant not found' });
    }

    if (tenant.checkOutDate) {
        return res.status(400).json({ message: 'Tenant already checked out' });
    }

    tenant.checkOutDate = new Date();
    await tenant.save();

    const room = await Room.findById(tenant.room);

    if (room) {
        room.occupiedBeds = Math.max(0, room.occupiedBeds - 1);
        await room.save();
    }

    res.json({ message: 'Tenant checked out successfully' });
});

// Update rent payment status
function getRentStatus(rent, amountPaid) {
    if (amountPaid >= rent.rentAmount) {
        return 'Paid';
    }

    if (new Date(rent.dueDate) < new Date()) {
        return 'Overdue';
    }

    return 'Due';
}

function getDaysInMonth(year, month) {
    return new Date(year, month, 0).getDate();
}

// Generate monthly rent records
app.post('/rents/generate', async (req, res) => {
    try {
        const { month, year } = req.body;

        if (
            !Number.isInteger(month) ||
            month < 1 ||
            month > 12 ||
            !Number.isInteger(year) ||
            year < 2000 ||
            year > 2100
        ) {
            return res.status(400).json({
                message: 'Enter a valid month and year'
            });
        }

        const tenants = await Tenant.find({
            checkInDate: { $lte: new Date(year, month, 0) },
            $or: [
                { checkOutDate: null },
                { checkOutDate: { $gte: new Date(year, month - 1, 1) } }
            ]
        }).populate('room');

        let created = 0;

        for (const tenant of tenants) {
            if (!tenant.room) continue;

            const monthStart = new Date(year, month - 1, 1);
            const monthEnd = new Date(year, month, 0);

            const start = tenant.checkInDate > monthStart
                ? tenant.checkInDate
                : monthStart;

            const end = tenant.checkOutDate && tenant.checkOutDate < monthEnd
                ? tenant.checkOutDate
                : monthEnd;

            const days = getDaysInMonth(year, month);
            const occupiedDays = Math.max(
                0,
                Math.floor((new Date(end.getFullYear(), end.getMonth(), end.getDate()) -
                    new Date(start.getFullYear(), start.getMonth(), start.getDate())) / 86400000) + 1
            );

            const rentAmount = Math.round(
                tenant.room.rent * occupiedDays / days
            );

            const dueDate = new Date(year, month - 1, 5);

            const result = await Rent.updateOne(
                { tenant: tenant._id, month, year },
                {
                    $setOnInsert: {
                        tenant: tenant._id,
                        month,
                        year,
                        rentAmount,
                        amountPaid: 0,
                        dueDate,
                        status: dueDate < new Date() ? 'Overdue' : 'Due'
                    }
                },
                { upsert: true }
            );

            if (result.upsertedCount) created++;
        }

        res.json({
            message: 'Monthly rent generation completed',
            created
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

app.get('/rents', async (req, res) => {
    try {
        const rents = await Rent.find()
            .populate('tenant')
            .sort({ year: -1, month: -1 });

        res.json(rents);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Record a payment, including partial payments
app.post('/rents/:id/payments', async (req, res) => {
    try {
        const { amount } = req.body;

        if (typeof amount !== 'number' || !Number.isFinite(amount) || amount <= 0) {
            return res.status(400).json({
                message: 'Payment amount must be a positive number'
            });
        }

        const rent = await Rent.findById(req.params.id);

        if (!rent) {
            return res.status(404).json({
                message: 'Rent record not found'
            });
        }

        if (amount > rent.rentAmount - rent.amountPaid) {
            return res.status(400).json({
                message: 'Payment exceeds outstanding balance'
            });
        }

        rent.amountPaid += amount;
        rent.status = getRentStatus(rent, rent.amountPaid);

        await rent.save();

        res.json({
            message: 'Payment recorded successfully',
            rentAmount: rent.rentAmount,
            amountPaid: rent.amountPaid,
            outstandingBalance: rent.rentAmount - rent.amountPaid,
            status: rent.status
        });
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// View a tenant's rent history
app.get('/rents/tenant/:tenantId', async (req, res) => {
    try {
        const rents = await Rent.find({
            tenant: req.params.tenantId
        }).sort({ year: -1, month: -1 });

        res.json(rents);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Add maintenance complaint
app.put('/tenants/complaint/:id', async (req, res) => {
    const tenant = await Tenant.findById(req.params.id);

    if (!tenant) {
        return res.status(404).json({ message: 'Tenant not found' });
    }

    tenant.complaint = req.body.complaint;
    tenant.complaintStatus = 'Pending';
    await tenant.save();

    res.json({ message: 'Complaint added successfully', tenant });
});

// Update complaint status
app.put('/tenants/complaint-status/:id', async (req, res) => {
    const tenant = await Tenant.findById(req.params.id);

    if (!tenant) {
        return res.status(404).json({ message: 'Tenant not found' });
    }

    tenant.complaintStatus = req.body.complaintStatus;
    await tenant.save();

    res.json({ message: 'Complaint status updated', tenant });
});

mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('MongoDB connected'))
    .catch(err => console.log(err));

app.listen(process.env.PORT, () => {
    console.log(`Server running on port ${process.env.PORT}`);
});
