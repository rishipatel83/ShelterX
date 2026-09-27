import express from 'express';
import {
  generateVisuals,
  servePieChart,
  serveTemperatureGraph,
  getVisualsStatus
} from '../controllers/visualsController.js';

const router = express.Router();

router.post('/generate', generateVisuals);
router.get('/heat_transfer_pie_chart.png', servePieChart);
router.get('/temperature_variation_graph.png', serveTemperatureGraph);
router.get('/status', getVisualsStatus);

export default router;
