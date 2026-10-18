/**
 * Creates (or updates) a full set of demo accounts — one patient, one of every remaining provider
 * type, a delivery partner, support staff and a super admin — each already past the normal review
 * flow where that applies, so every role's UI can be logged into and tested manually without
 * waiting on an admin to approve anything. Idempotent: safe to run again.
 *
 * Doctor and pharmacy demo accounts live in their own scripts (seed-doctor.ts / seed-pharmacy.ts,
 * which also seed sample slots/medicines/orders) — run those too for the full picture.
 *
 * Run: npx tsx scripts/seed-demo-users.ts
 */
import bcrypt from 'bcryptjs';
import { env } from '../src/config/env';
import { connectDatabase, disconnectDatabase } from '../src/config/db';
import { SALT_ROUNDS } from '../src/config/constants';
import { User } from '../src/modules/users/user.model';
import { ProviderApplication } from '../src/modules/providers/provider.model';
import { DeliveryPartnerProfile } from '../src/modules/delivery/deliveryPartner.model';
import type { Role } from '../src/config/roles';

const NANDIGAMA_ADDRESS = {
  line1: 'Main Bazar Road',
  city: 'Nandigama',
  state: 'Andhra Pradesh',
  postalCode: '521185',
  country: 'India',
};
const NANDIGAMA_LOCATION = { type: 'Point' as const, coordinates: [80.2868, 16.772] };

interface DemoUserSpec {
  email: string;
  password: string;
  fullName: string;
  phone: string;
  roles: Role[];
}

async function ensureUser(spec: DemoUserSpec) {
  let user = await User.findOne({ email: spec.email });
  if (!user) {
    const passwordHash = await bcrypt.hash(spec.password, SALT_ROUNDS);
    user = await User.create({
      email: spec.email,
      passwordHash,
      fullName: spec.fullName,
      phone: spec.phone,
      roles: spec.roles,
      status: 'active',
    });
    console.log(`Created user ${spec.email}`);
    return user;
  }
  const missingRoles = spec.roles.filter((r) => !user!.roles.includes(r));
  if (missingRoles.length > 0) {
    user.roles.push(...missingRoles);
    await user.save();
    console.log(`Added role(s) [${missingRoles.join(', ')}] to existing user ${spec.email}`);
  } else {
    console.log(`User ${spec.email} already exists with the required role(s)`);
  }
  return user;
}

interface DemoProviderSpec {
  user: Awaited<ReturnType<typeof ensureUser>>;
  providerType: string;
  organizationName: string;
  registrationNumber: string;
  issuingAuthority: string;
  contactPhone: string;
  contactEmail: string;
  typeDetails: Record<string, unknown>;
  consultationFee?: number | null;
  operatingHoursNote?: string;
  isCurrentlyAvailable?: boolean;
}

async function ensureApprovedApplication(spec: DemoProviderSpec) {
  let application = await ProviderApplication.findOne({ userId: spec.user._id, providerType: spec.providerType });
  if (application) {
    console.log(`Provider application already exists for ${spec.contactEmail}: ${application._id} (status: ${application.status})`);
    return application;
  }
  const now = new Date();
  const oneYearMs = 365 * 24 * 60 * 60 * 1000;
  application = await ProviderApplication.create({
    userId: spec.user._id,
    providerType: spec.providerType,
    organizationName: spec.organizationName,
    registrationNumber: spec.registrationNumber,
    issuingAuthority: spec.issuingAuthority,
    contactPhone: spec.contactPhone,
    contactEmail: spec.contactEmail,
    address: NANDIGAMA_ADDRESS,
    location: NANDIGAMA_LOCATION,
    typeDetails: spec.typeDetails,
    consultationFee: spec.consultationFee ?? null,
    operatingHoursNote: spec.operatingHoursNote ?? 'Daily, 9:00 AM – 7:00 PM',
    isCurrentlyAvailable: spec.isCurrentlyAvailable ?? true,
    documents: [],
    status: 'approved',
    statusHistory: [
      { status: 'draft', changedAt: now, changedBy: spec.user._id, reason: null },
      { status: 'submitted', changedAt: now, changedBy: spec.user._id, reason: null },
      { status: 'under_review', changedAt: now, changedBy: spec.user._id, reason: null },
      { status: 'approved', changedAt: now, changedBy: spec.user._id, reason: null },
    ],
    reviewedBy: spec.user._id,
    reviewedAt: now,
    verifiedAt: now,
    expiresAt: new Date(now.getTime() + oneYearMs),
  });
  console.log(`Created approved provider application ${application._id} for ${spec.contactEmail}`);
  return application;
}

