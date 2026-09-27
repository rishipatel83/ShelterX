import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

import { connectDB } from './config/db.js';
import simulationRoutes from './routes/simulationroutes.js';
import configRoutes from './routes/configroutes.js';
import materialRoutes from './routes/materialroutes.js';
import authRoutes from './routes/authroutes.js';
import visualsRoutes from './routes/visualsroutes.js';

dotenv.config();

const app = express();

const allowedOrigins = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map(v => v.trim())
  .filter(Boolean);

app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    callback(new Error(`CORS blocked origin: ${origin}`));
  },
  credentials: true
}));

app.use(express.json({ limit: '1mb' }));

app.get('/api/v1/health', (_req, res) => {
  res.json({
    success: true,
    service: 'ShelterX Backend',
    status: 'ok',
    designEngine: 'waiting-for-user-datasets'
  });
});

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/sih', simulationRoutes);
app.use('/api/v1/visuals', visualsRoutes);
app.use('/api/v1/sih/visuals', visualsRoutes);
app.use('/api/v1/config', configRoutes);
app.use('/api/v1/materials', materialRoutes);

app.use((error, _req, res, _next) => {
  console.error('[ShelterX] middleware error:', error);
  res.status(500).json({ success: false, message: error.message });
});

const port = Number(process.env.PORT || 5000);

await connectDB();

app.listen(port, () => {
  console.log(`[ShelterX] Backend running on http://localhost:${port}`);
});
