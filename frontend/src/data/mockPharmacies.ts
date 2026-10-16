import type { Address, LatLng } from '../types/provider';
import { NANDIGAMA_PINCODE } from './mockNandigamaProviders';

export interface MockPharmacyMedicine {
  id: string;
  name: string;
  genericName: string;
  strength: string;
  dosageForm: string;
  unitPrice: number;
  stockQuantity: number;
  requiresPrescription: boolean;
}

export interface MockPharmacy {
  id: string;
  name: string;
  address: Address;
  location: LatLng;
  contactPhone: string;
  medicines: MockPharmacyMedicine[];
}

const address = (line1: string): Address => ({
  line1,
  city: 'Nandigama',
  state: 'Andhra Pradesh',
  postalCode: NANDIGAMA_PINCODE,
  country: 'India',
});

/**
 * No pharmacies are registered near Nandigama yet, so the Find Medicines page
 * uses this sample dataset (10 shops, each stocking a few common medicines)
 * until real registrations arrive in the area.
 */
export const MOCK_PHARMACIES: MockPharmacy[] = [
  {
    id: 'mock-pharmacy-1',
    name: 'Nandigama Medicals',
    address: address('Main Bazar Road'),
    location: { lat: 16.7721, lng: 80.2849 },
    contactPhone: '+91 90333 22110',
    medicines: [
      { id: 'med-1', name: 'Paracetamol 500mg', genericName: 'Paracetamol', strength: '500mg', dosageForm: 'Tablet', unitPrice: 15, stockQuantity: 240, requiresPrescription: false },
      { id: 'med-2', name: 'Azithral 500', genericName: 'Azithromycin', strength: '500mg', dosageForm: 'Tablet', unitPrice: 95, stockQuantity: 60, requiresPrescription: true },
      { id: 'med-3', name: 'ORS Sachet', genericName: 'Oral Rehydration Salts', strength: '21g', dosageForm: 'Sachet', unitPrice: 20, stockQuantity: 180, requiresPrescription: false },
    ],
  },
  {
    id: 'mock-pharmacy-2',
    name: 'Sri Venkateswara Pharmacy',
    address: address('Near Government Hospital'),
    location: { lat: 16.7703, lng: 80.2897 },
    contactPhone: '+91 90444 33221',
    medicines: [
      { id: 'med-4', name: 'Cetrizine 10mg', genericName: 'Cetirizine', strength: '10mg', dosageForm: 'Tablet', unitPrice: 25, stockQuantity: 150, requiresPrescription: false },
      { id: 'med-5', name: 'Amoxyclav 625', genericName: 'Amoxicillin + Clavulanate', strength: '625mg', dosageForm: 'Tablet', unitPrice: 110, stockQuantity: 45, requiresPrescription: true },
      { id: 'med-6', name: 'Crocin Advance', genericName: 'Paracetamol', strength: '500mg', dosageForm: 'Tablet', unitPrice: 18, stockQuantity: 200, requiresPrescription: false },
    ],
  },
  {
    id: 'mock-pharmacy-3',
    name: 'Apollo Medical Store',
    address: address('Ring Road Junction'),
    location: { lat: 16.7766, lng: 80.2875 },
    contactPhone: '+91 90555 44332',
    medicines: [
      { id: 'med-7', name: 'Metformin 500mg', genericName: 'Metformin', strength: '500mg', dosageForm: 'Tablet', unitPrice: 35, stockQuantity: 120, requiresPrescription: true },
      { id: 'med-8', name: 'Amlong 5', genericName: 'Amlodipine', strength: '5mg', dosageForm: 'Tablet', unitPrice: 40, stockQuantity: 90, requiresPrescription: true },
      { id: 'med-9', name: 'Vitamin C 500mg', genericName: 'Ascorbic Acid', strength: '500mg', dosageForm: 'Tablet', unitPrice: 60, stockQuantity: 100, requiresPrescription: false },
    ],
  },
  {
    id: 'mock-pharmacy-4',
    name: 'Lakshmi Pharma Point',
    address: address('Kanchikacherla Road'),
    location: { lat: 16.7748, lng: 80.2851 },
    contactPhone: '+91 90666 11009',
    medicines: [
      { id: 'med-10', name: 'Omeprazole 20mg', genericName: 'Omeprazole', strength: '20mg', dosageForm: 'Capsule', unitPrice: 45, stockQuantity: 80, requiresPrescription: false },
      { id: 'med-11', name: 'Ibugesic Plus', genericName: 'Ibuprofen + Paracetamol', strength: '400mg/325mg', dosageForm: 'Tablet', unitPrice: 30, stockQuantity: 160, requiresPrescription: false },
    ],
  },
  {
    id: 'mock-pharmacy-5',
    name: 'City Care Pharmacy',
    address: address('Market Street'),
    location: { lat: 16.7715, lng: 80.2905 },
    contactPhone: '+91 90777 88990',
    medicines: [
      { id: 'med-12', name: 'Human Mixtard Insulin', genericName: 'Insulin', strength: '40IU/ml', dosageForm: 'Injection', unitPrice: 180, stockQuantity: 25, requiresPrescription: true },
      { id: 'med-13', name: 'Paracetamol Syrup', genericName: 'Paracetamol', strength: '125mg/5ml', dosageForm: 'Syrup', unitPrice: 48, stockQuantity: 70, requiresPrescription: false },
      { id: 'med-14', name: 'Cheston Cold', genericName: 'Cetirizine + Phenylephrine + Paracetamol', strength: 'Combo', dosageForm: 'Tablet', unitPrice: 32, stockQuantity: 110, requiresPrescription: false },
    ],
  },
  {
    id: 'mock-pharmacy-6',
    name: "Lakshmi Children's Pharmacy",
    address: address('Temple Street, Nandigama Bazar'),
    location: { lat: 16.7682, lng: 80.2878 },
    contactPhone: '+91 90888 22334',
    medicines: [
      { id: 'med-15', name: 'Zincovit Syrup', genericName: 'Multivitamin + Zinc', strength: '200ml', dosageForm: 'Syrup', unitPrice: 85, stockQuantity: 55, requiresPrescription: false },
      { id: 'med-16', name: 'Amoxicillin Syrup', genericName: 'Amoxicillin', strength: '125mg/5ml', dosageForm: 'Syrup', unitPrice: 65, stockQuantity: 40, requiresPrescription: true },
    ],
  },
  {
    id: 'mock-pharmacy-7',
    name: 'Prashanti Medical Hall',
    address: address('Station Road'),
    location: { lat: 16.7692, lng: 80.2833 },
    contactPhone: '+91 90999 33445',
    medicines: [
      { id: 'med-17', name: 'Telma 40', genericName: 'Telmisartan', strength: '40mg', dosageForm: 'Tablet', unitPrice: 55, stockQuantity: 75, requiresPrescription: true },
      { id: 'med-18', name: 'Pantop 40', genericName: 'Pantoprazole', strength: '40mg', dosageForm: 'Tablet', unitPrice: 50, stockQuantity: 95, requiresPrescription: false },
      { id: 'med-19', name: 'Paracetamol 650mg', genericName: 'Paracetamol', strength: '650mg', dosageForm: 'Tablet', unitPrice: 20, stockQuantity: 220, requiresPrescription: false },
    ],
  },
  {
    id: 'mock-pharmacy-8',
    name: 'Sri Lakshmi Narasimha Pharmacy',
    address: address('Hospital Road, Near Bus Stand'),
    location: { lat: 16.7735, lng: 80.2891 },
    contactPhone: '+91 91000 44556',
    medicines: [
      { id: 'med-20', name: 'Dolo 650', genericName: 'Paracetamol', strength: '650mg', dosageForm: 'Tablet', unitPrice: 22, stockQuantity: 300, requiresPrescription: false },
      { id: 'med-21', name: 'Azee 500', genericName: 'Azithromycin', strength: '500mg', dosageForm: 'Tablet', unitPrice: 98, stockQuantity: 35, requiresPrescription: true },
    ],
  },
  {
    id: 'mock-pharmacy-9',
    name: 'Ganesh Medical Agency',
    address: address('Gandhi Nagar, Main Road'),
    location: { lat: 16.7698, lng: 80.284 },
    contactPhone: '+91 91111 55667',
    medicines: [
      { id: 'med-22', name: 'Glycomet GP 1', genericName: 'Metformin + Glimepiride', strength: '500mg/1mg', dosageForm: 'Tablet', unitPrice: 65, stockQuantity: 50, requiresPrescription: true },
      { id: 'med-23', name: 'Shelcal 500', genericName: 'Calcium + Vitamin D3', strength: '500mg', dosageForm: 'Tablet', unitPrice: 90, stockQuantity: 85, requiresPrescription: false },
      { id: 'med-24', name: 'Ibuprofen 400mg', genericName: 'Ibuprofen', strength: '400mg', dosageForm: 'Tablet', unitPrice: 28, stockQuantity: 140, requiresPrescription: false },
    ],
  },
  {
    id: 'mock-pharmacy-10',
    name: 'Nandigama Super Pharmacy',
    address: address('NH65 Service Road'),
    location: { lat: 16.7756, lng: 80.2822 },
    contactPhone: '+91 91222 66778',
    medicines: [
      { id: 'med-25', name: 'Montair LC', genericName: 'Montelukast + Levocetirizine', strength: '10mg/5mg', dosageForm: 'Tablet', unitPrice: 85, stockQuantity: 60, requiresPrescription: true },
      { id: 'med-26', name: 'ORS Sachet', genericName: 'Oral Rehydration Salts', strength: '21g', dosageForm: 'Sachet', unitPrice: 20, stockQuantity: 200, requiresPrescription: false },
      { id: 'med-27', name: 'Volini Gel', genericName: 'Diclofenac Diethylamine', strength: '30g', dosageForm: 'Gel', unitPrice: 110, stockQuantity: 45, requiresPrescription: false },
    ],
  },
];
