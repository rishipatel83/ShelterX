import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/user.js';

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const signup = async (req, res, next) => {
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
    const newUser = await User.create({ username, email, password: hashedPassword });

    return res.status(201).json({
      success: true,
      message: 'User registered successfully.',
      user: {
        id: newUser._id.toString(),
        username: newUser.username,
        email: newUser.email
      }
    });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'An account with those details already exists.'
      });
    }
    next(error);
  }
};

export const login = async (req, res, next) => {
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
      { id: user._id.toString(), email: user.email, username: user.username },
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
    next(error);
  }
};

export const demoLogin = async (_req, res, next) => {
  try {
    const secret = process.env.JWT_SECRET || 'shelterx-dev-secret-key-32chars-minimum-security';
    const demoPayload = {
      id: 'demo-user-id',
      username: 'drdo-commander',
      email: 'officer@drdo.gov.in',
      role: 'Chief Simulation Officer'
    };

    const token = jwt.sign(demoPayload, secret, { expiresIn: '7d' });

    return res.status(200).json({
      success: true,
      message: 'Demo credentials authenticated.',
      token,
      user: demoPayload
    });
  } catch (error) {
    next(error);
  }
};

export const getProfile = async (req, res, next) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    if (req.user.id === 'demo-user-id') {
      return res.status(200).json({
        success: true,
        user: {
          id: 'demo-user-id',
          username: req.user.username || 'drdo-commander',
          email: req.user.email || 'officer@drdo.gov.in',
          role: 'Chief Simulation Officer'
        }
      });
    }

    const user = await User.findById(req.user.id).select('-password').lean();
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }
    return res.status(200).json({ success: true, user });
  } catch (error) {
    next(error);
  }
};

