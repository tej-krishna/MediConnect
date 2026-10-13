export interface MedicalProfile {
  patientId: string;
  bloodType: string | null;
  allergies: string[];
  chronicConditions: string[];
  currentMedications: string[];
  updatedAt: string;
}

export interface MedicalDocument {
  id: string;
  patientId: string;
  documentType: 'prescription' | 'diagnostic_report' | 'discharge_summary' | 'other';
  title: string;
  visitDate: string | null;
  originalFilename: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
}

export interface VisitRecord {
  id: string;
  patientId: string;
  visitDate: string;
  reasonForVisit: string;
  notes: string | null;
}

export type AccessScope = 'view_profile' | 'view_documents' | 'view_visits' | 'manage_profile';

export interface CaregiverGrant {
  id: string;
  patientId: string;
  caregiverId: string;
  scopes: AccessScope[];
  status: 'pending' | 'active' | 'declined' | 'revoked';
  expiresAt: string | null;
  invitedAt: string;
}

export interface AccessLogEntry {
  id: string;
  accessedBy: string;
  action: string;
  timestamp: string;
}
