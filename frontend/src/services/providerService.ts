import { api } from './apiClient';
import type { PaginationMeta } from '../types/api';
import type { PublicProvider } from '../types/provider';

export interface SearchParams {
  lat?: number;
  lng?: number;
  radiusKm?: number;
  city?: string;
  providerType?: string;
  page?: number;
}

export async function searchProviders(params: SearchParams): Promise<{ providers: PublicProvider[]; meta?: PaginationMeta }> {
  const query = new URLSearchParams();
  if (params.lat !== undefined) query.set('lat', String(params.lat));
  if (params.lng !== undefined) query.set('lng', String(params.lng));
  if (params.radiusKm !== undefined) query.set('radiusKm', String(params.radiusKm));
  if (params.city) query.set('city', params.city);
  if (params.providerType) query.set('providerType', params.providerType);
  if (params.page) query.set('page', String(params.page));

  const { data, meta } = await api.get<{ providers: PublicProvider[] }>(`/providers/search?${query.toString()}`);
  return { providers: data.providers, meta };
}

export async function getProvider(id: string): Promise<PublicProvider> {
  const { data } = await api.get<{ provider: PublicProvider }>(`/providers/search/${id}`);
  return data.provider;
}

export const PROVIDER_TYPE_LABELS: Record<string, string> = {
  doctor: 'Doctor',
  hospital: 'Hospital',
  clinic: 'Clinic',
  pharmacy: 'Pharmacy',
  diagnostic_lab: 'Diagnostic Lab',
  ambulance_provider: 'Ambulance Service',
  equipment_provider: 'Medical Equipment',
  mobile_van_operator: 'Mobile Medical Van',
  ngo_coordinator: 'NGO / Health Camp',
  insurance_provider: 'Insurance Provider',
};
