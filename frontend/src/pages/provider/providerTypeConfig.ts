export interface ProviderTypeConfig {
  /** Label for the "things this provider manages" tab, or null if this type has none. */
  inventoryLabel: string | null;
  /** Label for the "incoming bookings/orders" tab, or null if this type has none. */
  ordersLabel: string | null;
  /** Ambulance services don't sell anything — they just flip an availability flag. */
  hasAvailabilityToggle: boolean;
}

const SCHEDULING_CONFIG: ProviderTypeConfig = {
  inventoryLabel: 'Appointment slots',
  ordersLabel: 'Appointments',
  hasAvailabilityToggle: false,
};

const CAMP_CONFIG: ProviderTypeConfig = {
  inventoryLabel: 'Health camps',
  ordersLabel: null,
  hasAvailabilityToggle: false,
};

const PROVIDER_TYPE_CONFIG: Record<string, ProviderTypeConfig> = {
  doctor: SCHEDULING_CONFIG,
  hospital: SCHEDULING_CONFIG,
  clinic: SCHEDULING_CONFIG,
  pharmacy: { inventoryLabel: 'Medicines', ordersLabel: 'Orders', hasAvailabilityToggle: false },
  diagnostic_lab: { inventoryLabel: 'Tests', ordersLabel: 'Test bookings', hasAvailabilityToggle: false },
  equipment_provider: { inventoryLabel: 'Equipment & offerings', ordersLabel: 'Requests', hasAvailabilityToggle: false },
  mobile_van_operator: CAMP_CONFIG,
  ngo_coordinator: CAMP_CONFIG,
  ambulance_provider: { inventoryLabel: null, ordersLabel: null, hasAvailabilityToggle: true },
};

const DEFAULT_CONFIG: ProviderTypeConfig = {
  inventoryLabel: null,
  ordersLabel: null,
  hasAvailabilityToggle: false,
};

export function getProviderTypeConfig(providerType: string): ProviderTypeConfig {
  return PROVIDER_TYPE_CONFIG[providerType] ?? DEFAULT_CONFIG;
}
