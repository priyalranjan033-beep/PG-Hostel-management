const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('./models/user');
const Tenant = require('./models/tenant');

const router = express.Router();

const strongPassword =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

// Tenant registration
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;

    if (!name || !email || !password || !phone) {
      return res.status(400).json({
        message: 'Please fill in all fields.'
      });
    }

    if (!strongPassword.test(password)) {
      return res.status(400).json({
        message:
          'Password must have 8+ characters, uppercase, lowercase, number and special character.'
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedPhone = phone.replace(/\D/g, '');

    const existingUser = await User.findOne({ email: normalizedEmail });

    if (existingUser) {
      return res.status(409).json({
        message: 'This email is already registered. Please log in.'
      });
    }

    // Match registration to an existing tenant using their phone number.
    const tenants = await Tenant.find({ phone: normalizedPhone });

    if (tenants.length === 0) {
      return res.status(404).json({
        message:
          'No tenant record found for this phone number. Please contact the PG owner.'
      });
    }

    if (tenants.length > 1) {
      return res.status(409).json({
        message:
          'Multiple tenant records match this phone number. Please contact the PG owner.'
      });
    }

    const tenant = tenants[0];

    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password: await bcrypt.hash(password, 12),
      role: 'tenant',
      tenant: tenant._id
    });

    return res.status(201).json({
      message: 'Registration successful. Please log in.',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        message: 'This email is already registered.'
      });
    }

    console.error('Registration error:', error.message);

    return res.status(500).json({
      message: 'Registration failed due to a server error.'
    });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: 'Email and password are required.'
      });
    }

    const user = await User.findOne({
      email: email.trim().toLowerCase()
    });

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({
        message: 'Invalid email or password.'
      });
    }

    if (!process.env.JWT_SECRET) {
      return res.status(500).json({
        message: 'Server authentication is not configured.'
      });
    }

    const token = jwt.sign(
      { userId: user._id.toString(), role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    return res.json({
      message: 'Login successful.',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        tenant: user.tenant
      }
    });
  } catch (error) {
    console.error('Login error:', error.message);

    return res.status(500).json({
      message: 'Login failed due to a server error.'
    });
  }
});

module.exports = router;