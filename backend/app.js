const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

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
app.put('/tenants/rent/:id', async (req, res) => {
    const tenant = await Tenant.findById(req.params.id);

    if (!tenant) {
        return res.status(404).json({ message: 'Tenant not found' });
    }

    tenant.rentPaid = req.body.rentPaid;
    await tenant.save();

    res.json({ message: 'Rent status updated', tenant });
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
