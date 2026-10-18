/**
 * Creates (or updates) a demo "pharmacy" account that's already past the normal
 * provider-application review flow — approved, verified, and holding the `pharmacy` role — plus a
 * small medicine inventory and a handful of orders in different statuses, so the pharmacy
 * dashboard (Overview/Inventory/Orders/Reports) isn't empty when checked manually. Idempotent:
 * safe to run again.
 *
 * Run: npx tsx scripts/seed-pharmacy.ts
 */
import bcrypt from 'bcryptjs';
import { env } from '../src/config/env';
import { connectDatabase, disconnectDatabase } from '../src/config/db';
import { SALT_ROUNDS } from '../src/config/constants';
import { User } from '../src/modules/users/user.model';
import { ProviderApplication } from '../src/modules/providers/provider.model';
import { MedicineItem } from '../src/modules/pharmacy/medicine.model';
import { Order } from '../src/modules/pharmacy/order.model';

const PHARMACY_EMAIL = 'pharmacy.demo@mediconnect.test';
const PHARMACY_PASSWORD = 'PharmacyDemo@123';
const PHARMACY_NAME = 'Nandigama Care Pharmacy';
const PHARMACY_PHONE = '+91 90000 54321';

const PATIENT_EMAIL = 'patient.demo@mediconnect.test';
const PATIENT_PASSWORD = 'PatientDemo@123';
const PATIENT_NAME = 'Ravi Kumar';

const MEDICINES = [
  { name: 'Paracetamol', genericName: 'Paracetamol', activeIngredient: 'paracetamol', strength: '500mg', dosageForm: 'tablet', unitPrice: 25, stockQuantity: 120, requiresPrescription: false },
  { name: 'Amoxicillin', genericName: 'Amoxicillin', activeIngredient: 'amoxicillin', strength: '250mg', dosageForm: 'capsule', unitPrice: 85, stockQuantity: 60, requiresPrescription: true },
  { name: 'Cetirizine', genericName: 'Cetirizine', activeIngredient: 'cetirizine', strength: '10mg', dosageForm: 'tablet', unitPrice: 18, stockQuantity: 8, requiresPrescription: false },
  { name: 'Insulin Glargine', genericName: 'Insulin Glargine', activeIngredient: 'insulin glargine', strength: '100IU/ml', dosageForm: 'injection', unitPrice: 650, stockQuantity: 15, requiresPrescription: true },
];

