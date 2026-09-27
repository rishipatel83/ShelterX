import express from 'express';
import authRoutes from './authroutes.js';
import simulationRoutes from './simulationroutes.js';
import visualsRoutes from './visualsroutes.js';
import configRoutes from './configroutes.js';
import materialRoutes from './materialroutes.js';

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/sih', simulationRoutes);
router.use('/visuals', visualsRoutes);
router.use('/sih/visuals', visualsRoutes);
router.use('/config', configRoutes);
router.use('/materials', materialRoutes);

export default router;
