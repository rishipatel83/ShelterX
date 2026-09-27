import express from 'express';
import { getInputSchema } from '../services/inputService.js';

const router = express.Router();

router.get('/user-inputs', (_req, res) => {
  res.json({ success: true, data: getInputSchema() });
});

export default router;
