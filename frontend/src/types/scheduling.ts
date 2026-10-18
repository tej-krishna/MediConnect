export interface Slot {
  id: string;
  providerId: string;
  startTime: string;
  endTime: string;
  capacity: number;
  bookedCount: number;
  remaining: number;
  status: 'open' | 'cancelled';
}

export interface Appointment {
  id: string;
  slotId: string;
  providerId: string;
  patientId: string;
  status: 'booked' | 'cancelled' | 'completed' | 'no_show';
  bookedAt: string;
  cancelledAt: string | null;
  /** Only populated on GET /appointments/mine (never on the provider-side listing). */
  provider?: { organizationName: string; providerType: string; typeDetails: Record<string, unknown> } | null;
  slot?: { startTime: string; endTime: string } | null;
}

export type VisitType = 'online' | 'home_visit';
export type ConsultationStatus = 'requested' | 'confirmed' | 'completed' | 'cancelled' | 'no_show';

export interface GeoCheckIn {
  lat: number;
  lng: number;
  at: string;
}

export interface Consultation {
  id: string;
  patientId: string;
  doctorId: string;
  /** Only populated on GET /consultations/mine (never on the doctor-side listing). */
  doctor?: { organizationName: string; providerType: string; typeDetails: Record<string, unknown> } | null;
  visitType: VisitType;
  homeVisitAddress: { line1: string; city: string; state: string; postalCode: string } | null;
  preferredDateTime: string;
  confirmedDateTime: string | null;
  status: ConsultationStatus;
  doctorCheckIn: GeoCheckIn | null;
  patientCheckIn: GeoCheckIn | null;
  videoSessionId: string | null;
  createdAt: string;
}

export interface StaffMember {
  id: string;
  providerId: string;
  userId: string;
  status: 'invited' | 'active' | 'removed';
  invitedAt: string;
  acceptedAt: string | null;
}
