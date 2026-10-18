import { api } from './apiClient';
import type { Consultation, VisitType } from '../types/scheduling';

export interface RequestConsultationInput {
  doctorId: string;
  visitType: VisitType;
  preferredDateTime: string;
  homeVisitAddress?: { line1: string; city: string; state: string; postalCode: string };
}

export async function requestConsultation(input: RequestConsultationInput): Promise<Consultation> {
  const { data } = await api.post<{ consultation: Consultation }>('/consultations', input);
  return data.consultation;
}

export async function listMyConsultations(): Promise<Consultation[]> {
  const { data } = await api.get<{ consultations: Consultation[] }>('/consultations/mine');
  return data.consultations;
}

export async function listDoctorConsultations(doctorId: string): Promise<Consultation[]> {
  const { data } = await api.get<{ consultations: Consultation[] }>(`/providers/applications/${doctorId}/consultations`);
  return data.consultations;
}

export async function getConsultation(id: string): Promise<Consultation> {
  const { data } = await api.get<{ consultation: Consultation }>(`/consultations/${id}`);
  return data.consultation;
}

export async function confirmConsultation(id: string, confirmedDateTime: string): Promise<Consultation> {
  const { data } = await api.post<{ consultation: Consultation }>(`/consultations/${id}/transition`, {
    action: 'confirm',
    confirmedDateTime,
  });
  return data.consultation;
}

export async function completeConsultation(id: string): Promise<Consultation> {
  const { data } = await api.post<{ consultation: Consultation }>(`/consultations/${id}/transition`, { action: 'complete' });
  return data.consultation;
}

export async function cancelConsultation(id: string): Promise<Consultation> {
  const { data } = await api.post<{ consultation: Consultation }>(`/consultations/${id}/transition`, { action: 'cancel' });
  return data.consultation;
}

export async function reportNoShow(id: string): Promise<Consultation> {
  const { data } = await api.post<{ consultation: Consultation }>(`/consultations/${id}/transition`, {
    action: 'report_no_show',
  });
  return data.consultation;
}

export async function checkIn(
  id: string,
  coords: { lat: number; lng: number },
): Promise<{ consultation: Consultation; distanceMeters: number | null; withinRange: boolean }> {
  const { data } = await api.post<{ consultation: Consultation; distanceMeters: number | null; withinRange: boolean }>(
    `/consultations/${id}/check-in`,
    coords,
  );
  return data;
}
