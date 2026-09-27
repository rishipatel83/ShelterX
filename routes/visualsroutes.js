import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);
const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const visualsDir = path.resolve(projectRoot, 'visuals');
const outputDir = path.resolve(visualsDir, 'output');
const chartsPyPath = path.resolve(visualsDir, 'charts.py');

// Ensure output directory exists
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

/**
 * Helper to build payload matching charts.py expected schema
 */
const buildPayloadFromInputs = (body) => {
  const length = Number(body.dimensions?.length ?? body.length ?? 5);
  const width = Number(body.dimensions?.width ?? body.width ?? 4);
  const height = Number(body.dimensions?.height ?? body.height ?? 2.8);
  const targetTemp = Number(body.targetTempC ?? body.targetTemp ?? 20);
  const wallThicknessMm = Number(body.wallThickness_mm ?? body.wallThickness ?? 150);
  const roofThicknessMm = Number(body.roofThickness_mm ?? body.insulationThickness_mm ?? 130);
  const k = Number(body.thermalConductivityWmK ?? body.k ?? 0.036);
  const location = body.location || body.locationName || 'ShelterX Habitat';
  const materialName = body.materialName || `k = ${k.toFixed(3)} W/m.K insulation`;

  const wallThicknessM = wallThicknessMm / 1000;
  const roofThicknessM = roofThicknessMm / 1000;

  const wallArea = 2 * length * height + 2 * width * height;
  const roofArea = length * width;

  let outsideTemp = Number(body.outsideTempC ?? body.currentOutsideTemp);
  if (!Number.isFinite(outsideTemp)) {
    outsideTemp = -15; // default extreme baseline
  }

  const deltaT = targetTemp - outsideTemp;
  const wallConductionW = (k / wallThicknessM) * wallArea * deltaT;
  const roofConductionW = (k / roofThicknessM) * roofArea * deltaT;
  const totalConductionW = wallConductionW + roofConductionW;

  let hourly = [];
  if (Array.isArray(body.hourly) && body.hourly.length > 0) {
    hourly = body.hourly.map((h) => {
      const temp = Number(h.outsideTempC ?? h.temp ?? h.ambientTemp ?? outsideTemp);
      const dt = targetTemp - temp;
      const wCond = (k / wallThicknessM) * wallArea * dt;
      const rCond = (k / roofThicknessM) * roofArea * dt;
      const tot = wCond + rCond;
      return {
        time: h.time || '12:00',
        outsideTempC: temp,
        heatingLoadW: Number(h.heatingLoadW ?? Math.max(tot, 0)),
        coolingLoadW: Number(h.coolingLoadW ?? Math.max(-tot, 0))
      };
    });
  } else if (Array.isArray(body.hourlyForecast) && body.hourlyForecast.length > 0) {
    hourly = body.hourlyForecast.map((h) => {
      const temp = Number(h.ambientTemp ?? h.outsideTempC ?? outsideTemp);
      const dt = targetTemp - temp;
      const wCond = (k / wallThicknessM) * wallArea * dt;
      const rCond = (k / roofThicknessM) * roofArea * dt;
      const tot = wCond + rCond;
      return {
        time: h.time,
        outsideTempC: temp,
        heatingLoadW: Math.max(tot, 0),
        coolingLoadW: Math.max(-tot, 0)
      };
    });
  } else {
    // Default 6-point diurnal profile
    const defaultHourlyOutside = [
      ['00:00', outsideTemp - 5],
      ['04:00', outsideTemp - 8],
      ['08:00', outsideTemp - 2],
      ['12:00', outsideTemp + 10],
      ['16:00', outsideTemp + 6],
      ['20:00', outsideTemp - 1]
    ];
    hourly = defaultHourlyOutside.map(([timeLabel, temp]) => {
      const dt = targetTemp - temp;
      const wCond = (k / wallThicknessM) * wallArea * dt;
      const rCond = (k / roofThicknessM) * roofArea * dt;
      const tot = wCond + rCond;
      return {
        time: timeLabel,
        outsideTempC: temp,
        heatingLoadW: Math.max(tot, 0),
        coolingLoadW: Math.max(-tot, 0)
      };
    });
  }

  return {
    location,
    materialName,
    targetTempC: targetTemp,
    current: {
      wallConductionW,
      roofConductionW,
      totalConductionW,
      deltaTC: deltaT,
      wallAreaM2: wallArea,
      roofAreaM2: roofArea
    },
    hourly
  };
};

