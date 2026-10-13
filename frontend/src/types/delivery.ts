export type VehicleType = 'bicycle' | 'two_wheeler' | 'three_wheeler' | 'van';
export type DeliveryPartnerStatus = 'pending' | 'approved' | 'rejected' | 'suspended';

export interface DeliveryPartnerProfile {
  id: string;
  userId: string;
  contactPhone: string;
  vehicleType: VehicleType;
  serviceCity: string;
  status: DeliveryPartnerStatus;
  rejectionReason: string | null;
  createdAt: string;
}

export interface DeliveryPartnerDirectoryEntry {
  userId: string;
  fullName: string;
  vehicleType: VehicleType;
  serviceCity: string;
}
