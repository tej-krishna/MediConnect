import { asyncHandler } from '../../middleware/errorHandler';
import { sendSuccess } from '../../utils/response';
import * as staffService from './providerStaff.service';

function toStaffView(staff: Awaited<ReturnType<typeof staffService.listStaff>>[number]) {
  return {
    id: staff._id.toString(),
    providerId: staff.providerId.toString(),
    userId: staff.userId.toString(),
    status: staff.status,
    invitedAt: staff.invitedAt,
    acceptedAt: staff.acceptedAt,
  };
}

export const inviteStaffHandler = asyncHandler(async (req, res) => {
  const staff = await staffService.inviteStaff(req.params.id as string, req.user!.id, req.body.email);
  sendSuccess(res, { staff: toStaffView(staff) }, 201);
});

export const listStaffHandler = asyncHandler(async (req, res) => {
  const staff = await staffService.listStaff(req.params.id as string, req.user!.id);
  sendSuccess(res, { staff: staff.map(toStaffView) });
});

export const acceptStaffInviteHandler = asyncHandler(async (req, res) => {
  const staff = await staffService.acceptInvite(req.params.staffId as string, req.user!.id);
  sendSuccess(res, { staff: toStaffView(staff) });
});

export const removeStaffHandler = asyncHandler(async (req, res) => {
  await staffService.removeStaff(req.params.id as string, req.params.staffId as string, req.user!.id);
  sendSuccess(res, { removed: true });
});
