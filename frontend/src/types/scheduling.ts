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

export interface StaffMember {
  id: string;
  providerId: string;
  userId: string;
  status: 'invited' | 'active' | 'removed';
  invitedAt: string;
  acceptedAt: string | null;
}
