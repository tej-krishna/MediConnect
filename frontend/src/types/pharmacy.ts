export interface Medicine {
  id: string;
  pharmacyId: string;
  name: string;
  genericName: string;
  activeIngredient: string;
  strength: string;
  dosageForm: string;
  manufacturer: string | null;
  unitPrice: number;
  stockQuantity: number;
  requiresPrescription: boolean;
  isActive: boolean;
}

export interface OrderItem {
  medicineItemId: string;
  name: string;
  quantity: number;
  unitPrice: number;
}

export type OrderStatus =
  | 'pending_prescription'
  | 'placed'
  | 'confirmed'
  | 'preparing'
  | 'out_for_delivery'
  | 'delivered'
  | 'cancelled';

export interface Order {
  id: string;
  patientId: string;
  pharmacyId: string;
  items: OrderItem[];
  totalAmount: number;
  requiresPrescription: boolean;
  hasPrescription: boolean;
  deliveryAddress: { line1: string; city: string; state: string; postalCode: string };
  status: OrderStatus;
  createdAt: string;
}