/**
 * POST /api/v1/visuals/generate
 * Executes python visuals/charts.py with dynamic payload
 */
router.post('/generate', async (req, res) => {
  let tempJsonPath = null;
  try {
    const payload = req.body?.current && req.body?.hourly
      ? req.body
      : buildPayloadFromInputs(req.body);

    const tempFileName = `temp_payload_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.json`;
    tempJsonPath = path.resolve(outputDir, tempFileName);

    await fs.promises.writeFile(tempJsonPath, JSON.stringify(payload, null, 2), 'utf-8');

    // Run python charts.py with input and output paths
    const { stdout, stderr } = await execFileAsync('python', [chartsPyPath, tempJsonPath, outputDir], {
      timeout: 15000,
      env: { ...process.env, PYTHONIOENCODING: 'utf-8' }
    });

    let scriptResult = {};
    try {
      scriptResult = JSON.parse(stdout.trim());
    } catch {
      scriptResult = { rawStdout: stdout };
    }

    const timestamp = Date.now();
    return res.status(200).json({
      success: true,
      timestamp,
      message: 'Visual charts generated dynamically via visuals/charts.py',
      pieChartUrl: `/api/v1/visuals/heat_transfer_pie_chart.png?t=${timestamp}`,
      temperatureGraphUrl: `/api/v1/visuals/temperature_variation_graph.png?t=${timestamp}`,
      scriptResult,
      payload,
      outputFiles: {
        pieChart: path.resolve(outputDir, 'heat_transfer_pie_chart.png'),
        temperatureGraph: path.resolve(outputDir, 'temperature_variation_graph.png')
      }
    });
  } catch (error) {
    console.error('[ShelterX Visuals] Generation failed:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to generate visual charts with python script.',
      error: error.message
    });
  } finally {
    if (tempJsonPath && fs.existsSync(tempJsonPath)) {
      fs.promises.unlink(tempJsonPath).catch(() => {});
    }
  }
});

/**
 * GET /api/v1/visuals/heat_transfer_pie_chart.png
 */
router.get('/heat_transfer_pie_chart.png', (req, res) => {
  const filePath = path.resolve(outputDir, 'heat_transfer_pie_chart.png');
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ success: false, message: 'Pie chart has not been generated yet.' });
  }
  res.setHeader('Content-Type', 'image/png');
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  return res.sendFile(filePath);
});

/**
 * GET /api/v1/visuals/temperature_variation_graph.png
 */
router.get('/temperature_variation_graph.png', (req, res) => {
  const filePath = path.resolve(outputDir, 'temperature_variation_graph.png');
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ success: false, message: 'Temperature variation graph has not been generated yet.' });
  }
  res.setHeader('Content-Type', 'image/png');
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  return res.sendFile(filePath);
});

/**
 * GET /api/v1/visuals/status
 */
router.get('/status', (_req, res) => {
  const pieExists = fs.existsSync(path.resolve(outputDir, 'heat_transfer_pie_chart.png'));
  const graphExists = fs.existsSync(path.resolve(outputDir, 'temperature_variation_graph.png'));
  let pieMtime = null;
  let graphMtime = null;

  if (pieExists) {
    pieMtime = fs.statSync(path.resolve(outputDir, 'heat_transfer_pie_chart.png')).mtime;
  }
  if (graphExists) {
    graphMtime = fs.statSync(path.resolve(outputDir, 'temperature_variation_graph.png')).mtime;
  }

  res.json({
    success: true,
    chartsScriptExists: fs.existsSync(chartsPyPath),
    pieChartExists: pieExists,
    pieChartMtime: pieMtime,
    temperatureGraphExists: graphExists,
    temperatureGraphMtime: graphMtime,
    outputDirectory: outputDir
  });
});

export default router;
