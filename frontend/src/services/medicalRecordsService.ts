import { api } from './apiClient';
import type { MedicalProfile, MedicalDocument, VisitRecord, CaregiverGrant, AccessLogEntry, AccessScope } from '../types/medicalRecords';

export async function getProfile(patientId: string): Promise<MedicalProfile | null> {
  const { data } = await api.get<{ profile: MedicalProfile | null }>(`/medical-records/${patientId}/profile`);
  return data.profile;
}

export async function updateProfile(
  patientId: string,
  input: Partial<Pick<MedicalProfile, 'bloodType' | 'allergies' | 'chronicConditions' | 'currentMedications'>>,
): Promise<MedicalProfile> {
  const { data } = await api.patch<{ profile: MedicalProfile }>(`/medical-records/${patientId}/profile`, input);
  return data.profile;
}

export async function listDocuments(patientId: string): Promise<MedicalDocument[]> {
  const { data } = await api.get<{ documents: MedicalDocument[] }>(`/medical-records/${patientId}/documents`);
  return data.documents;
}

export async function uploadDocument(
  patientId: string,
  meta: { documentType: string; title: string; visitDate?: string },
  file: File,
): Promise<MedicalDocument> {
  const form = new FormData();
  form.append('documentType', meta.documentType);
  form.append('title', meta.title);
  if (meta.visitDate) form.append('visitDate', meta.visitDate);
  form.append('document', file);
  const { data } = await api.postForm<{ document: MedicalDocument }>(`/medical-records/${patientId}/documents`, form);
  return data.document;
}

export async function downloadDocument(patientId: string, documentId: string): Promise<void> {
  const { blob, filename } = await api.downloadFile(`/medical-records/${patientId}/documents/${documentId}/download`);
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename ?? 'document';
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export async function deleteDocument(patientId: string, documentId: string): Promise<void> {
  await api.delete(`/medical-records/${patientId}/documents/${documentId}`);
}

export async function listVisits(patientId: string): Promise<VisitRecord[]> {
  const { data } = await api.get<{ visits: VisitRecord[] }>(`/medical-records/${patientId}/visits`);
  return data.visits;
}

export async function createVisit(
  patientId: string,
  input: { visitDate: string; reasonForVisit: string; notes?: string },
): Promise<VisitRecord> {
  const { data } = await api.post<{ visit: VisitRecord }>(`/medical-records/${patientId}/visits`, input);
  return data.visit;
}

export async function deleteVisit(patientId: string, visitId: string): Promise<void> {
  await api.delete(`/medical-records/${patientId}/visits/${visitId}`);
}

export async function listAccessLog(patientId: string): Promise<AccessLogEntry[]> {
  const { data } = await api.get<{ logs: AccessLogEntry[] }>(`/medical-records/${patientId}/access-log`);
  return data.logs;
}

export async function inviteCaregiver(input: { caregiverEmail: string; scopes: AccessScope[] }): Promise<CaregiverGrant> {
  const { data } = await api.post<{ grant: CaregiverGrant }>('/medical-records/caregivers', input);
  return data.grant;
}

export async function listMyGrants(): Promise<CaregiverGrant[]> {
  const { data } = await api.get<{ grants: CaregiverGrant[] }>('/medical-records/caregivers');
  return data.grants;
}

export async function revokeGrant(grantId: string): Promise<void> {
  await api.post(`/medical-records/caregivers/${grantId}/revoke`);
}

export async function listInvitesToMe(): Promise<CaregiverGrant[]> {
  const { data } = await api.get<{ grants: CaregiverGrant[] }>('/medical-records/caregiver-invites');
  return data.grants;
}

export async function acceptInvite(grantId: string): Promise<CaregiverGrant> {
  const { data } = await api.post<{ grant: CaregiverGrant }>(`/medical-records/caregiver-invites/${grantId}/accept`);
  return data.grant;
}

export async function declineInvite(grantId: string): Promise<CaregiverGrant> {
  const { data } = await api.post<{ grant: CaregiverGrant }>(`/medical-records/caregiver-invites/${grantId}/decline`);
  return data.grant;
}
