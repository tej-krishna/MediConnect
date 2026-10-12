import { api } from './apiClient';
import type { Slot, Appointment } from '../types/scheduling';

export async function createSlot(
  providerId: string,
  input: { startTime: string; endTime: string; capacity: number },
): Promise<Slot> {
  const { data } = await api.post<{ slot: Slot }>(`/providers/applications/${providerId}/slots`, input);
  return data.slot;
}

export async function listProviderSlots(providerId: string): Promise<Slot[]> {
  const { data } = await api.get<{ slots: Slot[] }>(`/providers/applications/${providerId}/slots`);
  return data.slots;
}

export async function listAvailableSlots(providerId: string): Promise<Slot[]> {
  const { data } = await api.get<{ slots: Slot[] }>(`/providers/applications/${providerId}/slots/available`);
  return data.slots;
}

export async function cancelSlot(providerId: string, slotId: string): Promise<void> {
  await api.delete<{ cancelled: boolean }>(`/providers/applications/${providerId}/slots/${slotId}`);
}

export async function bookAppointment(slotId: string): Promise<Appointment> {
  const { data } = await api.post<{ appointment: Appointment }>('/appointments', { slotId });
  return data.appointment;
}

export async function cancelAppointment(appointmentId: string): Promise<Appointment> {
  const { data } = await api.post<{ appointment: Appointment }>(`/appointments/${appointmentId}/cancel`);
  return data.appointment;
}

export async function listMyAppointments(): Promise<Appointment[]> {
  const { data } = await api.get<{ appointments: Appointment[] }>('/appointments/mine');
  return data.appointments;
}

export async function listProviderAppointments(providerId: string): Promise<Appointment[]> {
  const { data } = await api.get<{ appointments: Appointment[] }>(`/providers/applications/${providerId}/appointments`);
  return data.appointments;
}