async function main() {
  await connectDatabase(env.MONGO_URI);

  let owner = await User.findOne({ email: PHARMACY_EMAIL });
  if (!owner) {
    const passwordHash = await bcrypt.hash(PHARMACY_PASSWORD, SALT_ROUNDS);
    owner = await User.create({
      email: PHARMACY_EMAIL,
      passwordHash,
      fullName: PHARMACY_NAME,
      phone: PHARMACY_PHONE,
      roles: ['patient', 'pharmacy_owner'],
      status: 'active',
    });
    console.log(`Created user ${PHARMACY_EMAIL}`);
  } else if (!owner.roles.includes('pharmacy_owner')) {
    owner.roles.push('pharmacy_owner');
    await owner.save();
    console.log(`Added "pharmacy_owner" role to existing user ${PHARMACY_EMAIL}`);
  } else {
    console.log(`User ${PHARMACY_EMAIL} already exists with the pharmacy_owner role`);
  }

  let patient = await User.findOne({ email: PATIENT_EMAIL });
  if (!patient) {
    const passwordHash = await bcrypt.hash(PATIENT_PASSWORD, SALT_ROUNDS);
    patient = await User.create({
      email: PATIENT_EMAIL,
      passwordHash,
      fullName: PATIENT_NAME,
      phone: '+91 90000 11223',
      roles: ['patient'],
      status: 'active',
    });
    console.log(`Created demo patient ${PATIENT_EMAIL} to place sample orders`);
  }

  let application = await ProviderApplication.findOne({ userId: owner._id, providerType: 'pharmacy' });
  if (!application) {
    const now = new Date();
    const oneYearMs = 365 * 24 * 60 * 60 * 1000;
    application = await ProviderApplication.create({
      userId: owner._id,
      providerType: 'pharmacy',
      organizationName: PHARMACY_NAME,
      registrationNumber: 'DL-DEMO-0001',
      issuingAuthority: 'Drug Control Administration (Demo)',
      contactPhone: PHARMACY_PHONE,
      contactEmail: PHARMACY_EMAIL,
      address: {
        line1: 'Main Bazar Road',
        city: 'Nandigama',
        state: 'Andhra Pradesh',
        postalCode: '521185',
        country: 'India',
      },
      location: { type: 'Point', coordinates: [80.2868, 16.772] },
      typeDetails: { has24x7Service: true },
      consultationFee: null,
      operatingHoursNote: 'Daily, 8:00 AM – 10:00 PM',
      isCurrentlyAvailable: true,
      documents: [],
      status: 'approved',
      statusHistory: [
        { status: 'draft', changedAt: now, changedBy: owner._id, reason: null },
        { status: 'submitted', changedAt: now, changedBy: owner._id, reason: null },
        { status: 'under_review', changedAt: now, changedBy: owner._id, reason: null },
        { status: 'approved', changedAt: now, changedBy: owner._id, reason: null },
      ],
      reviewedBy: owner._id,
      reviewedAt: now,
      verifiedAt: now,
      expiresAt: new Date(now.getTime() + oneYearMs),
    });
    console.log(`Created approved provider application ${application._id}`);
  } else {
    console.log(`Provider application already exists: ${application._id} (status: ${application.status})`);
  }

  const existingMedicineCount = await MedicineItem.countDocuments({ pharmacyId: application._id });
  let medicineDocs = await MedicineItem.find({ pharmacyId: application._id });
  if (existingMedicineCount === 0) {
    medicineDocs = await MedicineItem.insertMany(
      MEDICINES.map((m) => ({ ...m, pharmacyId: application!._id, createdBy: owner!._id })),
    );
    console.log(`Seeded ${medicineDocs.length} medicines`);
  } else {
    console.log(`${existingMedicineCount} medicines already exist for this pharmacy`);
  }

  const existingOrderCount = await Order.countDocuments({ pharmacyId: application._id });
  if (existingOrderCount === 0 && medicineDocs.length >= 2) {
    const [paracetamol, amoxicillin] = medicineDocs;
    const sampleAddress = { line1: 'Main Bazar Road', city: 'Nandigama', state: 'Andhra Pradesh', postalCode: '521185' };
    await Order.insertMany([
      {
        patientId: patient._id,
        pharmacyId: application._id,
        items: [{ medicineItemId: paracetamol._id, name: paracetamol.name, quantity: 2, unitPrice: paracetamol.unitPrice }],
        totalAmount: paracetamol.unitPrice * 2,
        requiresPrescription: false,
        deliveryAddress: sampleAddress,
        status: 'delivered',
        statusHistory: [{ status: 'delivered', changedAt: new Date(), changedBy: owner._id }],
      },
      {
        patientId: patient._id,
        pharmacyId: application._id,
        items: [{ medicineItemId: amoxicillin._id, name: amoxicillin.name, quantity: 1, unitPrice: amoxicillin.unitPrice }],
        totalAmount: amoxicillin.unitPrice,
        requiresPrescription: true,
        deliveryAddress: sampleAddress,
        status: 'confirmed',
        statusHistory: [{ status: 'confirmed', changedAt: new Date(), changedBy: owner._id }],
      },
      {
        patientId: patient._id,
        pharmacyId: application._id,
        items: [{ medicineItemId: paracetamol._id, name: paracetamol.name, quantity: 1, unitPrice: paracetamol.unitPrice }],
        totalAmount: paracetamol.unitPrice,
        requiresPrescription: false,
        deliveryAddress: sampleAddress,
        status: 'placed',
        statusHistory: [{ status: 'placed', changedAt: new Date(), changedBy: owner._id }],
      },
    ]);
    console.log('Seeded 3 sample orders (delivered, confirmed, placed)');
  } else {
    console.log(`${existingOrderCount} orders already exist for this pharmacy`);
  }

  console.log('\n--- Pharmacy demo login ---');
  console.log(`Email:    ${PHARMACY_EMAIL}`);
  console.log(`Password: ${PHARMACY_PASSWORD}`);
  console.log(`Provider application id: ${application._id}`);
  console.log(`Dashboard URL: /provider/${application._id}`);

  await disconnectDatabase();
}

main().catch((error) => {
  console.error('Seed failed:', error);
  process.exitCode = 1;
});
