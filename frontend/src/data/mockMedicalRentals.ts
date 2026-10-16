export type RentalOfferingType = 'equipment_rental' | 'equipment_purchase';

export interface MockRentalItem {
  id: string;
  name: string;
  category: string;
  offeringType: RentalOfferingType;
  price: number;
  availableQuantity: number | null;
  providerName: string;
}

/**
 * No equipment providers have registered near Nandigama yet, so the Home
 * care page's "Medical rentals" tab uses this sample dataset until real
 * listings arrive.
 */
export const MOCK_MEDICAL_RENTALS: MockRentalItem[] = [
  {
    id: 'mock-rental-1',
    name: 'Manual Wheelchair',
    category: 'Mobility',
    offeringType: 'equipment_rental',
    price: 100,
    availableQuantity: 8,
    providerName: 'Nandigama Medical Equipment Rentals',
  },
  {
    id: 'mock-rental-2',
    name: 'Electric Wheelchair',
    category: 'Mobility',
    offeringType: 'equipment_rental',
    price: 350,
    availableQuantity: 3,
    providerName: 'Nandigama Medical Equipment Rentals',
  },
  {
    id: 'mock-rental-3',
    name: 'Hospital Bed (Semi-Fowler)',
    category: 'Beds & Mattresses',
    offeringType: 'equipment_rental',
    price: 450,
    availableQuantity: 4,
    providerName: 'Sri Sai Home Care Equipment',
  },
  {
    id: 'mock-rental-4',
    name: 'Oxygen Concentrator (5L)',
    category: 'Respiratory',
    offeringType: 'equipment_rental',
    price: 600,
    availableQuantity: 6,
    providerName: 'Apollo Home Healthcare Supplies',
  },
  {
    id: 'mock-rental-5',
    name: 'BiPAP Machine',
    category: 'Respiratory',
    offeringType: 'equipment_rental',
    price: 900,
    availableQuantity: 2,
    providerName: 'Apollo Home Healthcare Supplies',
  },
  {
    id: 'mock-rental-6',
    name: 'Nebulizer',
    category: 'Respiratory',
    offeringType: 'equipment_purchase',
    price: 1400,
    availableQuantity: 15,
    providerName: 'Sri Sai Home Care Equipment',
  },
  {
    id: 'mock-rental-7',
    name: 'Walker / Walking Frame',
    category: 'Mobility',
    offeringType: 'equipment_purchase',
    price: 1100,
    availableQuantity: 20,
    providerName: 'Nandigama Medical Equipment Rentals',
  },
  {
    id: 'mock-rental-8',
    name: 'Commode Chair',
    category: 'Daily Living Aids',
    offeringType: 'equipment_rental',
    price: 150,
    availableQuantity: 10,
    providerName: 'Sri Sai Home Care Equipment',
  },
  {
    id: 'mock-rental-9',
    name: 'Patient Lift (Hoyer Lift)',
    category: 'Mobility',
    offeringType: 'equipment_rental',
    price: 800,
    availableQuantity: 2,
    providerName: 'Apollo Home Healthcare Supplies',
  },
  {
    id: 'mock-rental-10',
    name: 'Infusion / Syringe Pump',
    category: 'Monitoring & Infusion',
    offeringType: 'equipment_rental',
    price: 500,
    availableQuantity: 5,
    providerName: 'Apollo Home Healthcare Supplies',
  },
  {
    id: 'mock-rental-11',
    name: 'Pulse Oximeter',
    category: 'Monitoring & Infusion',
    offeringType: 'equipment_purchase',
    price: 1200,
    availableQuantity: 30,
    providerName: 'Nandigama Medical Equipment Rentals',
  },
  {
    id: 'mock-rental-12',
    name: 'Digital BP Monitor',
    category: 'Monitoring & Infusion',
    offeringType: 'equipment_purchase',
    price: 1600,
    availableQuantity: 25,
    providerName: 'Sri Sai Home Care Equipment',
  },
];
