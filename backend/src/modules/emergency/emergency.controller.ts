import { asyncHandler } from '../../middleware/errorHandler';
import { sendSuccess } from '../../utils/response';
import * as emergencyService from './emergency.service';
import type { EmergencyGuideDoc } from './emergencyGuide.model';

function toGuideView(guide: EmergencyGuideDoc) {
  return {
    id: guide._id.toString(),
    title: guide.title,
    redFlagSymptoms: guide.redFlagSymptoms,
    guidance: guide.guidance,
    displayOrder: guide.displayOrder,
    isActive: guide.isActive,
    clinicallyReviewed: guide.clinicallyReviewed,
  };
}

export const createGuideHandler = asyncHandler(async (req, res) => {
  const guide = await emergencyService.createGuide(req.user!.id, req.body);
  sendSuccess(res, { guide: toGuideView(guide) }, 201);
});

export const updateGuideHandler = asyncHandler(async (req, res) => {
  const guide = await emergencyService.updateGuide(req.params.id as string, req.body);
  sendSuccess(res, { guide: toGuideView(guide) });
});

export const deleteGuideHandler = asyncHandler(async (req, res) => {
  await emergencyService.deleteGuide(req.params.id as string);
  sendSuccess(res, { deleted: true });
});

export const listAllGuidesHandler = asyncHandler(async (_req, res) => {
  const guides = await emergencyService.listAllGuides();
  sendSuccess(res, { guides: guides.map(toGuideView) });
});

export const listActiveGuidesHandler = asyncHandler(async (_req, res) => {
  const guides = await emergencyService.listActiveGuides();
  sendSuccess(res, { guides: guides.map(toGuideView) });
});
