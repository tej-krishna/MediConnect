import { AppError } from '../../utils/AppError';
import { parsePagination, buildPaginationMeta } from '../../utils/response';
import { RecordAccessLog } from './recordAccessLog.model';

/** Audit log is patient-only — a caregiver should never see who else accessed the same records. */
export async function listAccessLog(patientId: string, requesterId: string, query: Record<string, unknown>) {
  if (patientId !== requesterId) {
    throw AppError.forbidden();
  }
  const { page, limit, skip } = parsePagination(query);
  const [items, total] = await Promise.all([
    RecordAccessLog.find({ patientId }).sort({ timestamp: -1 }).skip(skip).limit(limit),
    RecordAccessLog.countDocuments({ patientId }),
  ]);
  return { items, meta: buildPaginationMeta(page, limit, total) };
}
