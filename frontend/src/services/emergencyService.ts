import { api } from './apiClient';
import type { EmergencyGuide } from '../types/emergency';

export async function listActiveGuides(): Promise<EmergencyGuide[]> {
  const { data } = await api.get<{ guides: EmergencyGuide[] }>('/emergency/guides');
  return data.guides;
}

export async function listAllGuides(): Promise<EmergencyGuide[]> {
  const { data } = await api.get<{ guides: EmergencyGuide[] }>('/emergency/admin/guides');
  return data.guides;
}

export async function createGuide(input: {
  title: string;
  redFlagSymptoms: string[];
  guidance: string;
}): Promise<EmergencyGuide> {
  const { data } = await api.post<{ guide: EmergencyGuide }>('/emergency/admin/guides', input);
  return data.guide;
}

export async function updateGuide(id: string, input: Partial<{ isActive: boolean; clinicallyReviewed: boolean }>): Promise<EmergencyGuide> {
  const { data } = await api.patch<{ guide: EmergencyGuide }>(`/emergency/admin/guides/${id}`, input);
  return data.guide;
}

export async function deleteGuide(id: string): Promise<void> {
  await api.delete(`/emergency/admin/guides/${id}`);
}
