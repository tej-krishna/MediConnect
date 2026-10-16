import type { Address, LatLng } from '../types/provider';
import { NANDIGAMA_PINCODE } from './mockNandigamaProviders';

export interface MockLabTest {
  id: string;
  name: string;
  category: string;
  sampleType: string;
  price: number;
  turnaroundHours: number;
  homeCollectionAvailable: boolean;
}

export interface MockLab {
  id: string;
  name: string;
  address: Address;
  location: LatLng;
  contactPhone: string;
  tests: MockLabTest[];
}

const address = (line1: string): Address => ({
  line1,
  city: 'Nandigama',
  state: 'Andhra Pradesh',
  postalCode: NANDIGAMA_PINCODE,
  country: 'India',
});

/**
 * No diagnostic labs are registered near Nandigama yet, so the Find Tests page
 * uses this sample dataset (10 labs, each offering a few common tests) until
 * real registrations arrive in the area.
 */
export const MOCK_LABS: MockLab[] = [
  {
    id: 'mock-lab-1',
    name: 'Vijaya Diagnostics, Nandigama',
    address: address('Station Road'),
    location: { lat: 16.7692, lng: 80.2833 },
    contactPhone: '+91 90666 55443',
    tests: [
      { id: 'test-1', name: 'Complete Blood Count (CBC)', category: 'Hematology', sampleType: 'Blood', price: 250, turnaroundHours: 6, homeCollectionAvailable: true },
      { id: 'test-2', name: 'Blood Sugar (Fasting)', category: 'Biochemistry', sampleType: 'Blood', price: 80, turnaroundHours: 4, homeCollectionAvailable: true },
      { id: 'test-3', name: 'Lipid Profile', category: 'Biochemistry', sampleType: 'Blood', price: 450, turnaroundHours: 8, homeCollectionAvailable: true },
    ],
  },
  {
    id: 'mock-lab-2',
    name: 'Nandigama Diagnostic Centre',
    address: address('Hospital Road'),
    location: { lat: 16.7735, lng: 80.2891 },
    contactPhone: '+91 90700 11223',
    tests: [
      { id: 'test-4', name: 'Thyroid Profile (T3 T4 TSH)', category: 'Endocrinology', sampleType: 'Blood', price: 550, turnaroundHours: 24, homeCollectionAvailable: true },
      { id: 'test-5', name: 'Liver Function Test (LFT)', category: 'Biochemistry', sampleType: 'Blood', price: 500, turnaroundHours: 12, homeCollectionAvailable: false },
      { id: 'test-6', name: 'HbA1c', category: 'Biochemistry', sampleType: 'Blood', price: 400, turnaroundHours: 8, homeCollectionAvailable: true },
    ],
  },
  {
    id: 'mock-lab-3',
    name: 'Apollo Diagnostics',
    address: address('Ring Road, Opp. RTC Complex'),
    location: { lat: 16.7756, lng: 80.2822 },
    contactPhone: '+91 90811 22334',
    tests: [
      { id: 'test-7', name: 'Kidney Function Test (KFT)', category: 'Biochemistry', sampleType: 'Blood', price: 480, turnaroundHours: 12, homeCollectionAvailable: true },
      { id: 'test-8', name: 'X-Ray Chest (PA View)', category: 'Radiology', sampleType: 'Imaging', price: 350, turnaroundHours: 2, homeCollectionAvailable: false },
      { id: 'test-9', name: 'ECG', category: 'Cardiology', sampleType: 'Procedure', price: 200, turnaroundHours: 1, homeCollectionAvailable: false },
    ],
  },
  {
    id: 'mock-lab-4',
    name: 'Sri Sai Pathlabs',
    address: address('Main Road, Gandhi Nagar'),
    location: { lat: 16.7698, lng: 80.284 },
    contactPhone: '+91 90922 33445',
    tests: [
      { id: 'test-10', name: 'Urine Routine Examination', category: 'Pathology', sampleType: 'Urine', price: 120, turnaroundHours: 4, homeCollectionAvailable: true },
      { id: 'test-11', name: 'Dengue NS1 Antigen', category: 'Serology', sampleType: 'Blood', price: 600, turnaroundHours: 6, homeCollectionAvailable: true },
    ],
  },
  {
    id: 'mock-lab-5',
    name: 'Medicover Labs, Nandigama',
    address: address('Market Street'),
    location: { lat: 16.7715, lng: 80.2905 },
    contactPhone: '+91 91033 44556',
    tests: [
      { id: 'test-12', name: 'Vitamin D (25-OH)', category: 'Endocrinology', sampleType: 'Blood', price: 1200, turnaroundHours: 48, homeCollectionAvailable: true },
      { id: 'test-13', name: 'Vitamin B12', category: 'Endocrinology', sampleType: 'Blood', price: 650, turnaroundHours: 48, homeCollectionAvailable: true },
      { id: 'test-14', name: 'COVID-19 RT-PCR', category: 'Microbiology', sampleType: 'Swab', price: 500, turnaroundHours: 24, homeCollectionAvailable: true },
    ],
  },
  {
    id: 'mock-lab-6',
    name: 'Prashanti Scans & Labs',
    address: address('Kanchikacherla Road'),
    location: { lat: 16.7748, lng: 80.2851 },
    contactPhone: '+91 91144 55667',
    tests: [
      { id: 'test-15', name: 'Ultrasound Abdomen', category: 'Radiology', sampleType: 'Imaging', price: 900, turnaroundHours: 2, homeCollectionAvailable: false },
      { id: 'test-16', name: 'Pregnancy Test (Beta hCG)', category: 'Endocrinology', sampleType: 'Blood', price: 300, turnaroundHours: 6, homeCollectionAvailable: true },
    ],
  },
  {
    id: 'mock-lab-7',
    name: 'City Diagnostics Nandigama',
    address: address('Temple Street, Nandigama Bazar'),
    location: { lat: 16.7682, lng: 80.2878 },
    contactPhone: '+91 91255 66778',
    tests: [
      { id: 'test-17', name: 'Malaria Antigen Test', category: 'Microbiology', sampleType: 'Blood', price: 280, turnaroundHours: 3, homeCollectionAvailable: true },
      { id: 'test-18', name: 'Typhoid (Widal Test)', category: 'Serology', sampleType: 'Blood', price: 220, turnaroundHours: 6, homeCollectionAvailable: true },
      { id: 'test-19', name: 'Complete Blood Count (CBC)', category: 'Hematology', sampleType: 'Blood', price: 240, turnaroundHours: 6, homeCollectionAvailable: true },
    ],
  },
  {
    id: 'mock-lab-8',
    name: 'Krishna Labs & Imaging',
    address: address('NH65 Service Road'),
    location: { lat: 16.7756, lng: 80.2875 },
    contactPhone: '+91 91366 77889',
    tests: [
      { id: 'test-20', name: 'MRI Brain (Plain)', category: 'Radiology', sampleType: 'Imaging', price: 4500, turnaroundHours: 24, homeCollectionAvailable: false },
      { id: 'test-21', name: 'CT Scan Abdomen', category: 'Radiology', sampleType: 'Imaging', price: 3200, turnaroundHours: 24, homeCollectionAvailable: false },
    ],
  },
  {
    id: 'mock-lab-9',
    name: 'Sri Lakshmi Diagnostics',
    address: address('Gandhi Nagar, Main Road'),
    location: { lat: 16.7703, lng: 80.2897 },
    contactPhone: '+91 91477 88990',
    tests: [
      { id: 'test-22', name: 'Blood Sugar (Random)', category: 'Biochemistry', sampleType: 'Blood', price: 70, turnaroundHours: 2, homeCollectionAvailable: true },
      { id: 'test-23', name: 'Hemoglobin (Hb)', category: 'Hematology', sampleType: 'Blood', price: 100, turnaroundHours: 2, homeCollectionAvailable: true },
      { id: 'test-24', name: 'ESR', category: 'Hematology', sampleType: 'Blood', price: 90, turnaroundHours: 4, homeCollectionAvailable: true },
    ],
  },
  {
    id: 'mock-lab-10',
    name: 'Nandigama Path & Scan Centre',
    address: address('Near Government Hospital'),
    location: { lat: 16.7766, lng: 80.2862 },
    contactPhone: '+91 91588 99001',
    tests: [
      { id: 'test-25', name: 'Allergy Panel (IgE)', category: 'Immunology', sampleType: 'Blood', price: 1800, turnaroundHours: 72, homeCollectionAvailable: true },
      { id: 'test-26', name: 'Stool Routine Examination', category: 'Pathology', sampleType: 'Stool', price: 150, turnaroundHours: 6, homeCollectionAvailable: true },
    ],
  },
];
