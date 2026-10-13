import { Schema, model, Types, type HydratedDocument } from 'mongoose';

export const AUDIT_ACTIONS = [
  'provider_application_transition',
  'delivery_partner_review',
  'support_ticket_status_change',
  'user_status_change',
  'commission_rule_updated',
  'transaction_settled',
] as const;

const auditLogSchema = new Schema(
  {
    actorId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    action: { type: String, enum: AUDIT_ACTIONS, required: true, index: true },
    targetType: { type: String, required: true },
    targetId: { type: Schema.Types.ObjectId, required: true },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

export interface AuditLogAttrs {
  _id: Types.ObjectId;
  actorId: Types.ObjectId;
  action: (typeof AUDIT_ACTIONS)[number];
  targetType: string;
  targetId: Types.ObjectId;
  metadata: Record<string, unknown>;
  createdAt: Date;
}

export type AuditLogDoc = HydratedDocument<AuditLogAttrs>;

export const AuditLog = model<AuditLogAttrs>('AuditLog', auditLogSchema);
