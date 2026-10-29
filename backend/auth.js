const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('./models/user');
const Tenant = require('./models/tenant');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
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
// Forgot Password
router.post('/forgot-password', async (req, res) => {
  try {
    const email = req.body.email?.trim().toLowerCase();

    if (!email) {
      return res.status(400).json({ message: 'Email is required.' });
    }

    const user = await User.findOne({ email });

    // Same response whether account exists or not
    if (!user) {
      return res.json({
        message: 'If this email is registered, a reset link will be sent.'
      });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');

    user.resetPasswordToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');

    user.resetPasswordExpires = new Date(Date.now() + 15 * 60 * 1000);

    await user.save();

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS?.replace(/\s/g, '')
      }
    });

    const resetLink =
      `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: user.email,
      subject: 'PG Hostel Manager - Reset Password',
      text: `You requested a password reset.\n\nOpen this link to reset your password within 15 minutes:\n${resetLink}\n\nIf you did not request this, ignore this email.`
    });

    return res.json({
      message: 'If this email is registered, a reset link will be sent.'
    });
  } catch (error) {
    console.error('Forgot password error:', error.message);
    return res.status(500).json({
      message: 'Unable to process the request. Please try again later.'
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
// Reset Password
router.post('/reset-password/:token', async (req, res) => {
  try {
    const { password } = req.body;
    const { token } = req.params;

    const strongPassword =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

    if (!strongPassword.test(password || '')) {
      return res.status(400).json({
        message: 'Password must be at least 8 characters and include uppercase, lowercase, number and special character.'
      });
    }

    const hashedToken = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: new Date() }
    });

    if (!user) {
      return res.status(400).json({
        message: 'Reset link is invalid or expired. Please request a new one.'
      });
    }

    user.password = await bcrypt.hash(password, 12);
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;

    await user.save();

    return res.json({
      message: 'Password reset successful. Please log in with your new password.'
    });
  } catch (error) {
    console.error('Reset password error:', error.message);
    return res.status(500).json({
      message: 'Unable to reset password. Please try again.'
    });
  }
});
module.exports = router;