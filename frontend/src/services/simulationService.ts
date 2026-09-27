import api from './api';

export interface DimensionsInput {
  length: number;
  width: number;
  height: number;
}

export interface SimulateRequestPayload {
  location: string;
  lat: number;
  lon: number;
  dimensions: DimensionsInput;
  targetTemp: number;
  orientation: string;
  roofMaterial?: string;
  wallThickness_mm?: number;
  insulationThickness_mm?: number;
  occupants?: number;
  budgetINR?: number;
  materialSelectionMode?: string;
  priority?: string;
  materialId?: string;
  shelterModel?: string;
  [key: string]: any;
}

export interface DerivedGeometry {
  wallAreaM2: number;
  roofAreaM2: number;
  floorAreaM2: number;
  volumeM3: number;
}

export interface HourlyWeatherPoint {
  hour: number;
  temperatureC: number;
  windSpeedMs: number | null;
  solarIrradianceWm2: number | null;
}

export interface WeatherData {
  available: boolean;
  source: string;
  averageTemperatureC: number | null;
  averageWindSpeedMs: number | null;
  peakSolarIrradianceWm2: number | null;
  hourly?: HourlyWeatherPoint[];
  error?: string;
}

export interface DesignCost {
  budgetINR?: number | null;
  estimatedTotalCostINR?: number | null;
  withinBudget?: boolean | null;
}

export interface DesignResult {
  status: string;
  thermal?: any;
  cost?: DesignCost | null;
  recommendation?: any;
  context?: {
    weather: WeatherData;
    geometry: DerivedGeometry;
  };
}

export interface SimulateApiResponse {
  success: boolean;
  requestId: string;
  schemaVersion: string;
  persisted: boolean;
  inputs: SimulateRequestPayload;
  derivedGeometry: DerivedGeometry;
  weather: WeatherData;
  result: DesignResult;
  message?: string;
  errors?: string[];
}

export const runSimulation = async (payload: SimulateRequestPayload): Promise<SimulateApiResponse> => {
  const response = await api.post<SimulateApiResponse>('/sih/simulate', payload);
  return response.data;
};
