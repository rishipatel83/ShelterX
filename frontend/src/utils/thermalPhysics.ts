// frontend/src/utils/thermalPhysics.ts
// Direct TypeScript implementation of the conduction physics in visuals/charts.py and services/thermalPhysicsService.js

export interface ConductionParams {
  length: number;
  width: number;
  height: number;
  wallThicknessMm: number;
  roofThicknessMm: number;
  targetTempC: number;
  outsideTempC?: number;
  thermalConductivityWmK?: number;
  materialName?: string;
  locationName?: string;
  hourlyForecast?: Array<{ time: string; ambientTemp: number; insideTemp?: number }>;
}

export interface HourlyPoint {
  time: string;
  outsideTempC: number;
  insideTempC: number;
  heatingLoadW: number;
  coolingLoadW: number;
  totalConductionW: number;
}

export interface DynamicThermalResult {
  location: string;
  materialName: string;
  targetTempC: number;
  outsideTempC: number;
  deltaTC: number;
  wallAreaM2: number;
  roofAreaM2: number;
  envelopeAreaM2: number;
  volumeM3: number;
  wallThicknessM: number;
  roofThicknessM: number;
  k: number;
  wallConductionW: number;
  roofConductionW: number;
  totalConductionW: number;
  direction: 'Heat Loss' | 'Heat Gain';
  wallPercentage: number;
  roofPercentage: number;
  peakHeatingLoadW: number;
  peakCoolingLoadW: number;
  hourly: HourlyPoint[];
}

/**
 * Calculates complete conduction metrics matching visuals/charts.py
 */
export function calculateDynamicConduction(params: ConductionParams): DynamicThermalResult {
  const length = Math.max(Number(params.length) || 5, 0.5);
  const width = Math.max(Number(params.width) || 4, 0.5);
  const height = Math.max(Number(params.height) || 2.8, 0.5);

  const wallThicknessMm = Math.max(Number(params.wallThicknessMm) || 150, 10);
  const roofThicknessMm = Math.max(Number(params.roofThicknessMm) || 130, 10);
  const wallThicknessM = wallThicknessMm / 1000;
  const roofThicknessM = roofThicknessMm / 1000;

  const k = Math.max(Number(params.thermalConductivityWmK) || 0.036, 0.001);
  const targetTempC = Number(params.targetTempC ?? 20);

  const wallAreaM2 = 2 * length * height + 2 * width * height;
  const roofAreaM2 = length * width;
  const envelopeAreaM2 = wallAreaM2 + roofAreaM2;
  const volumeM3 = length * width * height;

  const outsideTempC = Number(params.outsideTempC ?? -15);
  const deltaTC = targetTempC - outsideTempC;

  const wallConductionW = (k / wallThicknessM) * wallAreaM2 * deltaTC;
  const roofConductionW = (k / roofThicknessM) * roofAreaM2 * deltaTC;
  const totalConductionW = wallConductionW + roofConductionW;

  const absWall = Math.abs(wallConductionW);
  const absRoof = Math.abs(roofConductionW);
  const absTotal = absWall + absRoof || 1;

  const wallPercentage = (absWall / absTotal) * 100;
  const roofPercentage = (absRoof / absTotal) * 100;
  const direction: 'Heat Loss' | 'Heat Gain' = totalConductionW >= 0 ? 'Heat Loss' : 'Heat Gain';

  // Calculate hourly points
  let hourlyRaw = params.hourlyForecast;
  if (!hourlyRaw || hourlyRaw.length === 0) {
    // Generate 6 default checkpoints matching charts.py
    hourlyRaw = [
      { time: '00:00', ambientTemp: outsideTempC - 4, insideTemp: targetTempC - 6 },
      { time: '04:00', ambientTemp: outsideTempC - 7, insideTemp: targetTempC - 8 },
      { time: '08:00', ambientTemp: outsideTempC - 1, insideTemp: targetTempC - 4 },
      { time: '12:00', ambientTemp: outsideTempC + 10, insideTemp: targetTempC },
      { time: '16:00', ambientTemp: outsideTempC + 6, insideTemp: targetTempC - 2 },
      { time: '20:00', ambientTemp: outsideTempC, insideTemp: targetTempC - 3 },
    ];
  }

  const hourly: HourlyPoint[] = hourlyRaw.map((point) => {
    const ambient = point.ambientTemp;
    const dt = targetTempC - ambient;
    const wCond = (k / wallThicknessM) * wallAreaM2 * dt;
    const rCond = (k / roofThicknessM) * roofAreaM2 * dt;
    const tot = wCond + rCond;
    return {
      time: point.time,
      outsideTempC: Number(ambient.toFixed(1)),
      insideTempC: Number((point.insideTemp ?? (targetTempC * 0.7 + ambient * 0.3)).toFixed(1)),
      heatingLoadW: Math.round(Math.max(tot, 0)),
      coolingLoadW: Math.round(Math.max(-tot, 0)),
      totalConductionW: Math.round(tot),
    };
  });

  const peakHeatingLoadW = Math.max(...hourly.map((h) => h.heatingLoadW), 0);
  const peakCoolingLoadW = Math.max(...hourly.map((h) => h.coolingLoadW), 0);

  return {
    location: params.locationName || 'ShelterX Habitat',
    materialName: params.materialName || `k = ${k.toFixed(3)} W/m.K insulation`,
    targetTempC,
    outsideTempC,
    deltaTC: Number(deltaTC.toFixed(1)),
    wallAreaM2: Number(wallAreaM2.toFixed(2)),
    roofAreaM2: Number(roofAreaM2.toFixed(2)),
    envelopeAreaM2: Number(envelopeAreaM2.toFixed(2)),
    volumeM3: Number(volumeM3.toFixed(2)),
    wallThicknessM,
    roofThicknessM,
    k,
    wallConductionW: Math.round(wallConductionW),
    roofConductionW: Math.round(roofConductionW),
    totalConductionW: Math.round(totalConductionW),
    direction,
    wallPercentage: Number(wallPercentage.toFixed(1)),
    roofPercentage: Number(roofPercentage.toFixed(1)),
    peakHeatingLoadW,
    peakCoolingLoadW,
    hourly,
  };
}

/**
 * Prepares JSON payload ready for backend visuals/generate route and charts.py
 */
export function buildChartsPyPayload(result: DynamicThermalResult) {
  return {
    location: result.location,
    materialName: result.materialName,
    targetTempC: result.targetTempC,
    current: {
      wallConductionW: result.wallConductionW,
      roofConductionW: result.roofConductionW,
      totalConductionW: result.totalConductionW,
      deltaTC: result.deltaTC,
    },
    hourly: result.hourly.map((h) => ({
      time: h.time,
      outsideTempC: h.outsideTempC,
      heatingLoadW: h.heatingLoadW,
      coolingLoadW: h.coolingLoadW,
    })),
  };
}
