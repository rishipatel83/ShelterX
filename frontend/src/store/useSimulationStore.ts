import { create } from 'zustand';
import api from '@/services/api';
import { mockDatabase, generateTop3MaterialRecommendations, type SimulationData } from './mockData';

export interface DraftParams {
  locationId: string;
  locationName: string;
  lat: number;
  lon: number;
  targetTemp: number;
  length: number;
  width: number;
  height: number;
  orientation: string;
  roof: string;
  wallThickness: number;
  shelterModel: string;
  // New optional fields matching backend schema v2.0.0
  occupants?: number;
  budgetINR?: number;
  insulationThickness_mm?: number;
  materialSelectionMode?: string;
  priority?: string;
  materialId?: string;
}

export type ToastType = 'success' | 'error' | 'info' | 'loading';

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface SimulationState {
  activeLocation: string;
  data: SimulationData;
  isLoading: boolean;
  error: string | null;
  isConnected: boolean;
  toasts: Toast[];
  user: { username: string } | null;
  draftParams: DraftParams;
  setDraftParam: <K extends keyof DraftParams>(key: K, value: DraftParams[K]) => void;
  setLocationPreset: (locationId: string) => void;
  updateWallThickness: (newThickness: number) => void;
  fetchSimulation: () => Promise<void>;
  addToast: (message: string, type?: ToastType) => string;
  removeToast: (id: string) => void;
  setUser: (username: string | null) => void;
}

const defaultDraft: DraftParams = {
  locationId: 'ladakh',
  locationName: 'Ladakh',
  lat: 34.1526,
  lon: 77.5771,
  targetTemp: 20,
  length: 6,
  width: 5,
  height: 3,
  orientation: 'South-Facing',
  roof: 'PUF Insulated Panels',
  wallThickness: 150,
  shelterModel: 'Modular Box'
};

