export const PROVIDER_TYPES = [
  'doctor',
  'hospital',
  'clinic',
  'pharmacy',
  'diagnostic_lab',
  'ambulance_provider',
  'equipment_provider',
  'mobile_van_operator',
  'ngo_coordinator',
  'insurance_provider',
] as const;

export type ProviderType = (typeof PROVIDER_TYPES)[number];

/** Maps each provider type to the User role granted on approval. */
export const PROVIDER_TYPE_TO_ROLE: Record<ProviderType, string> = {
  doctor: 'doctor',
  hospital: 'hospital_admin',
  clinic: 'clinic_admin',
  pharmacy: 'pharmacy_owner',
  diagnostic_lab: 'diagnostic_lab_admin',
  ambulance_provider: 'ambulance_provider',
  equipment_provider: 'equipment_provider',
  mobile_van_operator: 'mobile_van_operator',
  ngo_coordinator: 'ngo_coordinator',
  insurance_provider: 'insurance_provider',
};

export const APPLICATION_STATUSES = [
  'draft',
  'submitted',
  'under_review',
  'approved',
  'rejected',
  'suspended',
  'expired',
] as const;

export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

export const ALLOWED_TRANSITIONS: Record<ApplicationStatus, ApplicationStatus[]> = {
  draft: ['submitted'],
  submitted: ['under_review'],
  under_review: ['approved', 'rejected'],
  approved: ['suspended', 'expired'],
  rejected: [],
  suspended: ['approved'],
  expired: [],
};
