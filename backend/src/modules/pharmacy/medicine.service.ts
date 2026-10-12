import { AppError } from '../../utils/AppError';
import { parsePagination, buildPaginationMeta } from '../../utils/response';
import { ProviderApplication } from '../providers/provider.model';
import { isActivelyVerified } from '../providers/provider.service';
import { isProviderMember } from '../providers/providerStaff.service';
import { MedicineItem, type MedicineItemDoc } from './medicine.model';
import type { CreateMedicineItemInput, UpdateMedicineItemInput } from './pharmacy.validation';

async function assertActivePharmacy(pharmacyId: string) {
  const provider = await ProviderApplication.findById(pharmacyId);
  if (!provider) {
    throw AppError.notFound('Pharmacy not found');
  }
  if (provider.providerType !== 'pharmacy') {
    throw AppError.badRequest('This provider is not registered as a pharmacy');
  }
  if (!isActivelyVerified(provider)) {
    throw AppError.conflict('This pharmacy is not currently active and verified');
  }
  return provider;
}

export async function createMedicineItem(
  pharmacyId: string,
  requesterId: string,
  input: CreateMedicineItemInput,
): Promise<MedicineItemDoc> {
  await assertActivePharmacy(pharmacyId);
  if (!(await isProviderMember(pharmacyId, requesterId))) {
    throw AppError.forbidden();
  }

  return MedicineItem.create({
    pharmacyId,
    ...input,
    activeIngredient: input.activeIngredient.toLowerCase(),
    dosageForm: input.dosageForm.toLowerCase(),
    createdBy: requesterId,
  });
}

export async function updateMedicineItem(
  pharmacyId: string,
  medicineId: string,
  requesterId: string,
  input: UpdateMedicineItemInput,
): Promise<MedicineItemDoc> {
  if (!(await isProviderMember(pharmacyId, requesterId))) {
    throw AppError.forbidden();
  }
  const item = await MedicineItem.findOne({ _id: medicineId, pharmacyId });
  if (!item) {
    throw AppError.notFound('Medicine not found');
  }
  Object.assign(item, input);
  await item.save();
  return item;
}

export async function listPharmacyMedicines(pharmacyId: string, requesterId: string): Promise<MedicineItemDoc[]> {
  if (!(await isProviderMember(pharmacyId, requesterId))) {
    throw AppError.forbidden();
  }
  return MedicineItem.find({ pharmacyId }).sort({ name: 1 });
}

export async function searchMedicines(query: Record<string, unknown>) {
  const { page, limit, skip } = parsePagination(query);
  const filter: Record<string, unknown> = { isActive: true, stockQuantity: { $gt: 0 } };

  if (typeof query.query === 'string' && query.query.trim()) {
    filter.$text = { $search: query.query.trim() };
  }

  let activePharmacyIds: unknown[] | undefined;
  if (typeof query.city === 'string' && query.city.trim()) {
    const pharmacies = await ProviderApplication.find({
      providerType: 'pharmacy',
      status: 'approved',
      'address.city': { $regex: query.city.trim(), $options: 'i' },
    }).select('_id');
    activePharmacyIds = pharmacies.map((p) => p._id);
    filter.pharmacyId = { $in: activePharmacyIds };
  }

  const [items, total] = await Promise.all([
    MedicineItem.find(filter).sort({ name: 1 }).skip(skip).limit(limit),
    MedicineItem.countDocuments(filter),
  ]);

  // City filter already limits to approved pharmacies; without it, filter actively-verified here.
  let visibleItems = items;
  if (!activePharmacyIds) {
    const pharmacyIds = [...new Set(items.map((i) => i.pharmacyId.toString()))];
    const approvedPharmacies = await ProviderApplication.find({
      _id: { $in: pharmacyIds },
      providerType: 'pharmacy',
      status: 'approved',
    }).select('_id expiresAt');
    const approvedIds = new Set(
      approvedPharmacies
        .filter((p) => !p.expiresAt || p.expiresAt.getTime() > Date.now())
        .map((p) => p._id.toString()),
    );
    visibleItems = items.filter((i) => approvedIds.has(i.pharmacyId.toString()));
  }

  return { items: visibleItems, meta: buildPaginationMeta(page, limit, total) };
}

export async function getMedicineById(medicineId: string): Promise<MedicineItemDoc> {
  const item = await MedicineItem.findOne({ _id: medicineId, isActive: true });
  if (!item) {
    throw AppError.notFound('Medicine not found');
  }
  await assertActivePharmacy(item.pharmacyId.toString());
  return item;
}

export async function findAlternatives(medicineId: string): Promise<MedicineItemDoc[]> {
  const reference = await getMedicineById(medicineId);

  const candidates = await MedicineItem.find({
    _id: { $ne: reference._id },
    activeIngredient: reference.activeIngredient,
    strength: reference.strength,
    dosageForm: reference.dosageForm,
    isActive: true,
    stockQuantity: { $gt: 0 },
  }).sort({ unitPrice: 1 });

  const pharmacyIds = [...new Set(candidates.map((c) => c.pharmacyId.toString()))];
  const approvedPharmacies = await ProviderApplication.find({
    _id: { $in: pharmacyIds },
    providerType: 'pharmacy',
    status: 'approved',
  }).select('_id expiresAt');
  const approvedIds = new Set(
    approvedPharmacies
      .filter((p) => !p.expiresAt || p.expiresAt.getTime() > Date.now())
      .map((p) => p._id.toString()),
  );

  return candidates.filter((c) => approvedIds.has(c.pharmacyId.toString()));
}
