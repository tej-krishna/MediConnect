export interface Address {
  line1: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

export interface LatLng {
  lat: number;
  lng: number;
}

/** Public, unauthenticated discovery shape — never includes verification/legal fields. */
export interface PublicProvider {
  id: string;
  providerType: string;
  organizationName: string;
  contactPhone: string;
  address: Address;
  location: LatLng | null;
  consultationFee: number | null;
  operatingHoursNote: string | null;
  verifiedAt: string | null;
  distanceMeters?: number;
}
