import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';

import connectDB from './config/db.js';
import apiRouter from './routes/index.js';
import { createRateLimit } from './middleware/rateLimit.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '.env') });

const validateEnvironment = () => {
  const missing = [];
  if (!process.env.MONGO_URI?.trim()) missing.push('MONGO_URI');
  if (!process.env.JWT_SECRET?.trim()) {
    if (process.env.NODE_ENV === 'production') {
      missing.push('JWT_SECRET');
    } else {
      process.env.JWT_SECRET = 'shelterx-dev-secret-key-32chars-minimum-security';
      console.warn('[ShelterX] Using default JWT_SECRET for development.');
    }
  }

  if (missing.length > 0 && process.env.NODE_ENV === 'production') {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
};

validateEnvironment();

const app = express();
app.disable('x-powered-by');

if (process.env.TRUST_PROXY === '1') {
  app.set('trust proxy', 1);
}

const defaultDevOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:5174',
  'http://localhost:3000',
  'http://localhost:5000'
];

const configuredOrigins = (process.env.CORS_ORIGINS ?? '')
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean);

const allowedOrigins = Array.from(new Set([...defaultDevOrigins, ...configuredOrigins]));

app.use(
  cors({
    origin(origin, callback) {
      if (!origin) return callback(null, true);
      if (process.env.NODE_ENV !== 'production') {
        return callback(null, true);
      }
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error(`Origin ${origin} is not allowed by CORS.`));
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
    maxAge: 600
  })
);

app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  next();
});

app.use(express.json({ limit: '500kb' }));

app.use(
  createRateLimit({
    windowMs: 15 * 60 * 1000,
    max: 600,
    keyPrefix: 'global'
  })
);

// Global health and ready probes
app.get('/api/v1/health', (_req, res) => {
  res.json({
    success: true,
    service: 'ShelterX Backend',
    status: 'ok',
    designEngine: 'production-validated-physics',
    timestamp: new Date().toISOString()
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

// Primary API Router
app.use('/api/v1', apiRouter);

// Catch 404
app.use(notFoundHandler);

// Centralized Error Handler
app.use(errorHandler);

const PORT = Number(process.env.PORT || 5000);

await connectDB({ required: false });

const server = app.listen(PORT, () => {
  console.log(`[ShelterX] Backend active on http://localhost:${PORT}`);
  console.log(`[ShelterX] API ready at http://localhost:${PORT}/api/v1`);
});

const shutdown = async (signal) => {
  console.log(`[ShelterX] ${signal} received. Shutting down gracefully.`);
  server.close(async () => {
    try {
      if (mongoose.connection.readyState !== 0) {
        await mongoose.connection.close();
      }
    } finally {
      process.exit(0);
    }
  });
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

export default app;
