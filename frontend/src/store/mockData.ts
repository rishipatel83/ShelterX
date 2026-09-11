// src/store/mockData.ts

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
    simulationResults: {
      predictedInsideTempNight: number;
      heatLossRate: string;
    };
  };
  hourlyForecast: Array<{ time: string; ambientTemp: number; insideTemp: number }>;
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
        thermalConductivity: 0.028,
        density: 35.2,
        costPerUnit: 150,
        estimatedTotalCost: 18450,
        heatFlux: 17.92,
        totalHeatLoss: 1685,
        efficiencyScore: 52.34
      },
      simulationResults: { predictedInsideTempNight: 12, heatLossRate: 'Low' }
    },
    // The graph data: Notice how ambient drops below zero, but inside stays stable
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
        thermalConductivity: 0.11,
        density: 400,
        costPerUnit: 120,
        estimatedTotalCost: 34000,
        heatFlux: 24.5,
        totalHeatLoss: 2100,
        efficiencyScore: 68.2
      },
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
        costPerUnit: 180,
        estimatedTotalCost: 15400,
        heatFlux: 21.0,
        totalHeatLoss: 1850,
        efficiencyScore: 48.9
      },
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