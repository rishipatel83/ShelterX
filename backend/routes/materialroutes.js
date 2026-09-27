import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const datasetPath = path.join(__dirname, '..', 'data', 'materials.json');

router.get('/', (_req, res) => {
  const dataset = JSON.parse(fs.readFileSync(datasetPath, 'utf8'));
  res.json({
    success: true,
    source: 'local-user-dataset',
    status: dataset.status,
    data: dataset.materials
  });
});

export default router;
