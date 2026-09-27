import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';

import connectDB from './config/db.js';
import authRoutes from './routes/authroutes.js';
import simulationRoutes from './routes/simulationroutes.js';
import visualsRoutes from './routes/visualsroutes.js';
import { createRateLimit } from './middleware/rateLimit.js';

dotenv.config();

const requireEnvironment = () => {
  const missing = [];
  if (!process.env.MONGO_URI?.trim()) missing.push('MONGO_URI');
  if (!process.env.JWT_SECRET?.trim()) missing.push('JWT_SECRET');

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  if (
    process.env.NODE_ENV === 'production' &&
    process.env.JWT_SECRET.trim().length < 32
  ) {
    throw new Error('JWT_SECRET must be at least 32 characters in production.');
  }

  if (
    process.env.NODE_ENV === 'production' &&
    !process.env.CORS_ORIGINS?.trim()
  ) {
    throw new Error('CORS_ORIGINS is required in production.');
  }
};

requireEnvironment();

const app = express();
app.disable('x-powered-by');

if (process.env.TRUST_PROXY === '1') {
  app.set('trust proxy', 1);
}

const configuredOrigins = (process.env.CORS_ORIGINS ?? '')
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin) return callback(null, true);
      if (configuredOrigins.length === 0 && process.env.NODE_ENV !== 'production') {
        return callback(null, true);
      }
      if (configuredOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error('Origin is not allowed by CORS.'));
    },
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    maxAge: 600
  })
);

app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'");
  next();
});

app.use(express.json({ limit: '100kb' }));

app.use(
  createRateLimit({
    windowMs: 15 * 60 * 1000,
    max: 300,
    keyPrefix: 'global'
  })
);

app.get('/api/v1/health', (_req, res) => {
  res.json({
    success: true,
    service: 'ShelterX Backend',
    status: 'ok'
  });
});

app.get('/api/v1/ready', (_req, res) => {
  const databaseReady = mongoose.connection.readyState === 1;

  return res.status(databaseReady ? 200 : 503).json({
    success: databaseReady,
    service: 'ShelterX Backend',
    status: databaseReady ? 'ready' : 'not-ready',
    database: databaseReady ? 'connected' : 'disconnected'
  });
});

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/sih', simulationRoutes);
app.use('/api/v1/visuals', visualsRoutes);
app.use('/api/v1/sih/visuals', visualsRoutes);

app.use((_req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found.'
  });
});

app.use((error, _req, res, _next) => {
  if (error?.type === 'entity.parse.failed') {
    return res.status(400).json({
      success: false,
      message: 'Request body must contain valid JSON.'
    });
  }

  if (error?.message === 'Origin is not allowed by CORS.') {
    return res.status(403).json({
      success: false,
      message: 'Request origin is not allowed.'
    });
  }

  console.error('Unhandled API error:', error);
  return res.status(500).json({
    success: false,
    message: 'Internal server error.'
  });
});

const PORT = Number(process.env.PORT || 5000);

await connectDB({ required: true });

const server = app.listen(PORT, () => {
  console.log(`ShelterX backend active on port ${PORT}`);
});

const shutdown = async (signal) => {
  console.log(`${signal} received. Shutting down ShelterX backend.`);
  server.close(async () => {
    try {
      await mongoose.connection.close();
    } finally {
      process.exit(0);
    }
  });
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
