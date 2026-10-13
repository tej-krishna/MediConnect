import { api } from './apiClient';
import type { PaginationMeta } from '../types/api';
import type { DeliveryPartnerProfile, DeliveryPartnerDirectoryEntry, VehicleType } from '../types/delivery';

export async function applyAsDeliveryPartner(input: {
  contactPhone: string;
  vehicleType: VehicleType;
  serviceCity: string;
}): Promise<DeliveryPartnerProfile> {
  const { data } = await api.post<{ profile: DeliveryPartnerProfile }>('/delivery-partners/apply', input);
  return data.profile;
}

export async function getMyDeliveryPartnerProfile(): Promise<DeliveryPartnerProfile | null> {
  try {
    const { data } = await api.get<{ profile: DeliveryPartnerProfile }>('/delivery-partners/me');
    return data.profile;
  } catch {
    return null;
  }
}

export async function listDeliveryPartnerDirectory(city?: string): Promise<DeliveryPartnerDirectoryEntry[]> {
  const params = new URLSearchParams();
  if (city) params.set('city', city);
  const { data } = await api.get<{ profiles: DeliveryPartnerDirectoryEntry[] }>(`/delivery-partners/directory?${params.toString()}`);
  return data.profiles;
}

export async function listDeliveryPartnerApplications(
  status?: string,
): Promise<{ profiles: DeliveryPartnerProfile[]; meta?: PaginationMeta }> {
  const params = new URLSearchParams();
  if (status) params.set('status', status);
  const { data, meta } = await api.get<{ profiles: DeliveryPartnerProfile[] }>(`/delivery-partners?${params.toString()}`);
  return { profiles: data.profiles, meta };
}

export async function reviewDeliveryPartner(
  id: string,
  action: 'approve' | 'reject' | 'suspend',
  reason?: string,
): Promise<DeliveryPartnerProfile> {
  const { data } = await api.post<{ profile: DeliveryPartnerProfile }>(`/delivery-partners/${id}/review`, { action, reason });
  return data.profile;
}
