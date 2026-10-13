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
  isCurrentlyAvailable?: boolean | null;
  distanceMeters?: number;
}

export interface ProviderDocument {
  id: string;
  documentType: string;
  originalFilename: string;
  mimeType: string;
  sizeBytes: number;
  uploadedAt: string;
}

export type ApplicationStatus = 'draft' | 'submitted' | 'under_review' | 'approved' | 'rejected' | 'suspended' | 'expired';

/** Owner/admin view — everything, including fields never shown on the public discovery API. */
export interface OwnerProviderApplication {
  id: string;
  userId: string;
  providerType: string;
  organizationName: string;
  registrationNumber: string;
  issuingAuthority: string;
  contactPhone: string;
  contactEmail: string;
  address: Address;
  location: LatLng | null;
  consultationFee: number | null;
  operatingHoursNote: string | null;
  isCurrentlyAvailable: boolean | null;
  documents: ProviderDocument[];
  status: ApplicationStatus;
  rejectionReason: string | null;
  suspensionReason: string | null;
  verifiedAt: string | null;
  expiresAt: string | null;
  isActivelyVerified: boolean;
  flagged: boolean;
  flagReasons: string[];
  reportCount: number;
}
