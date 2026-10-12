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
}

export interface StaffMember {
  id: string;
  providerId: string;
  userId: string;
  status: 'invited' | 'active' | 'removed';
  invitedAt: string;
  acceptedAt: string | null;
}
