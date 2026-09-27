import api from './api';

export interface SchemaField {
  path: string;
  type: 'string' | 'number' | 'integer';
  required: boolean;
}

export interface UserInputSchemaResponse {
  success: boolean;
  data: {
    version: string;
    description: string;
    endpoint: string;
    fields: SchemaField[];
  };
}

export interface BackendHealthResponse {
  success: boolean;
  service: string;
  status: string;
  designEngine: string;
}

export const fetchUserInputSchema = async (): Promise<UserInputSchemaResponse['data']> => {
  const response = await api.get<UserInputSchemaResponse>('/config/user-inputs');
  return response.data.data;
};

export const fetchBackendHealth = async (): Promise<BackendHealthResponse> => {
  const response = await api.get<BackendHealthResponse>('/health');
  return response.data;
};
