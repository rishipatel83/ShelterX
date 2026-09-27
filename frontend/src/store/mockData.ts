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
  locationId: string = 'ladakh',
  lat?: number,
  lon?: number
): TopMaterialRecommendation[] => {
  const wallArea = 2 * (length * height + width * height);
  const roofArea = length * width;
  const totalArea = wallArea + roofArea;
  const thickness_m = Math.max((wallThickness_mm || 150) / 1000, 0.04);
  const deltaT = Math.max(Math.abs(targetTemp - ambientNightTemp), 1);
  const isCold = ambientNightTemp < targetTemp;
  const loc = (locationId || '').toLowerCase();

  // Determine Climate Zone
  let zone: 'EXTREME_SUBZERO_GLACIAL' | 'HIGH_ALTITUDE_COLD_ARID' | 'HOT_ARID_DESERT' | 'COLD_HUMID_ALPINE' | 'HOT_HUMID_COASTAL' | 'TEMPERATE_PLAINS' = 'HIGH_ALTITUDE_COLD_ARID';

  if (
    loc.includes('siachen') ||
    loc.includes('glacier') ||
    loc.includes('dras') ||
    ambientNightTemp <= -18 ||
    (lat !== undefined && lat >= 35.0 && lon !== undefined && lon >= 76.5 && ambientNightTemp <= -10)
  ) {
    zone = 'EXTREME_SUBZERO_GLACIAL';
  } else if (
    loc.includes('thar') ||
    loc.includes('desert') ||
    loc.includes('jaisalmer') ||
    loc.includes('rajasthan') ||
    loc.includes('bikaner') ||
    ambientNightTemp >= 28 ||
    (lat !== undefined && lat >= 23.5 && lat <= 29.5 && lon !== undefined && lon >= 69.5 && lon <= 76.0 && ambientNightTemp > 20)
  ) {
    zone = 'HOT_ARID_DESERT';
  } else if (
    loc.includes('tawang') ||
    loc.includes('arunachal') ||
    loc.includes('sikkim') ||
    loc.includes('manali') ||
    (ambientNightTemp > 0 && ambientNightTemp <= 12)
  ) {
    zone = 'COLD_HUMID_ALPINE';
  } else if (
    loc.includes('mumbai') ||
    loc.includes('chennai') ||
    loc.includes('kochi') ||
    loc.includes('coastal') ||
    (ambientNightTemp >= 24 && lon !== undefined && (lon < 74 || lon > 80))
  ) {
    zone = 'HOT_HUMID_COASTAL';
  } else if (ambientNightTemp > 12 && ambientNightTemp < 24) {
    zone = 'TEMPERATE_PLAINS';
  } else {
    // Default cold alpine (e.g. Ladakh, Leh)
    zone = 'HIGH_ALTITUDE_COLD_ARID';
  }

  type CandidateTemplate = {
    name: string;
    recommendationType: string;
    tagline: string;
    badgeColor: 'emerald' | 'blue' | 'amber';
    thermalConductivity: number;
    density: number;
    costPerUnit: number;
    baseRateM2: number;
    efficiencyBase: number;
  };

  let candidates: CandidateTemplate[];

  switch (zone) {
    case 'EXTREME_SUBZERO_GLACIAL':
      candidates = [
        {
          name: 'Aerogel Cryo-Vacuum Insulated Panel (VIP)',
          recommendationType: 'Max Insulation',
          tagline: 'Cryogenic Super-Insulation: Certified for sub-zero Himalayan glacier survival',
          badgeColor: 'blue',
          thermalConductivity: 0.014,
          density: 130.0,
          costPerUnit: 340,
          baseRateM2: 560,
          efficiencyBase: 95.5
        },
        {
          name: 'Cryo-PUF Composite with Radiant Barrier',
          recommendationType: 'Optimal Balance',
          tagline: 'High-density closed-cell core with multi-layer aluminized radiative shield',
          badgeColor: 'emerald',
          thermalConductivity: 0.020,
          density: 45.0,
          costPerUnit: 185,
          baseRateM2: 340,
          efficiencyBase: 86.8
        },
        {
          name: 'Basalt Rockwool & Aerogel Hybrid Quilt',
          recommendationType: 'Budget Friendly',
          tagline: 'Non-combustible cold-crack resistant thermal sandwich for rapid military deployment',
          badgeColor: 'amber',
          thermalConductivity: 0.032,
          density: 120.0,
          costPerUnit: 110,
          baseRateM2: 210,
          efficiencyBase: 73.2
        }
      ];
      break;

    case 'HOT_ARID_DESERT':
      candidates = [
        {
          name: 'Autoclaved Aerated Concrete (AAC) + Cool-Roof Barrier',
          recommendationType: 'Thermal Mass Defense',
          tagline: 'High Thermal Inertia: Buffers extreme daytime solar radiation spikes',
          badgeColor: 'emerald',
          thermalConductivity: 0.090,
          density: 450.0,
          costPerUnit: 130,
          baseRateM2: 280,
          efficiencyBase: 81.2
        },
        {
          name: 'Phase Change Material (PCM) Double-Skin Shell',
          recommendationType: 'Max Heat Rejection',
          tagline: 'Latent Heat Storage: Absorbs peak daytime radiation, convective night purging',
          badgeColor: 'blue',
          thermalConductivity: 0.028,
          density: 220.0,
          costPerUnit: 260,
          baseRateM2: 480,
          efficiencyBase: 92.4
        },
        {
          name: 'Extruded Polystyrene (XPS) with Albedo Radiant Foil',
          recommendationType: 'Budget Friendly',
          tagline: 'Low-cost lightweight board with 97% reflective infrared radiant barrier',
          badgeColor: 'amber',
          thermalConductivity: 0.034,
          density: 35.0,
          costPerUnit: 85,
          baseRateM2: 170,
          efficiencyBase: 69.5
        }
      ];
      break;

    case 'COLD_HUMID_ALPINE':
      candidates = [
        {
          name: 'Graphite-Enhanced Neopor EPS Structural Board',
          recommendationType: 'Moisture & Cold Balance',
          tagline: 'Infrared-absorbing graphite matrix with zero moisture absorption for alpine snow',
          badgeColor: 'emerald',
          thermalConductivity: 0.031,
          density: 25.0,
          costPerUnit: 120,
          baseRateM2: 230,
          efficiencyBase: 83.6
        },
        {
          name: 'Hydrophobic Rockwool ThermalRock Slab',
          recommendationType: 'Breathable Defense',
          tagline: 'Water-repellent stone wool preventing mold rot and internal condensation',
          badgeColor: 'blue',
          thermalConductivity: 0.036,
          density: 60.0,
          costPerUnit: 105,
          baseRateM2: 195,
          efficiencyBase: 77.8
        },
        {
          name: 'Treated Structural Bamboo-Fiber Core Panel',
          recommendationType: 'Eco Budget Choice',
          tagline: 'Locally adaptable, seismic-resilient sustainable composite for mountain shelters',
          badgeColor: 'amber',
          thermalConductivity: 0.046,
          density: 280.0,
          costPerUnit: 70,
          baseRateM2: 140,
          efficiencyBase: 67.2
        }
      ];
      break;

    case 'HOT_HUMID_COASTAL':
      candidates = [
        {
          name: 'Closed-Cell PIR Panel with Marine-Grade Facing',
          recommendationType: 'Anti-Corrosive Shield',
          tagline: 'Zero moisture permeability with high thermal barrier for salty coastal air',
          badgeColor: 'emerald',
          thermalConductivity: 0.022,
          density: 38.0,
          costPerUnit: 155,
          baseRateM2: 280,
          efficiencyBase: 88.2
        },
        {
          name: 'Micro-Perforated Radiative Cool-Roof Sandwich',
          recommendationType: 'Max Ventilation',
          tagline: 'High-emissivity coating driving continuous natural buoyant convective cooling',
          badgeColor: 'blue',
          thermalConductivity: 0.029,
          density: 75.0,
          costPerUnit: 210,
          baseRateM2: 380,
          efficiencyBase: 82.5
        },
        {
          name: 'FRP-Clad Expanded Polystyrene Composite',
          recommendationType: 'Budget Friendly',
          tagline: '100% rustproof, rot-proof rapid deployment panel for disaster relief',
          badgeColor: 'amber',
          thermalConductivity: 0.036,
          density: 30.0,
          costPerUnit: 80,
          baseRateM2: 155,
          efficiencyBase: 71.0
        }
      ];
      break;

    case 'TEMPERATE_PLAINS':
      candidates = [
        {
          name: 'Bio-Composite Hemp & Recycled Fiber Panel',
          recommendationType: 'Sustainable Balance',
          tagline: 'Carbon-negative envelope offering passive thermal and acoustic comfort',
          badgeColor: 'emerald',
          thermalConductivity: 0.034,
          density: 55.0,
          costPerUnit: 125,
          baseRateM2: 230,
          efficiencyBase: 82.4
        },
        {
          name: 'Polyurethane Foam (PUF) Hybrid Board',
          recommendationType: 'Energy Efficient',
          tagline: 'Low thermal leakage minimizing dual-season HVAC power consumption',
          badgeColor: 'blue',
          thermalConductivity: 0.025,
          density: 38.0,
          costPerUnit: 150,
          baseRateM2: 275,
          efficiencyBase: 87.6
        },
        {
          name: 'Cellular Lightweight Concrete Block Assembly',
          recommendationType: 'Durable Budget',
          tagline: 'Low-cost high durability modular blocks for permanent shelter stability',
          badgeColor: 'amber',
          thermalConductivity: 0.052,
          density: 350.0,
          costPerUnit: 75,
          baseRateM2: 145,
          efficiencyBase: 65.5
        }
      ];
      break;

    case 'HIGH_ALTITUDE_COLD_ARID':
    default:
      candidates = [
        {
          name: 'NIST: Polyurethane Foam (PUF) Composite Panel',
          recommendationType: 'Optimal Balance',
          tagline: 'High Thermal Retention & Economical Life-Cycle Deployment in High Altitude',
          badgeColor: 'emerald',
          thermalConductivity: 0.024,
          density: 38.0,
          costPerUnit: 160,
          baseRateM2: 310,
          efficiencyBase: 84.5
        },
        {
          name: 'Aerogel Vacuum Insulated Panel (VIP)',
          recommendationType: 'Max Insulation',
          tagline: 'Ultra-Low Heat Flux: Engineered for severe Himalayan sub-zero nights',
          badgeColor: 'blue',
          thermalConductivity: 0.016,
          density: 140.0,
          costPerUnit: 310,
          baseRateM2: 530,
          efficiencyBase: 94.8
        },
        {
          name: 'High-Density Rockwool Core Sandwich',
          recommendationType: 'Budget Friendly',
          tagline: 'Cost-Effective, Non-Combustible Fast-Assembly Modular Panel',
          badgeColor: 'amber',
          thermalConductivity: 0.038,
          density: 100.0,
          costPerUnit: 95,
          baseRateM2: 180,
          efficiencyBase: 68.4
        }
      ];
      break;
  }

  const thicknessFactor = 0.65 + 0.35 * (wallThickness_mm / 150);

  return candidates.map((tmpl) => {
    const k = tmpl.thermalConductivity;
    const flux = Number(((k / thickness_m) * deltaT).toFixed(1));
    const loss = Math.round(flux * totalArea);
    const estimatedCost = Math.round(totalArea * tmpl.baseRateM2 * thicknessFactor);

    let predictedInsideTempNight: number;
    if (isCold) {
      const thermalResistance = thickness_m / k;
      const drift = Math.round(deltaT / (1 + thermalResistance * 0.7));
      predictedInsideTempNight = Math.max(
        Math.round(targetTemp - drift),
        Math.round(ambientNightTemp + 2)
      );
    } else {
      const thermalResistance = thickness_m / k;
      const rise = Math.round(deltaT / (1 + thermalResistance * 0.6));
      predictedInsideTempNight = Math.round(targetTemp + rise);
    }

    const fluxPenalty = Math.min(flux * 1.5, 30);
    const condPenalty = k * 180;
    const efficiencyScore = Number(
      Math.min(Math.max(tmpl.efficiencyBase - fluxPenalty * 0.2 - condPenalty * 0.1, 55.0), 97.8).toFixed(1)
    );

    return {
      name: tmpl.name,
      recommendationType: tmpl.recommendationType,
      tagline: tmpl.tagline,
      badgeColor: tmpl.badgeColor,
      thermalConductivity: k,
      density: tmpl.density,
      costPerUnit: tmpl.costPerUnit,
      estimatedTotalCost: estimatedCost,
      heatFlux: flux,
      totalHeatLoss: loss,
      efficiencyScore,
      simulationResults: {
        predictedInsideTempNight,
        predictedInsideTempDay: targetTemp,
        heatLossRate: isCold ? 'Low Heat Loss' : 'Heat Rejected'
      }
    };
  });
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
  },
  siachen: {
    locationId: 'siachen',
    locationName: 'Siachen Glacier (Extreme Sub-Zero Glacial)',
    ambientData: { avgTempDay: -18, avgTempNight: -30, solarIrradiance: 2400, windSpeed: 65 },
    recommendedShelter: {
      dimensions: { width: 5, length: 6, height: 2.8 },
      orientation: 'South-Facing (Max Solar Exposure)',
      materials: { walls: 'Cryo-VIP Super Insulation', roof: 'Double Aerogel Thermal Cap', wallThickness_mm: 180 },
      optimalMaterialDetails: {
        name: "Aerogel Cryo-Vacuum Insulated Panel (VIP)",
        thermalConductivity: 0.014,
        density: 130.0,
        costPerUnit: 340,
        estimatedTotalCost: 59360,
        heatFlux: 3.9,
        totalHeatLoss: 450,
        efficiencyScore: 95.5
      },
      topMaterialRecommendations: generateTop3MaterialRecommendations(6, 5, 2.8, 180, 20, -30, 'siachen', 35.1866, 77.1517),
      simulationResults: { predictedInsideTempNight: 16, heatLossRate: 'Ultra-Low Conduction' }
    },
    hourlyForecast: [
      { time: '00:00', ambientTemp: -28, insideTemp: 15 },
      { time: '04:00', ambientTemp: -30, insideTemp: 14 },
      { time: '08:00', ambientTemp: -24, insideTemp: 16 },
      { time: '12:00', ambientTemp: -18, insideTemp: 19 },
      { time: '16:00', ambientTemp: -20, insideTemp: 18 },
      { time: '20:00', ambientTemp: -26, insideTemp: 16 },
    ]
  },
  dras: {
    locationId: 'dras',
    locationName: 'Dras / Kargil (Coldest Inhabited Town)',
    ambientData: { avgTempDay: -4, avgTempNight: -22, solarIrradiance: 2200, windSpeed: 40 },
    recommendedShelter: {
      dimensions: { width: 5, length: 6, height: 2.8 },
      orientation: 'South-Facing (Thermal Mass)',
      materials: { walls: 'Cryo-PUF with Thermal Barrier', roof: 'Triple Seal PUF Panel', wallThickness_mm: 160 },
      optimalMaterialDetails: {
        name: "Aerogel Cryo-Vacuum Insulated Panel (VIP)",
        thermalConductivity: 0.014,
        density: 130.0,
        costPerUnit: 340,
        estimatedTotalCost: 54100,
        heatFlux: 3.7,
        totalHeatLoss: 420,
        efficiencyScore: 94.8
      },
      topMaterialRecommendations: generateTop3MaterialRecommendations(6, 5, 2.8, 160, 20, -22, 'dras', 34.4287, 75.7601),
      simulationResults: { predictedInsideTempNight: 15, heatLossRate: 'Very Low' }
    },
    hourlyForecast: [
      { time: '00:00', ambientTemp: -19, insideTemp: 14 },
      { time: '04:00', ambientTemp: -22, insideTemp: 13 },
      { time: '08:00', ambientTemp: -12, insideTemp: 15 },
      { time: '12:00', ambientTemp: -4, insideTemp: 18 },
      { time: '16:00', ambientTemp: -7, insideTemp: 17 },
      { time: '20:00', ambientTemp: -15, insideTemp: 15 },
    ]
  },
  leh: {
    locationId: 'leh',
    locationName: 'Leh (High Altitude Plateau)',
    ambientData: { avgTempDay: 6, avgTempNight: -12, solarIrradiance: 2350, windSpeed: 30 },
    recommendedShelter: {
      dimensions: { width: 5, length: 6, height: 3 },
      orientation: 'South-Facing (Direct Solar Gain)',
      materials: { walls: 'Polyurethane Foam (PUF) Composite Panel', roof: 'PUF Sandwich Panels', wallThickness_mm: 150 },
      optimalMaterialDetails: {
        name: "NIST: Polyurethane Foam (PUF) Composite Panel",
        thermalConductivity: 0.024,
        density: 38.0,
        costPerUnit: 160,
        estimatedTotalCost: 30400,
        heatFlux: 5.1,
        totalHeatLoss: 490,
        efficiencyScore: 84.5
      },
      topMaterialRecommendations: generateTop3MaterialRecommendations(6, 5, 3, 150, 20, -12, 'leh', 34.1525, 77.5770),
      simulationResults: { predictedInsideTempNight: 14, heatLossRate: 'Low' }
    },
    hourlyForecast: [
      { time: '00:00', ambientTemp: -10, insideTemp: 14 },
      { time: '04:00', ambientTemp: -12, insideTemp: 13 },
      { time: '08:00', ambientTemp: -3, insideTemp: 15 },
      { time: '12:00', ambientTemp: 6, insideTemp: 19 },
      { time: '16:00', ambientTemp: 3, insideTemp: 17 },
      { time: '20:00', ambientTemp: -6, insideTemp: 15 },
    ]
  }
};