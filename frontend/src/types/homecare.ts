export type OfferingType = 'equipment_rental' | 'equipment_purchase' | 'home_visit_service';

export interface CareOffering {
  id: string;
  providerId: string;
  name: string;
  category: string;
  offeringType: OfferingType;
  price: number;
  availableQuantity: number | null;
  isActive: boolean;
}

export type CareRequestStatus = 'requested' | 'confirmed' | 'fulfilled' | 'returned' | 'completed' | 'cancelled';

export interface CareRequest {
  id: string;
  patientId: string;
  providerId: string;
  offeringId: string;
  offeringType: OfferingType;
  offeringNameSnapshot: string;
  quantity: number;
  unitPriceSnapshot: number;
  totalAmount: number;
  preferredDate: string;
  expectedReturnDate: string | null;
  deliveryAddress: { line1: string; city: string; state: string; postalCode: string };
  notes?: string;
  status: CareRequestStatus;
  createdAt: string;
}

export const OFFERING_TYPE_LABELS: Record<OfferingType, string> = {
  equipment_rental: 'Equipment rental',
  equipment_purchase: 'Equipment purchase',
  home_visit_service: 'Home visit service',
};
