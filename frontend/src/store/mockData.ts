// src/store/mockData.ts

export type TopMaterialRecommendation = {
  name: string;
  recommendationType?: string;
  tagline?: string;
  badgeColor?: string;
  thermalConductivity: number;
  density?: number;
  costPerUnit?: number;
  estimatedTotalCost: number;
  heatFlux: number;
  totalHeatLoss: number;
  efficiencyScore: number;
  simulationResults?: {
    hourlyInsideTemp?: number[];
    predictedInsideTempNight: number;
    predictedInsideTempDay?: number;
    heatLossRate?: string;
  };
};

export type SimulationData = {
  locationId: string;
  locationName: string;
  ambientData: {
    avgTempDay: number;
    avgTempNight: number;
    solarIrradiance: number; 
    windSpeed: number; 
  };
  recommendedShelter: {
    dimensions: { width: number; length: number; height: number };
    orientation: string;
    materials: {
      walls: string;
      roof: string;
      wallThickness_mm: number;
      insulationThickness_mm?: number | null;
    };
    optimalMaterialDetails?: {
      name: string;
      thermalConductivity: number;
      density: number;
      costPerUnit: number;
      estimatedTotalCost: number;
      heatFlux: number;
      totalHeatLoss: number;
      efficiencyScore: number;
    };
    topMaterialRecommendations?: TopMaterialRecommendation[];
    simulationResults: {
      predictedInsideTempNight: number;
      heatLossRate: string;
    };
  };
  hourlyForecast: Array<{ time: string; ambientTemp: number; insideTemp: number }>;
  /** Derived geometry calculated by backend geometryService */
  derivedGeometry?: {
    wallAreaM2: number;
    roofAreaM2: number;
    floorAreaM2: number;
    volumeM3: number;
  };
  /** Metadata about the backend response */
  backendMeta?: {
    requestId?: string;
    schemaVersion?: string;
    persisted?: boolean;
    designEngineStatus?: string;
    weatherSource?: string | null;
    weatherAvailable?: boolean;
    averageTemperatureC?: number | null;
    averageWindSpeedMs?: number | null;
    peakSolarIrradianceWm2?: number | null;
    wallAreaM2?: number | null;
    roofAreaM2?: number | null;
    floorAreaM2?: number | null;
    volumeM3?: number | null;
  };
};

/**
 * Calculates top 3 ranked material recommendations based on physics,
 * habitat dimensions, wall thickness, and climate profile.
 */
