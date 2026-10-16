/**
 * Creates (or updates) a single demo "doctor" account that's already past the normal
 * provider-application review flow — approved, verified, and holding the `doctor` role — so a
 * doctor login + dashboard can be tested manually without waiting on an admin to review a real
 * application. Idempotent: safe to run again.
 *
 * Run: npx tsx scripts/seed-doctor.ts
 */
import bcrypt from 'bcryptjs';
import { env } from '../src/config/env';
import { connectDatabase, disconnectDatabase } from '../src/config/db';
import { SALT_ROUNDS } from '../src/config/constants';
import { User } from '../src/modules/users/user.model';
import { ProviderApplication } from '../src/modules/providers/provider.model';

const DOCTOR_EMAIL = 'doctor.demo@mediconnect.test';
const DOCTOR_PASSWORD = 'DoctorDemo@123';
const DOCTOR_FULL_NAME = 'Dr. Priya Sharma';
const DOCTOR_PHONE = '+91 90000 12345';

async function main() {
  await connectDatabase(env.MONGO_URI);

  let user = await User.findOne({ email: DOCTOR_EMAIL });
  if (!user) {
    const passwordHash = await bcrypt.hash(DOCTOR_PASSWORD, SALT_ROUNDS);
    user = await User.create({
      email: DOCTOR_EMAIL,
      passwordHash,
      fullName: DOCTOR_FULL_NAME,
      phone: DOCTOR_PHONE,
      roles: ['patient', 'doctor'],
      status: 'active',
    });
    console.log(`Created user ${DOCTOR_EMAIL}`);
  } else if (!user.roles.includes('doctor')) {
    user.roles.push('doctor');
    await user.save();
    console.log(`Added "doctor" role to existing user ${DOCTOR_EMAIL}`);
  } else {
    console.log(`User ${DOCTOR_EMAIL} already exists with the doctor role`);
  }

  let application = await ProviderApplication.findOne({ userId: user._id, providerType: 'doctor' });
  if (!application) {
    const now = new Date();
    const oneYearMs = 365 * 24 * 60 * 60 * 1000;
    application = await ProviderApplication.create({
      userId: user._id,
      providerType: 'doctor',
      organizationName: `${DOCTOR_FULL_NAME} — General Physician`,
      registrationNumber: 'MCI-DEMO-0001',
      issuingAuthority: 'Medical Council of India (Demo)',
      contactPhone: DOCTOR_PHONE,
      contactEmail: DOCTOR_EMAIL,
      address: {
        line1: 'Main Bazar Road',
        city: 'Nandigama',
        state: 'Andhra Pradesh',
        postalCode: '521185',
        country: 'India',
      },
      location: { type: 'Point', coordinates: [80.2868, 16.772] },
      typeDetails: {
        specialization: 'General Physician',
        qualification: 'MBBS, MD (General Medicine)',
        yearsOfExperience: 14,
      },
      consultationFee: 500,
      operatingHoursNote: 'Mon–Sat, 10:00 AM – 6:00 PM (home visits by appointment)',
      isCurrentlyAvailable: true,
      documents: [],
      status: 'approved',
      statusHistory: [
        { status: 'draft', changedAt: now, changedBy: user._id, reason: null },
        { status: 'submitted', changedAt: now, changedBy: user._id, reason: null },
        { status: 'under_review', changedAt: now, changedBy: user._id, reason: null },
        { status: 'approved', changedAt: now, changedBy: user._id, reason: null },
      ],
      reviewedBy: user._id,
      reviewedAt: now,
      verifiedAt: now,
      expiresAt: new Date(now.getTime() + oneYearMs),
    });
    console.log(`Created approved provider application ${application._id}`);
  } else {
    console.log(`Provider application already exists: ${application._id} (status: ${application.status})`);
    if (!application.typeDetails || Object.keys(application.typeDetails).length === 0) {
      application.typeDetails = {
        specialization: 'General Physician',
        qualification: 'MBBS, MD (General Medicine)',
        yearsOfExperience: 14,
      };
      await application.save();
      console.log('Backfilled typeDetails on the existing application');
    }
  }

  console.log('\n--- Doctor demo login ---');
  console.log(`Email:    ${DOCTOR_EMAIL}`);
  console.log(`Password: ${DOCTOR_PASSWORD}`);
  console.log(`Provider application id: ${application._id}`);
  console.log(`Dashboard URL: /dashboard/providers/${application._id}`);

  await disconnectDatabase();
}

main().catch((error) => {
  console.error('Seed failed:', error);
  process.exitCode = 1;
});
