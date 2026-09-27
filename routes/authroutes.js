import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/user.js';
import { createRateLimit } from '../middleware/rateLimit.js';

const router = express.Router();

const authLimiter = createRateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  keyPrefix: 'auth'
});

router.use(authLimiter);

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

router.post('/signup', async (req, res) => {
  try {
    const username = String(req.body?.username ?? '').trim();
    const email = String(req.body?.email ?? '').trim().toLowerCase();
    const password = String(req.body?.password ?? '');

    const errors = [];
    if (username.length < 2 || username.length > 80) {
      errors.push('username must be between 2 and 80 characters.');
    }
    if (!emailPattern.test(email) || email.length > 254) {
      errors.push('email must be a valid email address.');
    }
    if (password.length < 8 || password.length > 128) {
      errors.push('password must be between 8 and 128 characters.');
    }

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid signup input.',
        errors
      });
    }

    const existing = await User.findOne({
      $or: [{ email }, { username }]
    }).lean();

    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'An account with those details already exists.'
      });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    await User.create({ username, email, password: hashedPassword });

    return res.status(201).json({
      success: true,
      message: 'User registered successfully.'
    });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'An account with those details already exists.'
      });
    }

    console.error('Signup failed:', error);
    return res.status(500).json({
      success: false,
      message: 'Signup failed.'
    });
  }
});

router.post('/login', async (req, res) => {
  try {
    const email = String(req.body?.email ?? '').trim().toLowerCase();
    const password = String(req.body?.password ?? '');

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required.'
      });
    }

    const user = await User.findOne({ email }).select('+password');
    const validPassword = user
      ? await bcrypt.compare(password, user.password)
      : false;

    if (!user || !validPassword) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.'
      });
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      console.error('JWT_SECRET is not configured.');
      return res.status(503).json({
        success: false,
        message: 'Authentication service is unavailable.'
      });
    }

    const token = jwt.sign(
      { id: user._id.toString() },
      secret,
      { expiresIn: '1d' }
    );

    return res.status(200).json({
      success: true,
      token,
      user: {
        id: user._id.toString(),
        username: user.username,
        email: user.email
      }
    });
  } catch (error) {
    console.error('Login failed:', error);
    return res.status(500).json({
      success: false,
      message: 'Login failed.'
    });
  }
});

export default router;
