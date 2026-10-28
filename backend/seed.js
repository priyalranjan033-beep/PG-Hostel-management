
require('dotenv').config();
const mongoose = require('mongoose');

const Room = require('./models/room');
const Tenant = require('./models/tenant');
const Rent = require('./models/rent');

async function seedDatabase() {
    try {
        await mongoose.connect(process.env.MONGO_URI);

        // Existing records ko delete nahi karna.
        let room = await Room.findOne({ roomNumber: 'DEMO-101' });

        if (!room) {
            room = await Room.create({
                roomNumber: 'DEMO-101',
                totalBeds: 3,
                rent: 7500,
                occupiedBeds: 0
            });
        }

        let tenant = await Tenant.findOne({ phone: '9999990001' });

        if (!tenant) {
            tenant = await Tenant.create({
                name: 'Demo Tenant',
                phone: '9999990001',
                room: room._id,
                bedNumber: 1,
                checkInDate: new Date()
            });

            room.occupiedBeds = Math.min(room.occupiedBeds + 1, room.totalBeds);
            await room.save();
        }

        const now = new Date();

        await Rent.updateOne(
            {
                tenant: tenant._id,
                month: now.getMonth() + 1,
                year: now.getFullYear()
            },
            {
                $setOnInsert: {
                    rentAmount: 7500,
                    amountPaid: 0,
                    dueDate: new Date(now.getFullYear(), now.getMonth(), 5),
                    status: 'Due'
                }
            },
            { upsert: true }
        );

        console.log('Demo data ready!');
        console.log('Room: DEMO-101');
        console.log('Tenant: Demo Tenant');
        console.log('Phone: 9999990001');
    } catch (error) {
        console.error('Seed failed:', error.message);
    } finally {
        await mongoose.disconnect();
    }
}

seedDatabase();

