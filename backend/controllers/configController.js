import mongoose from 'mongoose';
import { getInputSchema } from '../services/inputService.js';

export const getUserInputSchema = (_req, res) => {
  const schema = getInputSchema();
  return res.status(200).json({
    success: true,
    data: schema
  });
};

export const getHealth = (_req, res) => {
  return res.status(200).json({
    success: true,
    service: 'ShelterX Backend',
    status: 'ok',
    designEngine: 'production-validated-physics'
  });
};

export const getReady = (_req, res) => {
  const databaseReady = mongoose.connection.readyState === 1;
  return res.status(databaseReady ? 200 : 503).json({
    success: databaseReady,
    service: 'ShelterX Backend',
    status: databaseReady ? 'ready' : 'not-ready',
    database: databaseReady ? 'connected' : 'disconnected'
  });
};
