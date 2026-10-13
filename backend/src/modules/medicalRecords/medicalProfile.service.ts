import { assertAccess, logAccess } from './medicalRecords.access';
import { MedicalProfile, type MedicalProfileDoc } from './medicalProfile.model';
import type { UpdateProfileInput } from './medicalRecords.validation';

export async function getProfile(patientId: string, requesterId: string): Promise<MedicalProfileDoc | null> {
  await assertAccess(patientId, requesterId, 'view_profile');
  await logAccess(patientId, requesterId, 'view_profile');
  return MedicalProfile.findOne({ patientId });
}

export async function updateProfile(
  patientId: string,
  requesterId: string,
  input: UpdateProfileInput,
): Promise<MedicalProfileDoc> {
  await assertAccess(patientId, requesterId, 'manage_profile');
  await logAccess(patientId, requesterId, 'edit_profile');

  const profile = await MedicalProfile.findOneAndUpdate(
    { patientId },
    { $set: { ...input, lastEditedBy: requesterId } },
    { returnDocument: 'after', upsert: true, setDefaultsOnInsert: true },
  );
  return profile;
}
