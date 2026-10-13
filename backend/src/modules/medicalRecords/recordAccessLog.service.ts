import { AppError } from '../../utils/AppError';
import { RecordAccessLog, type RecordAccessLogDoc } from './recordAccessLog.model';

/** Audit log is patient-only — a caregiver should never see who else accessed the same records. */
export async function listAccessLog(patientId: string, requesterId: string): Promise<RecordAccessLogDoc[]> {
  if (patientId !== requesterId) {
    throw AppError.forbidden();
  }
  return RecordAccessLog.find({ patientId }).sort({ timestamp: -1 }).limit(200);
}
