export interface DiagnosticTest {
  id: string;
  labId: string;
  name: string;
  category: string;
  sampleType: string;
  price: number;
  turnaroundHours: number;
  homeCollectionAvailable: boolean;
  isActive: boolean;
}

export type DiagnosticOrderStatus =
  | 'requested'
  | 'scheduled'
  | 'sample_collected'
  | 'processing'
  | 'report_ready'
  | 'cancelled';

export interface DiagnosticOrder {
  id: string;
  patientId: string;
  labId: string;
  tests: { testId: string; name: string; price: number }[];
  totalAmount: number;
  collectionMethod: 'at_lab' | 'home_collection';
  homeAddress: { line1: string; city: string; state: string; postalCode: string } | null;
  preferredDateTime: string;
  confirmedDateTime: string | null;
  status: DiagnosticOrderStatus;
  hasReport: boolean;
  createdAt: string;
}

export interface HealthCamp {
  id: string;
  providerId: string;
  title: string;
  description: string | null;
  locationDescription: string;
  location: { lat: number; lng: number } | null;
  scheduledDate: string;
  startTime: string;
  endTime: string;
  servicesOffered: string[];
  capacity: number;
  registeredCount: number;
  remaining: number;
  status: 'scheduled' | 'cancelled' | 'completed';
  distanceMeters?: number;
}
