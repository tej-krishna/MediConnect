import { Types } from 'mongoose';
import { AppError } from '../../utils/AppError';
import { storage } from '../../storage';
import { assertAccess, logAccess } from './medicalRecords.access';
import { MedicalDocument, type MedicalDocumentDoc } from './medicalDocument.model';
import type { z } from 'zod';
import type { documentMetaSchema } from './medicalRecords.validation';

type DocumentMeta = z.infer<typeof documentMetaSchema>;

export async function uploadDocument(
  patientId: string,
  requesterId: string,
  meta: DocumentMeta,
  file: { buffer: Buffer; originalname: string; mimetype: string },
): Promise<MedicalDocumentDoc> {
  // Uploading is "managing" the record, so it uses the same scope as profile edits — a caregiver
  // who can only view shouldn't be able to add documents to someone else's record.
  await assertAccess(patientId, requesterId, 'manage_profile');

  const stored = await storage.save({
    buffer: file.buffer,
    originalFilename: file.originalname,
    mimeType: file.mimetype,
  });

  return MedicalDocument.create({
    patientId,
    uploadedBy: requesterId,
    documentType: meta.documentType,
    title: meta.title,
    visitDate: meta.visitDate ?? null,
    storageKey: stored.storageKey,
    originalFilename: file.originalname,
    mimeType: file.mimetype,
    sizeBytes: stored.size,
  });
}

export async function listDocuments(patientId: string, requesterId: string): Promise<MedicalDocumentDoc[]> {
  await assertAccess(patientId, requesterId, 'view_documents');
  await logAccess(patientId, requesterId, 'view_documents');
  return MedicalDocument.find({ patientId }).sort({ createdAt: -1 });
}

export async function downloadDocument(patientId: string, documentId: string, requesterId: string) {
  await assertAccess(patientId, requesterId, 'view_documents');
  const doc = await MedicalDocument.findOne({ _id: documentId, patientId });
  if (!doc) {
    throw AppError.notFound('Document not found');
  }
  await logAccess(patientId, requesterId, 'download_document');
  const buffer = await storage.read(doc.storageKey);
  return { buffer, document: doc };
}

export async function deleteDocument(patientId: string, documentId: string, requesterId: string): Promise<void> {
  // Deletion is patient-only — not even a "manage_profile" caregiver can delete another person's
  // health records, only add to them.
  if (patientId !== requesterId) {
    throw AppError.forbidden();
  }
  const doc = await MedicalDocument.findOne({ _id: documentId, patientId: new Types.ObjectId(patientId) });
  if (!doc) {
    throw AppError.notFound('Document not found');
  }
  await storage.delete(doc.storageKey);
  await doc.deleteOne();
}
