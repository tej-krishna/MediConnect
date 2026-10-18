export interface ProviderTypeConfig {
  /** Label for the "things this provider manages" tab, or null if this type has none. */
  inventoryLabel: string | null;
  /** Label for the "incoming bookings/orders" tab, or null if this type has none. */
  ordersLabel: string | null;
  /** Ambulance services don't sell anything — they just flip an availability flag. */
  hasAvailabilityToggle: boolean;
  /** Doctors (and clinics, which keep both) get the request/accept online+home-visit flow instead
   * of (or alongside) the old self-service slot system — see ProviderConsultationsPage. */
  hasConsultationsTab: boolean;
}

const SCHEDULING_CONFIG: ProviderTypeConfig = {
  inventoryLabel: 'Appointment slots',
  ordersLabel: 'Appointments',
  hasAvailabilityToggle: false,
  hasConsultationsTab: false,
};

const CAMP_CONFIG: ProviderTypeConfig = {
  inventoryLabel: 'Health camps',
  ordersLabel: null,
  hasAvailabilityToggle: false,
  hasConsultationsTab: false,
};

const PROVIDER_TYPE_CONFIG: Record<string, ProviderTypeConfig> = {
  // Doctors' old self-service slot UI is retired in favor of the Consultations tab below.
  doctor: { inventoryLabel: null, ordersLabel: null, hasAvailabilityToggle: false, hasConsultationsTab: true },
  hospital: SCHEDULING_CONFIG,
  // Clinics keep the slot-based "Book OP" flow *and* get the new Consultations tab.
  clinic: { ...SCHEDULING_CONFIG, hasConsultationsTab: true },
  pharmacy: { inventoryLabel: 'Medicines', ordersLabel: 'Orders', hasAvailabilityToggle: false, hasConsultationsTab: false },
  diagnostic_lab: { inventoryLabel: 'Tests', ordersLabel: 'Test bookings', hasAvailabilityToggle: false, hasConsultationsTab: false },
  equipment_provider: {
    inventoryLabel: 'Equipment & offerings',
    ordersLabel: 'Requests',
    hasAvailabilityToggle: false,
    hasConsultationsTab: false,
  },
  mobile_van_operator: CAMP_CONFIG,
  ngo_coordinator: CAMP_CONFIG,
  ambulance_provider: { inventoryLabel: null, ordersLabel: null, hasAvailabilityToggle: true, hasConsultationsTab: false },
};

const DEFAULT_CONFIG: ProviderTypeConfig = {
  inventoryLabel: null,
  ordersLabel: null,
  hasAvailabilityToggle: false,
  hasConsultationsTab: false,
};

export function getProviderTypeConfig(providerType: string): ProviderTypeConfig {
  return PROVIDER_TYPE_CONFIG[providerType] ?? DEFAULT_CONFIG;
}
