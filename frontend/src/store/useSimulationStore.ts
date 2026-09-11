import { create } from 'zustand';
import api from '@/services/api';
import { mockDatabase, type SimulationData } from './mockData';

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
  locationId: 'laddakh',
  locationName: 'Laddakh',
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
  activeLocation: 'laddakh',
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
      laddakh: { lat: 34.1526, lon: 77.5771, locationName: 'Laddakh', locationId: 'laddakh' },
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
      
      return { 
        draftParams: { ...state.draftParams, wallThickness: newThickness },
        data: {
          ...state.data,
          recommendedShelter: {
            ...state.data.recommendedShelter,
            materials: {
              ...state.data.recommendedShelter.materials,
              wallThickness_mm: newThickness
            }
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
    const toastId = get().addToast('Running thermal FEA simulation...', 'loading');
    
    try {
      const response = await api.post('/sih/simulate', {
        lat: draft.lat,
        lon: draft.lon,
        location: draft.locationName,
        targetTemp: draft.targetTemp,
        dimensions: { length: draft.length, width: draft.width, height: draft.height },
        orientation: draft.orientation,
        roofMaterial: draft.roof,
        wallThickness_mm: draft.wallThickness
      });
      
      const backendData = response.data;
      
      const transformedData: SimulationData = {
        locationId: draft.locationId,
        locationName: backendData.location || draft.locationName,
        ambientData: {
          avgTempDay: backendData.ambientData.avgTempDay,
          avgTempNight: backendData.ambientData.avgTempNight,
          solarIrradiance: backendData.ambientData.solarIrradiance,
          windSpeed: 15 
        },
        recommendedShelter: {
          dimensions: backendData.recommendedShelter.dimensions,
          orientation: backendData.recommendedShelter.orientation,
          materials: {
            walls: backendData.recommendedShelter.materials.walls,
            roof: backendData.recommendedShelter.materials.roof,
            wallThickness_mm: backendData.recommendedShelter.materials.wallThickness_mm
          },
          optimalMaterialDetails: backendData.recommendedShelter.optimalMaterialDetails,
          simulationResults: {
            predictedInsideTempNight: backendData.recommendedShelter.simulationResults.predictedInsideTempNight,
            heatLossRate: backendData.recommendedShelter.simulationResults.heatLossRate
          }
        },
        hourlyForecast: backendData.ambientData.hourlyForecast.map((hr: any) => ({
          time: `${hr.hour}:00`,
          ambientTemp: hr.temp,
          insideTemp: backendData.recommendedShelter.simulationResults.hourlyInsideTemp[hr.hour] || hr.temp
        }))
      };

      get().removeToast(toastId);
      set({ 
        data: transformedData, 
        activeLocation: draft.locationId, 
        isLoading: false, 
        isConnected: true
      });
      get().addToast('Simulation parameters generated successfully!', 'success');
    } catch (err: any) {
      console.error(err);
      
      // Fallback behavior
      let fallbackData = mockDatabase[draft.locationId] || mockDatabase['ladakh'];
      fallbackData = JSON.parse(JSON.stringify(fallbackData));
      fallbackData.recommendedShelter.dimensions = { length: draft.length, width: draft.width, height: draft.height };
      fallbackData.recommendedShelter.materials.wallThickness_mm = draft.wallThickness;
      fallbackData.recommendedShelter.orientation = draft.orientation;

      get().removeToast(toastId);
      
      if (err.response?.status === 403 || err.response?.status === 401) {
        set({ 
          error: 'Authentication Required', 
          isLoading: false,
          isConnected: false
        });
        get().addToast('Authentication Required: Please Sign In to execute simulations.', 'error');
      } else {
        set({ 
          error: err.response?.data?.message || 'Failed to fetch simulation data', 
          isLoading: false,
          isConnected: false,
          activeLocation: draft.locationId,
          data: fallbackData
        });
        get().addToast('Failed to connect. Using fallback data.', 'error');
      }
    }
  }
}));