import express from 'express';
import { optionalAuth } from '../middleware/auth.js';
import { createRateLimit } from '../middleware/rateLimit.js';
import {
  runSimulation,
  getSimulationMaterials
} from '../controllers/simulationController.js';

const router = express.Router();

const simulationLimiter = createRateLimit({
  windowMs: 15 * 60 * 1000,
  max: 120,
  keyPrefix: 'simulation'
});

router.use(simulationLimiter);

// GET /api/v1/sih/materials
router.get('/materials', optionalAuth, getSimulationMaterials);

// POST /api/v1/sih/simulate
router.post('/simulate', optionalAuth, runSimulation);

export default router;
