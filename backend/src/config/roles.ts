export const ROLES = [
  'patient',
  'caregiver',
  'doctor',
  'hospital_admin',
  'clinic_admin',
  'pharmacy_owner',
  'delivery_partner',
  'diagnostic_lab_admin',
  'lab_technician',
  'radiologist',
  'mobile_van_operator',
  'ambulance_provider',
  'equipment_provider',
  'ngo_coordinator',
  'insurance_provider',
  'support',
  'super_admin',
] as const;

export type Role = (typeof ROLES)[number];

/** Roles a user may be granted purely by self-registering through the public auth API. */
export const SELF_REGISTERABLE_ROLES: Role[] = ['patient'];
