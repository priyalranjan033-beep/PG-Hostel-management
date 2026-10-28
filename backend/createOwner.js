
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/user');
const readline = require('readline/promises');

async function main() {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    try {
        const name = await rl.question('Owner name: ');
        const email = (await rl.question('Owner email: ')).trim().toLowerCase();
        const password = await rl.question('Owner password (min 8 chars): ');

        if (!name.trim() || !email.includes('@') || password.length < 8) {
            throw new Error('Enter a valid name, email and password.');
        }

        await mongoose.connect(process.env.MONGO_URI);

        const existing = await User.findOne({ email });

        if (existing) {
            throw new Error('This email is already registered.');
        }

        const user = await User.create({
            name: name.trim(),
            email,
            password: await bcrypt.hash(password, 12),
            role: 'owner'
        });

        console.log(`Owner account created: ${user.email}`);
    } catch (error) {
        console.error(error.message);
        process.exitCode = 1;
    } finally {
        rl.close();
        await mongoose.disconnect().catch(() => {});
    }
}

main();