export const generateTop3MaterialRecommendations = (
  length: number = 5,
  width: number = 4,
  height: number = 2.8,
  wallThickness_mm: number = 150,
  targetTemp: number = 20,
  ambientNightTemp: number = -15,
  locationId: string = 'ladakh'
): TopMaterialRecommendation[] => {
  const wallArea = 2 * (length * height + width * height);
  const roofArea = length * width;
  const totalArea = wallArea + roofArea;
  const thickness_m = Math.max((wallThickness_mm || 150) / 1000, 0.05);
  const deltaT = Math.max(Math.abs(targetTemp - ambientNightTemp), 1);

  const isHotClimate = locationId === 'thar' || ambientNightTemp > 18;

  if (isHotClimate) {
    // Hot & Arid Climate Candidates
    const k1 = 0.09; // AAC
    const flux1 = Number(((k1 / thickness_m) * deltaT).toFixed(1));
    const loss1 = Math.round(flux1 * totalArea);

    const k2 = 0.032; // PCM
    const flux2 = Number(((k2 / thickness_m) * deltaT).toFixed(1));
    const loss2 = Math.round(flux2 * totalArea);

    const k3 = 0.036; // XPS
    const flux3 = Number(((k3 / thickness_m) * deltaT).toFixed(1));
    const loss3 = Math.round(flux3 * totalArea);

    return [
      {
        name: 'Autoclaved Aerated Concrete (AAC) + Cool-Roof Coating',
        recommendationType: 'Optimal Balance',
        tagline: 'High Thermal Inertia: Buffers extreme desert daytime solar spikes',
        badgeColor: 'emerald',
        thermalConductivity: k1,
        density: 450,
        costPerUnit: 140,
        estimatedTotalCost: Math.round(totalArea * 290),
        heatFlux: flux1,
        totalHeatLoss: loss1,
        efficiencyScore: 79.4,
        simulationResults: {
          predictedInsideTempNight: Math.round(targetTemp - deltaT * 0.22),
          predictedInsideTempDay: 26,
          heatLossRate: 'Controlled Heat Inertia'
        }
      },
      {
        name: 'Phase Change Material (PCM) Ventilated Double-Skin',
        recommendationType: 'Max Heat Rejection',
        tagline: 'Active Latent Heat Storage: Absorbs daytime peak radiation',
        badgeColor: 'blue',
        thermalConductivity: k2,
        density: 220,
        costPerUnit: 260,
        estimatedTotalCost: Math.round(totalArea * 480),
        heatFlux: flux2,
        totalHeatLoss: loss2,
        efficiencyScore: 91.2,
        simulationResults: {
          predictedInsideTempNight: Math.round(targetTemp - deltaT * 0.12),
          predictedInsideTempDay: 23,
          heatLossRate: 'Superior Rejection'
        }
      },
      {
        name: 'Extruded Polystyrene (XPS) Lightweight Stucco',
        recommendationType: 'Budget Friendly',
        tagline: 'Low-cost rapid construction with reliable moisture & heat resistance',
        badgeColor: 'amber',
        thermalConductivity: k3,
        density: 130,
        costPerUnit: 90,
        estimatedTotalCost: Math.round(totalArea * 185),
        heatFlux: flux3,
        totalHeatLoss: loss3,
        efficiencyScore: 63.5,
        simulationResults: {
          predictedInsideTempNight: Math.round(targetTemp - deltaT * 0.35),
          predictedInsideTempDay: 29,
          heatLossRate: 'Moderate Protection'
        }
      }
    ];
  }

  // Extreme Sub-Zero & High-Altitude Cold Climates (e.g. Ladakh, Tawang)
  const k1 = 0.026; // Polyurethane Foam (PUF) Composite
  const flux1 = Number(((k1 / thickness_m) * deltaT).toFixed(1));
  const loss1 = Math.round(flux1 * totalArea);

  const k2 = 0.016; // Aerogel Vacuum Insulated Panel
  const flux2 = Number(((k2 / thickness_m) * deltaT).toFixed(1));
  const loss2 = Math.round(flux2 * totalArea);

  const k3 = 0.040; // High-Density Rockwool Core
  const flux3 = Number(((k3 / thickness_m) * deltaT).toFixed(1));
  const loss3 = Math.round(flux3 * totalArea);

  return [
    {
      name: 'NIST: Polyurethane Foam (PUF) Composite',
      recommendationType: 'Optimal Balance',
      tagline: 'High Thermal Retention & Economical Life-Cycle Deployment',
      badgeColor: 'emerald',
      thermalConductivity: k1,
      density: 35.2,
      costPerUnit: 160,
      estimatedTotalCost: Math.round(totalArea * 310),
      heatFlux: flux1,
      totalHeatLoss: loss1,
      efficiencyScore: 82.5,
      simulationResults: {
        predictedInsideTempNight: Math.round(targetTemp - deltaT * 0.24),
        predictedInsideTempDay: targetTemp,
        heatLossRate: 'Low Heat Loss'
      }
    },
    {
      name: 'Aerogel Vacuum Insulated Panel (VIP)',
      recommendationType: 'Max Insulation',
      tagline: 'Ultra-Low Heat Flux: Engineered for severe Himalayan sub-zero nights',
      badgeColor: 'blue',
      thermalConductivity: k2,
      density: 140.0,
      costPerUnit: 310,
      estimatedTotalCost: Math.round(totalArea * 560),
      heatFlux: flux2,
      totalHeatLoss: loss2,
      efficiencyScore: 94.8,
      simulationResults: {
        predictedInsideTempNight: Math.round(targetTemp - deltaT * 0.12),
        predictedInsideTempDay: targetTemp,
        heatLossRate: 'Minimal Heat Loss'
      }
    },
    {
      name: 'High-Density Rockwool Core Sandwich',
      recommendationType: 'Budget Friendly',
      tagline: 'Cost-Effective, Non-Combustible Fast-Assembly Modular Panel',
      badgeColor: 'amber',
      thermalConductivity: k3,
      density: 110.0,
      costPerUnit: 95,
      estimatedTotalCost: Math.round(totalArea * 180),
      heatFlux: flux3,
      totalHeatLoss: loss3,
      efficiencyScore: 66.4,
      simulationResults: {
        predictedInsideTempNight: Math.round(targetTemp - deltaT * 0.38),
        predictedInsideTempDay: targetTemp - 2,
        heatLossRate: 'Standard Retention'
      }
    }
  ];
};

