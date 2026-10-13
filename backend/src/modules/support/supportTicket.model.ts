import { Schema, model, Types, type HydratedDocument } from 'mongoose';

export const TICKET_CATEGORIES = ['complaint', 'dispute', 'refund_request', 'general'] as const;
export const TICKET_STATUSES = ['open', 'in_progress', 'resolved', 'closed'] as const;
export const RELATED_ENTITY_TYPES = ['pharmacy_order', 'diagnostic_order', 'appointment', 'care_request'] as const;

const messageSchema = new Schema(
  {
    senderId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    body: { type: String, required: true, trim: true, maxlength: 2000 },
    sentAt: { type: Date, required: true, default: () => new Date() },
  },
  { _id: false },
);

const supportTicketSchema = new Schema(
  {
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    subject: { type: String, required: true, trim: true, maxlength: 160 },
    category: { type: String, enum: TICKET_CATEGORIES, required: true },
    relatedEntityType: { type: String, enum: RELATED_ENTITY_TYPES, default: null },
    relatedEntityId: { type: Schema.Types.ObjectId, default: null },
    description: { type: String, required: true, trim: true, maxlength: 2000 },
    status: { type: String, enum: TICKET_STATUSES, default: 'open', index: true },
    assignedTo: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    resolutionNote: { type: String, default: null, trim: true, maxlength: 2000 },
    messages: { type: [messageSchema], default: [] },
  },
  { timestamps: true },
);

export interface SupportTicketAttrs {
  _id: Types.ObjectId;
  createdBy: Types.ObjectId;
  subject: string;
  category: (typeof TICKET_CATEGORIES)[number];
  relatedEntityType: (typeof RELATED_ENTITY_TYPES)[number] | null;
  relatedEntityId: Types.ObjectId | null;
  description: string;
  status: (typeof TICKET_STATUSES)[number];
  assignedTo: Types.ObjectId | null;
  resolutionNote: string | null;
  messages: { senderId: Types.ObjectId; body: string; sentAt: Date }[];
  createdAt: Date;
  updatedAt: Date;
}

export type SupportTicketDoc = HydratedDocument<SupportTicketAttrs>;

export const SupportTicket = model<SupportTicketAttrs>('SupportTicket', supportTicketSchema);
