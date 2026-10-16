import { api } from './apiClient';
import type { PaginationMeta } from '../types/api';
import type { Address, LatLng, OwnerProviderApplication, PublicProvider } from '../types/provider';

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

export interface CreateApplicationInput {
  providerType: string;
  organizationName: string;
  registrationNumber: string;
  issuingAuthority: string;
  contactPhone: string;
  contactEmail: string;
  address: Address;
  location?: LatLng;
  typeDetails: Record<string, unknown>;
}

export async function createApplication(input: CreateApplicationInput): Promise<OwnerProviderApplication> {
  const { data } = await api.post<{ application: OwnerProviderApplication }>('/providers/applications', input);
  return data.application;
}

export async function listMyApplications(): Promise<OwnerProviderApplication[]> {
  const { data } = await api.get<{ applications: OwnerProviderApplication[] }>('/providers/applications/mine');
  return data.applications;
}

export async function getMyApplication(id: string): Promise<OwnerProviderApplication> {
  const { data } = await api.get<{ application: OwnerProviderApplication }>(`/providers/applications/${id}`);
  return data.application;
}

export async function uploadDocument(id: string, documentType: string, file: File): Promise<OwnerProviderApplication> {
  const form = new FormData();
  form.append('documentType', documentType);
  form.append('document', file);
  const { data } = await api.postForm<{ application: OwnerProviderApplication }>(
    `/providers/applications/${id}/documents`,
    form,
  );
  return data.application;
}

export async function downloadDocument(applicationId: string, documentId: string): Promise<void> {
  const { blob, filename } = await api.downloadFile(`/providers/applications/${applicationId}/documents/${documentId}/download`);
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename ?? 'document';
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export async function submitApplication(id: string): Promise<OwnerProviderApplication> {
  const { data } = await api.post<{ application: OwnerProviderApplication }>(`/providers/applications/${id}/submit`);
  return data.application;
}

export async function updateListingInfo(
  id: string,
  input: Partial<{ consultationFee: number; operatingHoursNote: string; location: LatLng }>,
): Promise<OwnerProviderApplication> {
  const { data } = await api.patch<{ application: OwnerProviderApplication }>(
    `/providers/applications/${id}/listing-info`,
    input,
  );
  return data.application;
}

export interface AdminListParams {
  status?: string;
  providerType?: string;
  page?: number;
}

export async function listAdminApplications(params: AdminListParams = {}): Promise<{
  applications: OwnerProviderApplication[];
  meta?: PaginationMeta;
}> {
  const query = new URLSearchParams();
  if (params.status) query.set('status', params.status);
  if (params.providerType) query.set('providerType', params.providerType);
  if (params.page) query.set('page', String(params.page));
  const { data, meta } = await api.get<{ applications: OwnerProviderApplication[] }>(`/providers/admin?${query.toString()}`);
  return { applications: data.applications, meta };
}

export type TransitionAction = 'start_review' | 'approve' | 'reject' | 'suspend' | 'reinstate' | 'mark_expired';

export async function transitionApplication(
  id: string,
  action: TransitionAction,
  reason?: string,
): Promise<OwnerProviderApplication> {
  const { data } = await api.post<{ application: OwnerProviderApplication }>(`/providers/admin/${id}/transition`, {
    action,
    reason,
  });
  return data.application;
}

export async function setAvailability(id: string, isCurrentlyAvailable: boolean): Promise<OwnerProviderApplication> {
  const { data } = await api.patch<{ application: OwnerProviderApplication }>(
    `/providers/applications/${id}/availability`,
    { isCurrentlyAvailable },
  );
  return data.application;
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
