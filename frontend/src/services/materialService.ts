import api from './api';

export interface MaterialItem {
  id?: string;
  name: string;
  thermalConductivity: number;
  density?: number;
  specificHeat?: number;
  costPerUnit?: number;
  category?: string;
  description?: string;
}

export interface MaterialsApiResponse {
  success: boolean;
  source: string;
  status: string;
  data: MaterialItem[];
}

export const fetchMaterials = async (): Promise<MaterialsApiResponse> => {
  const response = await api.get<MaterialsApiResponse>('/materials');
  return response.data;
};