export const mockDatabase: Record<string, SimulationData> = {
  ladakh: {
    locationId: 'ladakh',
    locationName: 'Ladakh (High Altitude Cold)',
    ambientData: { avgTempDay: 5, avgTempNight: -15, solarIrradiance: 2100, windSpeed: 45 },
    recommendedShelter: {
      dimensions: { width: 5, length: 6, height: 3 },
      orientation: 'South-Facing (Max Solar Gain)',
      materials: { walls: 'Composite Phase Change Material (PCM)', roof: 'PUF Insulated Panels', wallThickness_mm: 150 },
      optimalMaterialDetails: {
        name: "NIST: Polyurethane Foam",
        thermalConductivity: 0.026,
        density: 35.2,
        costPerUnit: 160,
        estimatedTotalCost: 29760,
        heatFlux: 6.07,
        totalHeatLoss: 582,
        efficiencyScore: 82.5
      },
      topMaterialRecommendations: generateTop3MaterialRecommendations(6, 5, 3, 150, 20, -15, 'ladakh'),
      simulationResults: { predictedInsideTempNight: 12, heatLossRate: 'Low' }
    },
    hourlyForecast: [
      { time: '00:00', ambientTemp: -12, insideTemp: 12 },
      { time: '04:00', ambientTemp: -15, insideTemp: 10 },
      { time: '08:00', ambientTemp: -5, insideTemp: 13 },
      { time: '12:00', ambientTemp: 5, insideTemp: 18 },
      { time: '16:00', ambientTemp: 2, insideTemp: 16 },
      { time: '20:00', ambientTemp: -8, insideTemp: 14 },
    ]
  },
  thar: {
    locationId: 'thar',
    locationName: 'Thar Desert (Hot & Dry)',
    ambientData: { avgTempDay: 45, avgTempNight: 20, solarIrradiance: 3200, windSpeed: 25 },
    recommendedShelter: {
      dimensions: { width: 6, length: 8, height: 3.5 },
      orientation: 'North-Facing (Min Direct Sun)',
      materials: { walls: 'Aerated Concrete + Reflective Coating', roof: 'Double Skin Ventilated Roof', wallThickness_mm: 200 },
      optimalMaterialDetails: {
        name: "NIST: Aerated Concrete",
        thermalConductivity: 0.09,
        density: 450,
        costPerUnit: 140,
        estimatedTotalCost: 42340,
        heatFlux: 11.25,
        totalHeatLoss: 1642,
        efficiencyScore: 79.4
      },
      topMaterialRecommendations: generateTop3MaterialRecommendations(8, 6, 3.5, 200, 24, 20, 'thar'),
      simulationResults: { predictedInsideTempNight: 24, heatLossRate: 'High Heat Rejection' }
    },
    hourlyForecast: [
      { time: '00:00', ambientTemp: 22, insideTemp: 24 },
      { time: '04:00', ambientTemp: 20, insideTemp: 23 },
      { time: '08:00', ambientTemp: 30, insideTemp: 25 },
      { time: '12:00', ambientTemp: 45, insideTemp: 27 },
      { time: '16:00', ambientTemp: 42, insideTemp: 28 },
      { time: '20:00', ambientTemp: 28, insideTemp: 25 },
    ]
  },
  tawang: {
    locationId: 'tawang',
    locationName: 'Tawang (Cold & Humid)',
    ambientData: { avgTempDay: 8, avgTempNight: -5, solarIrradiance: 1200, windSpeed: 15 },
    recommendedShelter: {
      dimensions: { width: 5, length: 5, height: 3 },
      orientation: 'South-East Facing',
      materials: { walls: 'Treated Bamboo + Mineral Wool', roof: 'Sloped Metal + PUF', wallThickness_mm: 120 },
      optimalMaterialDetails: {
        name: "NIST: Mineral Wool",
        thermalConductivity: 0.04,
        density: 120,
        costPerUnit: 110,
        estimatedTotalCost: 15300,
        heatFlux: 8.33,
        totalHeatLoss: 708,
        efficiencyScore: 66.4
      },
      topMaterialRecommendations: generateTop3MaterialRecommendations(5, 5, 3, 120, 18, -5, 'tawang'),
      simulationResults: { predictedInsideTempNight: 15, heatLossRate: 'Moderate' }
    },
    hourlyForecast: [
      { time: '00:00', ambientTemp: -2, insideTemp: 14 },
      { time: '04:00', ambientTemp: -5, insideTemp: 12 },
      { time: '08:00', ambientTemp: 0, insideTemp: 15 },
      { time: '12:00', ambientTemp: 8, insideTemp: 19 },
      { time: '16:00', ambientTemp: 5, insideTemp: 18 },
      { time: '20:00', ambientTemp: 0, insideTemp: 16 },
    ]
  }
};