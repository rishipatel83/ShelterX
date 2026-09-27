import express from 'express';
import { getMaterialsCatalog, getValidatedMaterials } from '../controllers/materialController.js';

const router = express.Router();

// GET /api/v1/materials -> called by frontend materialService.ts
router.get('/', getMaterialsCatalog);

// GET /api/v1/materials/validated -> detailed validated materials
router.get('/validated', getValidatedMaterials);

export default router;
