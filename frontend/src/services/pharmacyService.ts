import { api } from './apiClient';
import type { Medicine, Order } from '../types/pharmacy';

export async function searchMedicines(query: string, city?: string): Promise<Medicine[]> {
  const params = new URLSearchParams();
  if (query) params.set('query', query);
  if (city) params.set('city', city);
  const { data } = await api.get<{ medicines: Medicine[] }>(`/medicines/search?${params.toString()}`);
  return data.medicines;
}

export async function getMedicine(id: string): Promise<Medicine> {
  const { data } = await api.get<{ medicine: Medicine }>(`/medicines/${id}`);
  return data.medicine;
}

export async function getAlternatives(id: string): Promise<{ alternatives: Medicine[]; disclaimer: string }> {
  const { data } = await api.get<{ alternatives: Medicine[]; disclaimer: string }>(`/medicines/${id}/alternatives`);
  return data;
}

export async function createMedicineItem(
  pharmacyId: string,
  input: Omit<Medicine, 'id' | 'pharmacyId' | 'isActive'>,
): Promise<Medicine> {
  // The backend's validation schema treats `manufacturer` as optional (may be omitted) but not
  // nullable (an explicit `null` fails validation) — strip it rather than send null.
  const { manufacturer, ...rest } = input;
  const payload = manufacturer ? { ...rest, manufacturer } : rest;
  const { data } = await api.post<{ medicine: Medicine }>(`/providers/applications/${pharmacyId}/medicines`, payload);
  return data.medicine;
}

export async function listPharmacyMedicines(pharmacyId: string): Promise<Medicine[]> {
  const { data } = await api.get<{ medicines: Medicine[] }>(`/providers/applications/${pharmacyId}/medicines`);
  return data.medicines;
}

export async function updateMedicineItem(
  pharmacyId: string,
  medicineId: string,
  input: Partial<Pick<Medicine, 'unitPrice' | 'stockQuantity' | 'isActive'>>,
): Promise<Medicine> {
  const { data } = await api.patch<{ medicine: Medicine }>(
    `/providers/applications/${pharmacyId}/medicines/${medicineId}`,
    input,
  );
  return data.medicine;
}

export async function createOrder(input: {
  pharmacyId: string;
  items: { medicineItemId: string; quantity: number }[];
  deliveryAddress: { line1: string; city: string; state: string; postalCode: string };
}): Promise<Order> {
  const { data } = await api.post<{ order: Order }>('/orders', input);
  return data.order;
}

export async function uploadPrescription(orderId: string, file: File): Promise<Order> {
  const form = new FormData();
  form.append('prescription', file);
  const { data } = await api.postForm<{ order: Order }>(`/orders/${orderId}/prescription`, form);
  return data.order;
}

export async function listMyOrders(): Promise<Order[]> {
  const { data } = await api.get<{ orders: Order[] }>('/orders/mine');
  return data.orders;
}

export async function getOrder(id: string): Promise<Order> {
  const { data } = await api.get<{ order: Order }>(`/orders/${id}`);
  return data.order;
}

export async function transitionOrder(id: string, action: string): Promise<Order> {
  const { data } = await api.post<{ order: Order }>(`/orders/${id}/transition`, { action });
  return data.order;
}

export async function listPharmacyOrders(pharmacyId: string): Promise<Order[]> {
  const { data } = await api.get<{ orders: Order[] }>(`/providers/applications/${pharmacyId}/orders`);
  return data.orders;
}
