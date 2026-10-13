import { api } from './apiClient';
import type { PaginationMeta } from '../types/api';
import type { CareOffering, CareRequest, OfferingType } from '../types/homecare';

export async function searchOfferings(query: string, offeringType?: OfferingType): Promise<CareOffering[]> {
  const params = new URLSearchParams();
  if (query) params.set('query', query);
  if (offeringType) params.set('offeringType', offeringType);
  const { data } = await api.get<{ offerings: CareOffering[] }>(`/offerings/search?${params.toString()}`);
  return data.offerings;
}

export async function getOffering(id: string): Promise<CareOffering> {
  const { data } = await api.get<{ offering: CareOffering }>(`/offerings/${id}`);
  return data.offering;
}

export async function createOffering(
  providerId: string,
  input: Omit<CareOffering, 'id' | 'providerId' | 'isActive'>,
): Promise<CareOffering> {
  const { data } = await api.post<{ offering: CareOffering }>(`/providers/applications/${providerId}/offerings`, input);
  return data.offering;
}

export async function listProviderOfferings(providerId: string): Promise<CareOffering[]> {
  const { data } = await api.get<{ offerings: CareOffering[] }>(`/providers/applications/${providerId}/offerings`);
  return data.offerings;
}

export async function updateOffering(
  providerId: string,
  offeringId: string,
  input: Partial<Pick<CareOffering, 'price' | 'availableQuantity' | 'isActive'>>,
): Promise<CareOffering> {
  const { data } = await api.patch<{ offering: CareOffering }>(
    `/providers/applications/${providerId}/offerings/${offeringId}`,
    input,
  );
  return data.offering;
}

export async function createCareRequest(input: {
  offeringId: string;
  quantity?: number;
  preferredDate: string;
  expectedReturnDate?: string;
  deliveryAddress: { line1: string; city: string; state: string; postalCode: string };
  notes?: string;
}): Promise<CareRequest> {
  const { data } = await api.post<{ request: CareRequest }>('/care-requests', input);
  return data.request;
}

export async function listMyCareRequests(): Promise<{ requests: CareRequest[]; meta?: PaginationMeta }> {
  const { data, meta } = await api.get<{ requests: CareRequest[] }>('/care-requests/mine');
  return { requests: data.requests, meta };
}

export async function getCareRequest(id: string): Promise<CareRequest> {
  const { data } = await api.get<{ request: CareRequest }>(`/care-requests/${id}`);
  return data.request;
}

export async function transitionCareRequest(id: string, action: string): Promise<CareRequest> {
  const { data } = await api.post<{ request: CareRequest }>(`/care-requests/${id}/transition`, { action });
  return data.request;
}

export async function listProviderCareRequests(providerId: string): Promise<CareRequest[]> {
  const { data } = await api.get<{ requests: CareRequest[] }>(`/providers/applications/${providerId}/care-requests`);
  return data.requests;
}
