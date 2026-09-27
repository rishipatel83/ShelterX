import express from 'express';
import { getUserInputSchema, getHealth, getReady } from '../controllers/configController.js';

const router = express.Router();

router.get('/user-inputs', getUserInputSchema);
router.get('/health', getHealth);
router.get('/ready', getReady);

export default router;
