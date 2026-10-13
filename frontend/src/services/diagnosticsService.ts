import { api } from './apiClient';
import type { DiagnosticTest, DiagnosticOrder, HealthCamp } from '../types/diagnostics';

export async function searchTests(query: string, city?: string): Promise<DiagnosticTest[]> {
  const params = new URLSearchParams();
  if (query) params.set('query', query);
  if (city) params.set('city', city);
  const { data } = await api.get<{ tests: DiagnosticTest[] }>(`/diagnostic-tests/search?${params.toString()}`);
  return data.tests;
}

export async function getTest(id: string): Promise<DiagnosticTest> {
  const { data } = await api.get<{ test: DiagnosticTest }>(`/diagnostic-tests/${id}`);
  return data.test;
}

export async function createTest(
  labId: string,
  input: Omit<DiagnosticTest, 'id' | 'labId' | 'isActive'>,
): Promise<DiagnosticTest> {
  const { data } = await api.post<{ test: DiagnosticTest }>(`/providers/applications/${labId}/diagnostic-tests`, input);
  return data.test;
}

export async function listLabTests(labId: string): Promise<DiagnosticTest[]> {
  const { data } = await api.get<{ tests: DiagnosticTest[] }>(`/providers/applications/${labId}/diagnostic-tests`);
  return data.tests;
}

export async function createDiagnosticOrder(input: {
  labId: string;
  testIds: string[];
  collectionMethod: 'at_lab' | 'home_collection';
  homeAddress?: { line1: string; city: string; state: string; postalCode: string };
  preferredDateTime: string;
}): Promise<DiagnosticOrder> {
  const { data } = await api.post<{ order: DiagnosticOrder }>('/diagnostic-orders', input);
  return data.order;
}

export async function listMyDiagnosticOrders(): Promise<DiagnosticOrder[]> {
  const { data } = await api.get<{ orders: DiagnosticOrder[] }>('/diagnostic-orders/mine');
  return data.orders;
}

export async function listLabOrders(labId: string): Promise<DiagnosticOrder[]> {
  const { data } = await api.get<{ orders: DiagnosticOrder[] }>(`/providers/applications/${labId}/diagnostic-orders`);
  return data.orders;
}

export async function transitionDiagnosticOrder(
  id: string,
  body: { action: string; confirmedDateTime?: string },
): Promise<DiagnosticOrder> {
  const { data } = await api.post<{ order: DiagnosticOrder }>(`/diagnostic-orders/${id}/transition`, body);
  return data.order;
}

export async function uploadReport(orderId: string, file: File): Promise<DiagnosticOrder> {
  const form = new FormData();
  form.append('report', file);
  const { data } = await api.postForm<{ order: DiagnosticOrder }>(`/diagnostic-orders/${orderId}/report`, form);
  return data.order;
}

export async function searchCamps(city: string): Promise<HealthCamp[]> {
  const params = new URLSearchParams();
  if (city) params.set('city', city);
  const { data } = await api.get<{ camps: HealthCamp[] }>(`/health-camps/search?${params.toString()}`);
  return data.camps;
}

export async function createCamp(
  providerId: string,
  input: {
    title: string;
    description?: string;
    locationDescription: string;
    scheduledDate: string;
    startTime: string;
    endTime: string;
    servicesOffered: string[];
    capacity: number;
  },
): Promise<HealthCamp> {
  const { data } = await api.post<{ camp: HealthCamp }>(`/providers/applications/${providerId}/health-camps`, input);
  return data.camp;
}

export async function listProviderCamps(providerId: string): Promise<HealthCamp[]> {
  const { data } = await api.get<{ camps: HealthCamp[] }>(`/providers/applications/${providerId}/health-camps`);
  return data.camps;
}

export async function cancelCamp(providerId: string, campId: string): Promise<void> {
  await api.delete(`/providers/applications/${providerId}/health-camps/${campId}`);
}

export async function registerForCamp(campId: string): Promise<void> {
  await api.post(`/health-camps/${campId}/register`);
}

export async function cancelCampRegistration(campId: string): Promise<void> {
  await api.post(`/health-camps/${campId}/cancel-registration`);
}

export async function listMyCampRegistrations(): Promise<{ campId: string; registeredAt: string; camp: HealthCamp | null }[]> {
  const { data } = await api.get<{ registrations: { campId: string; registeredAt: string; camp: HealthCamp | null }[] }>(
    '/health-camps/registrations/mine',
  );
  return data.registrations;
}

export async function downloadDiagnosticReport(orderId: string): Promise<void> {
  const { blob, filename } = await api.downloadFile(`/diagnostic-orders/${orderId}/report/download`);
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename ?? 'report.pdf';
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