async function main() {
  await connectDatabase(env.MONGO_URI);

  const results: { label: string; email: string; password: string; url: string }[] = [];

  // Patient
  await ensureUser({
    email: 'patient.demo@mediconnect.test',
    password: 'PatientDemo@123',
    fullName: 'Ravi Kumar',
    phone: '+91 90000 11223',
    roles: ['patient'],
  });
  results.push({ label: 'Patient', email: 'patient.demo@mediconnect.test', password: 'PatientDemo@123', url: '/account' });

  // Diagnostic lab
  const labUser = await ensureUser({
    email: 'lab.demo@mediconnect.test',
    password: 'LabDemo@123',
    fullName: 'Nandigama Diagnostics Lab',
    phone: '+91 90000 22334',
    roles: ['patient', 'diagnostic_lab_admin'],
  });
  const labApp = await ensureApprovedApplication({
    user: labUser,
    providerType: 'diagnostic_lab',
    organizationName: 'Nandigama Diagnostics Lab',
    registrationNumber: 'NABL-DEMO-0001',
    issuingAuthority: 'NABL (Demo)',
    contactPhone: '+91 90000 22334',
    contactEmail: 'lab.demo@mediconnect.test',
    typeDetails: { nablAccreditationNumber: 'NABL-T-0001', homeCollectionAvailable: true },
  });
  results.push({ label: 'Diagnostic lab', email: 'lab.demo@mediconnect.test', password: 'LabDemo@123', url: `/provider/${labApp._id}` });

  // Equipment provider (medical rentals)
  const rentalsUser = await ensureUser({
    email: 'rentals.demo@mediconnect.test',
    password: 'RentalsDemo@123',
    fullName: 'CareWell Medical Equipment',
    phone: '+91 90000 33445',
    roles: ['patient', 'equipment_provider'],
  });
  const rentalsApp = await ensureApprovedApplication({
    user: rentalsUser,
    providerType: 'equipment_provider',
    organizationName: 'CareWell Medical Equipment',
    registrationNumber: 'EQ-DEMO-0001',
    issuingAuthority: 'Local Trade License (Demo)',
    contactPhone: '+91 90000 33445',
    contactEmail: 'rentals.demo@mediconnect.test',
    typeDetails: { equipmentCategories: 'Wheelchairs, Oxygen concentrators, Hospital beds', serviceType: 'both' },
  });
  results.push({ label: 'Equipment / medical rentals', email: 'rentals.demo@mediconnect.test', password: 'RentalsDemo@123', url: `/provider/${rentalsApp._id}` });

  // Ambulance provider
  const ambulanceUser = await ensureUser({
    email: 'ambulance.demo@mediconnect.test',
    password: 'AmbulanceDemo@123',
    fullName: 'Nandigama Emergency Ambulance',
    phone: '+91 90000 44556',
    roles: ['patient', 'ambulance_provider'],
  });
  const ambulanceApp = await ensureApprovedApplication({
    user: ambulanceUser,
    providerType: 'ambulance_provider',
    organizationName: 'Nandigama Emergency Ambulance',
    registrationNumber: 'AMB-DEMO-0001',
    issuingAuthority: 'RTO (Demo)',
    contactPhone: '+91 90000 44556',
    contactEmail: 'ambulance.demo@mediconnect.test',
    typeDetails: { vehicleCount: 3, vehicleType: 'advanced_life_support' },
    isCurrentlyAvailable: true,
  });
  results.push({ label: 'Ambulance service', email: 'ambulance.demo@mediconnect.test', password: 'AmbulanceDemo@123', url: `/provider/${ambulanceApp._id}` });

  // Mobile van operator (health camps)
  const campUser = await ensureUser({
    email: 'camps.demo@mediconnect.test',
    password: 'CampsDemo@123',
    fullName: 'Rural Health Outreach Van',
    phone: '+91 90000 55667',
    roles: ['patient', 'mobile_van_operator'],
  });
  const campApp = await ensureApprovedApplication({
    user: campUser,
    providerType: 'mobile_van_operator',
    organizationName: 'Rural Health Outreach Van',
    registrationNumber: 'VAN-DEMO-0001',
    issuingAuthority: 'District Health Office (Demo)',
    contactPhone: '+91 90000 55667',
    contactEmail: 'camps.demo@mediconnect.test',
    typeDetails: { vanCount: 2, coverageAreas: 'Nandigama, Jaggayyapet' },
  });
  results.push({ label: 'Health camp operator', email: 'camps.demo@mediconnect.test', password: 'CampsDemo@123', url: `/provider/${campApp._id}` });

  // Delivery partner
  const deliveryUser = await ensureUser({
    email: 'delivery.demo@mediconnect.test',
    password: 'DeliveryDemo@123',
    fullName: 'Suresh Delivery',
    phone: '+91 90000 66778',
    roles: ['patient', 'delivery_partner'],
  });
  let deliveryProfile = await DeliveryPartnerProfile.findOne({ userId: deliveryUser._id });
  if (!deliveryProfile) {
    deliveryProfile = await DeliveryPartnerProfile.create({
      userId: deliveryUser._id,
      contactPhone: '+91 90000 66778',
      vehicleType: 'two_wheeler',
      serviceCity: 'Nandigama',
      status: 'approved',
      reviewedBy: deliveryUser._id,
      reviewedAt: new Date(),
    });
    console.log(`Created approved delivery partner profile ${deliveryProfile._id}`);
  } else {
    console.log(`Delivery partner profile already exists: ${deliveryProfile._id} (status: ${deliveryProfile.status})`);
  }
  results.push({ label: 'Delivery partner', email: 'delivery.demo@mediconnect.test', password: 'DeliveryDemo@123', url: '/my-deliveries' });

  // Support staff
  await ensureUser({
    email: 'support.demo@mediconnect.test',
    password: 'SupportDemo@123',
    fullName: 'MediConnect Support',
    phone: '+91 90000 77889',
    roles: ['support'],
  });
  results.push({ label: 'Support staff', email: 'support.demo@mediconnect.test', password: 'SupportDemo@123', url: '/admin/support-tickets' });

  // Super admin
  await ensureUser({
    email: 'admin.demo@mediconnect.test',
    password: 'AdminDemo@123',
    fullName: 'MediConnect Admin',
    phone: '+91 90000 88990',
    roles: ['super_admin'],
  });
  results.push({ label: 'Super admin', email: 'admin.demo@mediconnect.test', password: 'AdminDemo@123', url: '/admin' });

  console.log('\n--- Demo logins ---');
  for (const r of results) {
    console.log(`${r.label.padEnd(26)} ${r.email.padEnd(32)} ${r.password.padEnd(20)} -> ${r.url}`);
  }
  console.log(
    '\nAlso run `npm run seed:doctor` and `npm run seed:pharmacy` for doctor.demo@mediconnect.test / pharmacy.demo@mediconnect.test (with sample appointments/medicines/orders).',
  );

  await disconnectDatabase();
}

main().catch((error) => {
  console.error('Seed failed:', error);
  process.exitCode = 1;
});
