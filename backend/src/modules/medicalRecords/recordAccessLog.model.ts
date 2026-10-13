import { Schema, model, Types, type HydratedDocument } from 'mongoose';

export const ACCESS_ACTIONS = [
  'view_profile',
  'edit_profile',
  'view_documents',
  'download_document',
  'view_visits',
] as const;

const recordAccessLogSchema = new Schema({
  patientId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  accessedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  action: { type: String, enum: ACCESS_ACTIONS, required: true },
  timestamp: { type: Date, default: () => new Date() },
});

export interface RecordAccessLogAttrs {
  _id: Types.ObjectId;
  patientId: Types.ObjectId;
  accessedBy: Types.ObjectId;
  action: (typeof ACCESS_ACTIONS)[number];
  timestamp: Date;
}

export type RecordAccessLogDoc = HydratedDocument<RecordAccessLogAttrs>;

export const RecordAccessLog = model<RecordAccessLogAttrs>('RecordAccessLog', recordAccessLogSchema);
