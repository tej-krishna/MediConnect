export type ProviderTypeField =
  | { name: string; label: string; kind: 'text'; placeholder?: string; required?: boolean }
  | { name: string; label: string; kind: 'number'; min?: number; max?: number; required?: boolean }
  | { name: string; label: string; kind: 'checkbox' }
  | { name: string; label: string; kind: 'select'; required?: boolean; options: { value: string; label: string }[] };

/**
 * The extra fields collected for each provider type, on top of the common fields every
 * application needs (org name, registration number, address, etc.) — mirrors the discriminated
 * union in backend/src/modules/providers/provider.validation.ts exactly: field names and the
 * shape of each type's object must match, since the backend validates against that union.
 */
export const PROVIDER_TYPE_FIELDS: Record<string, ProviderTypeField[]> = {
  doctor: [
    { name: 'specialization', label: 'Specialization', kind: 'text', placeholder: 'e.g. Cardiology', required: true },
    { name: 'qualification', label: 'Qualification', kind: 'text', placeholder: 'e.g. MBBS, MD', required: true },
    { name: 'yearsOfExperience', label: 'Years of experience', kind: 'number', min: 0, max: 70, required: true },
  ],
  hospital: [
    { name: 'bedCount', label: 'Number of beds', kind: 'number', min: 1, max: 10000, required: true },
    {
      name: 'hospitalType',
      label: 'Hospital type',
      kind: 'select',
      required: true,
      options: [
        { value: 'general', label: 'General' },
        { value: 'multi_specialty', label: 'Multi-specialty' },
        { value: 'specialty', label: 'Specialty' },
      ],
    },
    { name: 'emergencyServicesAvailable', label: '24/7 emergency services available', kind: 'checkbox' },
  ],
  clinic: [
    { name: 'specialties', label: 'Specialties offered', kind: 'text', placeholder: 'e.g. Dental, Dermatology', required: true },
    {
      name: 'clinicType',
      label: 'Clinic type',
      kind: 'select',
      required: true,
      options: [
        { value: 'general', label: 'General' },
        { value: 'specialty', label: 'Specialty' },
      ],
    },
  ],
  pharmacy: [
    { name: 'has24x7Service', label: 'Open 24/7', kind: 'checkbox' },
    { name: 'gstin', label: 'GSTIN (optional)', kind: 'text' },
  ],
  diagnostic_lab: [
    { name: 'nablAccreditationNumber', label: 'NABL accreditation number (optional)', kind: 'text' },
    { name: 'homeCollectionAvailable', label: 'Home sample collection available', kind: 'checkbox' },
  ],
  ambulance_provider: [
    { name: 'vehicleCount', label: 'Number of vehicles', kind: 'number', min: 1, max: 1000, required: true },
    {
      name: 'vehicleType',
      label: 'Vehicle type',
      kind: 'select',
      required: true,
      options: [
        { value: 'basic_life_support', label: 'Basic life support' },
        { value: 'advanced_life_support', label: 'Advanced life support' },
      ],
    },
  ],
  equipment_provider: [
    {
      name: 'equipmentCategories',
      label: 'Equipment categories',
      kind: 'text',
      placeholder: 'e.g. Wheelchairs, Oxygen concentrators',
      required: true,
    },
    {
      name: 'serviceType',
      label: 'Service type',
      kind: 'select',
      required: true,
      options: [
        { value: 'rental', label: 'Rental' },
        { value: 'sale', label: 'Sale' },
        { value: 'both', label: 'Rental & sale' },
      ],
    },
  ],
  mobile_van_operator: [
    { name: 'vanCount', label: 'Number of vans', kind: 'number', min: 1, max: 500, required: true },
    {
      name: 'coverageAreas',
      label: 'Coverage areas',
      kind: 'text',
      placeholder: 'e.g. Nandigama, Jaggayyapet',
      required: true,
    },
  ],
  ngo_coordinator: [
    {
      name: 'ngoRegistrationType',
      label: 'Registration type',
      kind: 'select',
      required: true,
      options: [
        { value: 'trust', label: 'Trust' },
        { value: 'society', label: 'Society' },
        { value: 'section8', label: 'Section 8 company' },
      ],
    },
    {
      name: 'focusAreas',
      label: 'Focus areas',
      kind: 'text',
      placeholder: 'e.g. Maternal health, Vaccination drives',
      required: true,
    },
  ],
  insurance_provider: [
    { name: 'irdaiLicenseNumber', label: 'IRDAI license number', kind: 'text', required: true },
    {
      name: 'insuranceTypesOffered',
      label: 'Insurance types offered',
      kind: 'text',
      placeholder: 'e.g. Health, Critical illness',
      required: true,
    },
  ],
};
