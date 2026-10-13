import { AppError } from '../../utils/AppError';
import { EmergencyGuide, type EmergencyGuideDoc } from './emergencyGuide.model';
import type { CreateGuideInput, UpdateGuideInput } from './emergency.validation';

export async function createGuide(adminId: string, input: CreateGuideInput): Promise<EmergencyGuideDoc> {
  return EmergencyGuide.create({ ...input, createdBy: adminId });
}

export async function updateGuide(guideId: string, input: UpdateGuideInput): Promise<EmergencyGuideDoc> {
  const guide = await EmergencyGuide.findById(guideId);
  if (!guide) {
    throw AppError.notFound('Guide not found');
  }
  Object.assign(guide, input);
  await guide.save();
  return guide;
}

export async function deleteGuide(guideId: string): Promise<void> {
  const guide = await EmergencyGuide.findById(guideId);
  if (!guide) {
    throw AppError.notFound('Guide not found');
  }
  guide.isActive = false;
  await guide.save();
}

export async function listAllGuides(): Promise<EmergencyGuideDoc[]> {
  return EmergencyGuide.find().sort({ displayOrder: 1, createdAt: 1 });
}

export async function listActiveGuides(): Promise<EmergencyGuideDoc[]> {
  return EmergencyGuide.find({ isActive: true }).sort({ displayOrder: 1, createdAt: 1 });
}