export const useSimulationStore = create<SimulationState>((set, get) => ({
  activeLocation: 'ladakh',
  data: JSON.parse(JSON.stringify(mockDatabase['ladakh'])),
  isLoading: false,
  error: null,
  isConnected: true,
  toasts: [],
  user: localStorage.getItem('username') ? { username: localStorage.getItem('username') as string } : null,
  draftParams: { ...defaultDraft },
  
  setUser: (username) => {
    if (username) {
      localStorage.setItem('username', username);
      set({ user: { username } });
    } else {
      localStorage.removeItem('username');
      set({ user: null });
    }
  },

  addToast: (message, type = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    set((state) => ({ toasts: [...state.toasts, { id, message, type }] }));
    
    if (type !== 'loading') {
      setTimeout(() => {
        get().removeToast(id);
      }, 3000);
    }
    return id;
  },

  removeToast: (id) => set((state) => ({
    toasts: state.toasts.filter((t) => t.id !== id)
  })),

  setDraftParam: (key, value) => set((state) => ({
    draftParams: { ...state.draftParams, [key]: value }
  })),

  setLocationPreset: (locationId) => {
    const presets: Record<string, Partial<DraftParams>> = {
      ladakh: { lat: 34.1526, lon: 77.5771, locationName: 'Ladakh', locationId: 'ladakh' },
      siachen: { lat: 35.1866, lon: 77.1517, locationName: 'Siachen Glacier', locationId: 'siachen' },
      dras: { lat: 34.4287, lon: 75.7601, locationName: 'Dras / Kargil', locationId: 'dras' },
      leh: { lat: 34.1525, lon: 77.5770, locationName: 'Leh', locationId: 'leh' },
      tawang: { lat: 27.5866, lon: 91.8596, locationName: 'Tawang', locationId: 'tawang' }
    };
    
    if (presets[locationId]) {
      set((state) => ({
        draftParams: { ...state.draftParams, ...presets[locationId] }
      }));
    }
  },

  updateWallThickness: (newThickness) => {
    set((state) => {
      const baselineThickness = 150;
      const thicknessDiff = newThickness - baselineThickness;
      const tempAdjustment = thicknessDiff * 0.05;
      const updatedTopRecs = generateTop3MaterialRecommendations(
        state.draftParams.length,
        state.draftParams.width,
        state.draftParams.height,
        newThickness,
        state.draftParams.targetTemp,
        state.data.ambientData.avgTempNight,
        state.draftParams.locationId
      );
      
      return { 
        draftParams: { ...state.draftParams, wallThickness: newThickness },
        data: {
          ...state.data,
          recommendedShelter: {
            ...state.data.recommendedShelter,
            materials: {
              ...state.data.recommendedShelter.materials,
              wallThickness_mm: newThickness
            },
            optimalMaterialDetails: {
              name: updatedTopRecs[0].name,
              thermalConductivity: updatedTopRecs[0].thermalConductivity,
              density: updatedTopRecs[0].density ?? 35.2,
              costPerUnit: updatedTopRecs[0].costPerUnit ?? 160,
              estimatedTotalCost: updatedTopRecs[0].estimatedTotalCost,
              heatFlux: updatedTopRecs[0].heatFlux,
              totalHeatLoss: updatedTopRecs[0].totalHeatLoss,
              efficiencyScore: updatedTopRecs[0].efficiencyScore
            },
            topMaterialRecommendations: updatedTopRecs
          },
          hourlyForecast: state.data.hourlyForecast.map((point) => ({
            ...point,
            insideTemp: Number((point.insideTemp + (state.activeLocation === 'thar' ? -tempAdjustment : tempAdjustment)).toFixed(1))
          }))
        } 
      };
    });
  },

  fetchSimulation: async () => {
    const draft = get().draftParams;
    set({ isLoading: true, error: null });
    const toastId = get().addToast('Fetching live weather & running thermal simulation...', 'loading');

    try {
      // Build payload matching backend schema v2.0.0
      const payload: Record<string, any> = {
        location: draft.locationName,
        lat: draft.lat,
        lon: draft.lon,
        targetTemp: draft.targetTemp,
        dimensions: { length: draft.length, width: draft.width, height: draft.height },
        orientation: draft.orientation,
        roofMaterial: draft.roof,
        wallThickness_mm: draft.wallThickness,
        insulationThickness_mm: draft.insulationThickness_mm ?? draft.wallThickness,
        materialCode: draft.materialId || 'PUF_SANDWICH_01',
      };
      // Attach optional schema fields only when defined
      if (draft.occupants !== undefined) payload.occupants = draft.occupants;
      if (draft.budgetINR !== undefined) payload.budgetINR = draft.budgetINR;
      if (draft.materialSelectionMode) payload.materialSelectionMode = draft.materialSelectionMode;
      if (draft.priority) payload.priority = draft.priority;
      if (draft.materialId) payload.materialId = draft.materialId;
      // Passed through extra (not in schema but preserved)
      if (draft.shelterModel) payload.shelterModel = draft.shelterModel;

      const response = await api.post('/sih/simulate', payload);
      const b = response.data; // { success, requestId, schemaVersion, persisted, inputs, derivedGeometry, weather, result }

      // ---- Transform Open-Meteo weather data ----
      const weather = b.weather ?? {};
      const hourlyWeather: Array<{ hour: number; temperatureC: number; windSpeedMs: number | null; solarIrradianceWm2: number | null }> =
        weather.hourly ?? [];

      // Derive day/night averages from hourly data
      const dayTemps = hourlyWeather.filter(h => h.hour >= 6 && h.hour <= 18).map(h => h.temperatureC);
      const nightTemps = hourlyWeather.filter(h => h.hour < 6 || h.hour > 18).map(h => h.temperatureC);
      const avg = (arr: number[]) => arr.length ? Math.round((arr.reduce((s, v) => s + v, 0) / arr.length) * 10) / 10 : 0;

      const avgTempDay = dayTemps.length ? avg(dayTemps) : (weather.averageTemperatureC ?? 0);
      const avgTempNight = nightTemps.length ? avg(nightTemps) : (weather.averageTemperatureC ?? 0);
      const peakSolar = weather.peakSolarIrradianceWm2 ?? 0;
      const avgWind = weather.averageWindSpeedMs ?? 0;

      // Build 24-hour forecast for the chart (ambient uses live data; inside is estimated)
      const hourlyForecast = hourlyWeather.slice(0, 24).map(h => {
        // Simple thermal lag estimate: inside drifts toward target, buffered by insulation
        const insideEstimate = Math.round(draft.targetTemp * 0.65 + h.temperatureC * 0.35);
        return {
          time: `${String(h.hour).padStart(2, '0')}:00`,
          ambientTemp: Math.round(h.temperatureC * 10) / 10,
          insideTemp: insideEstimate,
        };
      });

      // Fall back to 6-point mock if weather was unavailable
      const chartData = hourlyForecast.length > 0
        ? hourlyForecast
        : (mockDatabase[draft.locationId] ?? mockDatabase['ladakh']).hourlyForecast;

      // ---- Derive shelter inputs shown in the results panel ----
      const geo = b.derivedGeometry ?? null;
      const result = b.result ?? {};

      // Generate top 3 ranked material recommendations based on physics
      const topRecs = generateTop3MaterialRecommendations(
        draft.length,
        draft.width,
        draft.height,
        draft.wallThickness,
        draft.targetTemp,
        avgTempNight,
        draft.locationId
      );

      const transformedData: SimulationData = {
        locationId: draft.locationId,
        locationName: draft.locationName,
        ambientData: {
          avgTempDay,
          avgTempNight,
          solarIrradiance: Math.round(peakSolar),
          windSpeed: Math.round(avgWind * 3.6), // m/s → km/h
        },
        recommendedShelter: {
          dimensions: { width: draft.width, length: draft.length, height: draft.height },
          orientation: draft.orientation,
          materials: {
            // walls holds the shelter model label; material name comes from backend design engine
            walls: draft.shelterModel || 'Awaiting Material Dataset',
            roof: draft.roof,
            wallThickness_mm: draft.wallThickness,
            // Store insulationThickness so VisualsPanel can use it as roofThicknessMm
            insulationThickness_mm: draft.insulationThickness_mm ?? null,
          },
          optimalMaterialDetails: {
            name: topRecs[0].name,
            thermalConductivity: topRecs[0].thermalConductivity,
            density: topRecs[0].density ?? 35.2,
            costPerUnit: topRecs[0].costPerUnit ?? 160,
            estimatedTotalCost: topRecs[0].estimatedTotalCost,
            heatFlux: topRecs[0].heatFlux,
            totalHeatLoss: topRecs[0].totalHeatLoss,
            efficiencyScore: topRecs[0].efficiencyScore
          },
          topMaterialRecommendations: topRecs,
          simulationResults: {
            predictedInsideTempNight: avg(nightTemps.length ? nightTemps.map(() => Math.round(draft.targetTemp * 0.65 + nightTemps[0] * 0.35)) : [draft.targetTemp]),
            heatLossRate: result.status === 'waiting-for-user-datasets' ? 'Pending Dataset' : 'Low',
          },
        },
        hourlyForecast: chartData,
        derivedGeometry: geo ?? undefined,
        backendMeta: {
          requestId: b.requestId,
          schemaVersion: b.schemaVersion,
          persisted: b.persisted,
          designEngineStatus: result.status,
          weatherSource: weather.source ?? null,
          weatherAvailable: weather.available ?? false,
          // averageTemperatureC from Open-Meteo used as outsideTempC baseline in VisualsPanel
          averageTemperatureC: weather.averageTemperatureC ?? null,
          averageWindSpeedMs: weather.averageWindSpeedMs ?? null,
          peakSolarIrradianceWm2: weather.peakSolarIrradianceWm2 ?? null,
          // derivedGeometry mirrors b.derivedGeometry for direct chart access
          wallAreaM2: b.derivedGeometry?.wallAreaM2 ?? null,
          roofAreaM2: b.derivedGeometry?.roofAreaM2 ?? null,
          floorAreaM2: b.derivedGeometry?.floorAreaM2 ?? null,
          volumeM3: b.derivedGeometry?.volumeM3 ?? null,
        },
      };

      get().removeToast(toastId);
      set({
        data: transformedData,
        activeLocation: draft.locationId,
        isLoading: false,
        isConnected: true,
        error: null,
      });
      const weatherMsg = weather.available ? `Live Open-Meteo weather loaded.` : `Weather unavailable — using estimated data.`;
      get().addToast(`Simulation complete. ${weatherMsg}`, 'success');

    } catch (err: any) {
      console.error('[ShelterX] fetchSimulation error:', err);

      // Graceful fallback to mock data with user's draft dimensions applied
      let fallbackData = mockDatabase[draft.locationId] || mockDatabase['ladakh'];
      fallbackData = JSON.parse(JSON.stringify(fallbackData));
      fallbackData.recommendedShelter.dimensions = { length: draft.length, width: draft.width, height: draft.height };
      fallbackData.recommendedShelter.materials.wallThickness_mm = draft.wallThickness;
      fallbackData.recommendedShelter.orientation = draft.orientation;
      fallbackData.recommendedShelter.topMaterialRecommendations = generateTop3MaterialRecommendations(
        draft.length,
        draft.width,
        draft.height,
        draft.wallThickness,
        draft.targetTemp,
        fallbackData.ambientData.avgTempNight,
        draft.locationId
      );

      get().removeToast(toastId);

      const status = err.response?.status;
      const message = err.response?.data?.message || err.message;

      if (status === 403 || status === 401) {
        set({ error: 'Authentication Required', isLoading: false, isConnected: false });
        get().addToast('Authentication Required: Please Sign In to execute simulations.', 'error');
      } else if (err.code === 'ERR_NETWORK' || !err.response) {
        set({
          error: 'ShelterX backend unreachable',
          isLoading: false,
          isConnected: false,
          activeLocation: draft.locationId,
          data: fallbackData,
        });
        get().addToast('Backend unreachable — showing cached reference data.', 'error');
      } else {
        set({
          error: message || 'Failed to complete simulation',
          isLoading: false,
          isConnected: true,
          activeLocation: draft.locationId,
          data: fallbackData,
        });
        get().addToast(message || 'Simulation warning: showing reference data.', 'error');
      }
    }
  }
}));