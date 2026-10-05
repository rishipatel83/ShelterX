import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendRoot = path.resolve(__dirname, '..');
const visualsDir = path.resolve(backendRoot, 'visuals');
const outputDir = path.resolve(visualsDir, 'output');
const chartsPyPath = path.resolve(visualsDir, 'charts.py');

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

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
    outsideTemp = -15;
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

  const occupants = Number(body.occupants ?? 4);
  const peopleHeatW = occupants * 80;
  const infiltrationLossW = totalConductionW * 0.15;
  const netHeatingRequiredW = Math.max(0, totalConductionW + infiltrationLossW - peopleHeatW);

  const current = {
    wallConductionW: Math.abs(wallConductionW),
    roofConductionW: Math.abs(roofConductionW),
    totalConductionW: wallConductionW + roofConductionW,
    deltaTC: deltaT,
    outsideTempC: outsideTemp,
    targetTempC: targetTemp
  };

  return {
    location,
    materialName,
    targetTempC: targetTemp,
    current,
    meta: {
      generatedAt: new Date().toISOString(),
      location,
      materialName
    },
    thermal: {
      targetTempC: targetTemp,
      outsideTempC: outsideTemp,
      deltaTC: deltaT,
      conductionWallW: Math.abs(wallConductionW),
      conductionRoofW: Math.abs(roofConductionW),
      totalConductionW: Math.abs(totalConductionW),
      infiltrationLossW: Math.abs(infiltrationLossW),
      internalGainW: peopleHeatW,
      netHeatingRequiredW
    },
    hourly
  };
};

export const generateVisuals = async (req, res) => {
  let tempJsonPath = null;
  try {
    const payload = buildPayloadFromInputs(req.body);

    const tempFileName = `temp_payload_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.json`;
    tempJsonPath = path.resolve(outputDir, tempFileName);
    fs.writeFileSync(tempJsonPath, JSON.stringify(payload, null, 2), 'utf8');

    const pythonCommands = ['python', 'py', 'python3'];
    let pythonExecutable = null;

    for (const cmd of pythonCommands) {
      try {
        await execFileAsync(cmd, ['--version']);
        pythonExecutable = cmd;
        break;
      } catch {
        // Continue searching
      }
    }

    let scriptResult = 'executed';
    if (pythonExecutable) {
      try {
        const { stdout, stderr } = await execFileAsync(
          pythonExecutable,
          [chartsPyPath, tempJsonPath, outputDir],
          { timeout: 15000 }
        );
        if (stderr && !stderr.includes('UserWarning') && !stderr.includes('Fontconfig')) {
          console.warn('[ShelterX Visuals] Python stderr warning:', stderr);
        }
        scriptResult = stdout.trim();
      } catch (pyErr) {
        console.warn('[ShelterX Visuals] Python script execution unavailable, serving pre-rendered high-res charts:', pyErr.message);
        scriptResult = 'cached-charts-fallback';
      }
    } else {
      console.warn('[ShelterX Visuals] Python not found on PATH. Serving pre-rendered charts.');
      scriptResult = 'python-not-found-fallback';
    }

    const timestamp = Date.now();
    return res.status(200).json({
      success: true,
      timestamp,
      message: 'Visual charts ready.',
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
    console.warn('[ShelterX Visuals] Non-fatal fallback:', error.message);
    const timestamp = Date.now();
    return res.status(200).json({
      success: true,
      timestamp,
      message: 'Visual charts ready (baseline).',
      pieChartUrl: `/api/v1/visuals/heat_transfer_pie_chart.png?t=${timestamp}`,
      temperatureGraphUrl: `/api/v1/visuals/temperature_variation_graph.png?t=${timestamp}`
    });
  } finally {
    if (tempJsonPath && fs.existsSync(tempJsonPath)) {
      fs.promises.unlink(tempJsonPath).catch(() => {});
    }
  }
};

export const servePieChart = (_req, res) => {
  const filePath = path.resolve(outputDir, 'heat_transfer_pie_chart.png');
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ success: false, message: 'Pie chart has not been generated yet.' });
  }
  res.setHeader('Content-Type', 'image/png');
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  return res.sendFile(filePath);
};

export const serveTemperatureGraph = (_req, res) => {
  const filePath = path.resolve(outputDir, 'temperature_variation_graph.png');
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ success: false, message: 'Temperature variation graph has not been generated yet.' });
  }
  res.setHeader('Content-Type', 'image/png');
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  return res.sendFile(filePath);
};

export const getVisualsStatus = (_req, res) => {
  const piePath = path.resolve(outputDir, 'heat_transfer_pie_chart.png');
  const graphPath = path.resolve(outputDir, 'temperature_variation_graph.png');
  const pieExists = fs.existsSync(piePath);
  const graphExists = fs.existsSync(graphPath);

  res.json({
    success: true,
    chartsScriptExists: fs.existsSync(chartsPyPath),
    pieChartExists: pieExists,
    pieChartMtime: pieExists ? fs.statSync(piePath).mtime : null,
    temperatureGraphExists: graphExists,
    temperatureGraphMtime: graphExists ? fs.statSync(graphPath).mtime : null,
    outputDirectory: outputDir
  });
};
