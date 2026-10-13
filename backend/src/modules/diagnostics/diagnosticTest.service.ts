import { AppError } from '../../utils/AppError';
import { parsePagination, buildPaginationMeta } from '../../utils/response';
import { ProviderApplication } from '../providers/provider.model';
import { isActivelyVerified } from '../providers/provider.service';
import { isProviderMember } from '../providers/providerStaff.service';
import { DiagnosticTest, type DiagnosticTestDoc } from './diagnosticTest.model';
import type { CreateTestInput, UpdateTestInput } from './diagnostics.validation';

async function assertActiveLab(labId: string) {
  const lab = await ProviderApplication.findById(labId);
  if (!lab) {
    throw AppError.notFound('Diagnostic lab not found');
  }
  if (lab.providerType !== 'diagnostic_lab') {
    throw AppError.badRequest('This provider is not registered as a diagnostic lab');
  }
  if (!isActivelyVerified(lab)) {
    throw AppError.conflict('This lab is not currently active and verified');
  }
  return lab;
}

export async function createTest(labId: string, requesterId: string, input: CreateTestInput): Promise<DiagnosticTestDoc> {
  await assertActiveLab(labId);
  if (!(await isProviderMember(labId, requesterId))) {
    throw AppError.forbidden();
  }
  return DiagnosticTest.create({ labId, ...input, createdBy: requesterId });
}

export async function updateTest(
  labId: string,
  testId: string,
  requesterId: string,
  input: UpdateTestInput,
): Promise<DiagnosticTestDoc> {
  if (!(await isProviderMember(labId, requesterId))) {
    throw AppError.forbidden();
  }
  const test = await DiagnosticTest.findOne({ _id: testId, labId });
  if (!test) {
    throw AppError.notFound('Test not found');
  }
  Object.assign(test, input);
  await test.save();
  return test;
}

export async function listLabTests(labId: string, requesterId: string): Promise<DiagnosticTestDoc[]> {
  if (!(await isProviderMember(labId, requesterId))) {
    throw AppError.forbidden();
  }
  return DiagnosticTest.find({ labId }).sort({ name: 1 });
}

async function filterToApprovedLabs(items: DiagnosticTestDoc[]): Promise<DiagnosticTestDoc[]> {
  const labIds = [...new Set(items.map((i) => i.labId.toString()))];
  const approvedLabs = await ProviderApplication.find({
    _id: { $in: labIds },
    providerType: 'diagnostic_lab',
    status: 'approved',
  }).select('_id expiresAt');
  const approvedIds = new Set(
    approvedLabs.filter((l) => !l.expiresAt || l.expiresAt.getTime() > Date.now()).map((l) => l._id.toString()),
  );
  return items.filter((i) => approvedIds.has(i.labId.toString()));
}

export async function searchTests(query: Record<string, unknown>) {
  const { page, limit, skip } = parsePagination(query);
  const filter: Record<string, unknown> = { isActive: true };

  if (typeof query.query === 'string' && query.query.trim()) {
    filter.$text = { $search: query.query.trim() };
  }

  let labIdFilter: unknown[] | undefined;
  if (typeof query.city === 'string' && query.city.trim()) {
    const labs = await ProviderApplication.find({
      providerType: 'diagnostic_lab',
      status: 'approved',
      'address.city': { $regex: query.city.trim(), $options: 'i' },
    }).select('_id');
    labIdFilter = labs.map((l) => l._id);
    filter.labId = { $in: labIdFilter };
  }

  const [items, total] = await Promise.all([
    DiagnosticTest.find(filter).sort({ name: 1 }).skip(skip).limit(limit),
    DiagnosticTest.countDocuments(filter),
  ]);

  const visible = labIdFilter ? items : await filterToApprovedLabs(items);
  return { items: visible, meta: buildPaginationMeta(page, limit, total) };
}

export async function getTestById(testId: string): Promise<DiagnosticTestDoc> {
  const test = await DiagnosticTest.findOne({ _id: testId, isActive: true });
  if (!test) {
    throw AppError.notFound('Test not found');
  }
  await assertActiveLab(test.labId.toString());
  return test;
}
