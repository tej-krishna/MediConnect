/**
 * Generates openapi.json directly from the same zod schemas that validate requests at runtime
 * (via zod v4's built-in z.toJSONSchema()), so the request-body/query documentation can never
 * silently drift from what the API actually accepts — unlike a hand-maintained spec, which can.
 * Route metadata (method, path, auth requirement, tag) is curated here because the Express routers
 * don't carry that information themselves; schemas are never retyped, only referenced.
 *
 * Run: npx tsx scripts/generate-openapi.ts
 */
import { z } from 'zod';
import { writeFileSync } from 'fs';
import path from 'path';

import { registerSchema, loginSchema, forgotPasswordSchema, resetPasswordSchema } from '../src/modules/auth/auth.validation';
import {
  createApplicationSchema,
  documentMetaSchema as providerDocumentMetaSchema,
  reportSchema,
  transitionSchema,
  updateListingInfoSchema,
  searchProvidersQuerySchema,
  setAvailabilitySchema,
  listApplicationsQuerySchema,
} from '../src/modules/providers/provider.validation';
import { inviteStaffSchema, createSlotSchema } from '../src/modules/scheduling/scheduling.validation';
import {
  createMedicineItemSchema,
  updateMedicineItemSchema,
  searchMedicinesQuerySchema,
  createOrderSchema,
  orderTransitionSchema,
} from '../src/modules/pharmacy/pharmacy.validation';
import {
  createTestSchema,
  updateTestSchema,
  searchTestsQuerySchema,
  createDiagnosticOrderSchema,
  diagnosticOrderTransitionSchema,
  createHealthCampSchema,
  searchCampsQuerySchema,
} from '../src/modules/diagnostics/diagnostics.validation';
import { createGuideSchema, updateGuideSchema } from '../src/modules/emergency/emergency.validation';
import {
  updateProfileSchema,
  documentMetaSchema as recordDocumentMetaSchema,
  createVisitSchema,
  updateVisitSchema,
  inviteCaregiverSchema,
} from '../src/modules/medicalRecords/medicalRecords.validation';
import {
  createCareOfferingSchema,
  updateCareOfferingSchema,
  searchCareOfferingsQuerySchema,
  createCareRequestSchema,
  careRequestTransitionSchema,
} from '../src/modules/homecare/homecare.validation';
import {
  applyDeliveryPartnerSchema,
  reviewDeliveryPartnerSchema,
  assignDeliveryPartnerSchema,
} from '../src/modules/delivery/delivery.validation';
import {
  createTicketSchema,
  addMessageSchema,
  updateTicketStatusSchema,
  listTicketsQuerySchema,
} from '../src/modules/support/support.validation';
import {
  listUsersQuerySchema,
  setUserStatusSchema,
  setCommissionRuleSchema,
  listAuditLogQuerySchema,
} from '../src/modules/admin/admin.validation';
import { initiateRefundSchema, settleTransactionSchema } from '../src/modules/payments/transaction.validation';

type Auth = 'none' | 'auth' | 'role';

interface RouteDef {
  method: 'get' | 'post' | 'patch' | 'delete';
  path: string;
  tag: string;
  summary: string;
  auth: Auth;
  roles?: string[];
  body?: z.ZodTypeAny;
  query?: z.ZodTypeAny;
  multipart?: string[];
  successStatus?: number;
  bodyRequired?: boolean;
}

const bookAppointmentBodySchema = z.object({ slotId: z.string().min(1) });
const mobileRefreshBodySchema = z.object({
  refreshToken: z
    .string()
    .optional()
    .describe('Required for a mobile client (no cookie jar); ignored if the HttpOnly refreshToken cookie is present, as it always is for the website.'),
});

const routes: RouteDef[] = [
  // Health
  { method: 'get', path: '/health', tag: 'Health', summary: 'Liveness/readiness check', auth: 'none' },

  // Auth
  { method: 'post', path: '/auth/register', tag: 'Auth', summary: 'Register a new patient account', auth: 'none', body: registerSchema, successStatus: 201 },
  {
    method: 'post',
    path: '/auth/login',
    tag: 'Auth',
    summary: 'Log in and receive an access token + refresh token',
    auth: 'none',
    body: loginSchema,
  },
  {
    method: 'post',
    path: '/auth/refresh',
    tag: 'Auth',
    summary: 'Exchange a refresh token for a new access token (rotates the refresh token)',
    auth: 'none',
    body: mobileRefreshBodySchema,
    bodyRequired: false,
  },
  {
    method: 'post',
    path: '/auth/logout',
    tag: 'Auth',
    summary: 'Revoke a refresh token',
    auth: 'none',
    body: mobileRefreshBodySchema,
    bodyRequired: false,
  },
  { method: 'post', path: '/auth/forgot-password', tag: 'Auth', summary: 'Request a password reset (always 200, never discloses whether the email exists)', auth: 'none', body: forgotPasswordSchema },
  { method: 'post', path: '/auth/reset-password', tag: 'Auth', summary: 'Reset password with a token; revokes every active session', auth: 'none', body: resetPasswordSchema },
  { method: 'get', path: '/auth/me', tag: 'Auth', summary: 'Get the current authenticated user', auth: 'auth' },

  // Providers — public discovery
  { method: 'get', path: '/providers/search', tag: 'Providers', summary: 'Public provider discovery (geo radius or city), only actively-verified providers', auth: 'none', query: searchProvidersQuerySchema },
  { method: 'get', path: '/providers/search/{id}', tag: 'Providers', summary: 'Public provider detail', auth: 'none' },
  // Providers — admin review
  { method: 'get', path: '/providers/admin', tag: 'Providers (admin)', summary: 'List provider applications for review', auth: 'role', roles: ['super_admin'], query: listApplicationsQuerySchema },
  { method: 'post', path: '/providers/admin/{id}/transition', tag: 'Providers (admin)', summary: 'Advance a provider application through its verification status machine', auth: 'role', roles: ['super_admin'], body: transitionSchema },
  // Providers — owner/applicant
  { method: 'post', path: '/providers/applications', tag: 'Providers', summary: 'Create a provider application (draft)', auth: 'auth', body: createApplicationSchema, successStatus: 201 },
  { method: 'get', path: '/providers/applications/mine', tag: 'Providers', summary: "List the caller's own provider applications", auth: 'auth' },
  { method: 'get', path: '/providers/applications/{id}', tag: 'Providers', summary: 'Get a provider application (owner or admin only)', auth: 'auth' },
  { method: 'patch', path: '/providers/applications/{id}/listing-info', tag: 'Providers', summary: 'Update public listing fields (fee, hours, location)', auth: 'auth', body: updateListingInfoSchema },
  { method: 'post', path: '/providers/applications/{id}/documents', tag: 'Providers', summary: 'Upload a verification document', auth: 'auth', body: providerDocumentMetaSchema, multipart: ['document'] },
  { method: 'get', path: '/providers/applications/{id}/documents/{documentId}/download', tag: 'Providers', summary: 'Download a verification document (owner or admin only)', auth: 'auth' },
  { method: 'post', path: '/providers/applications/{id}/submit', tag: 'Providers', summary: 'Submit a draft application for review', auth: 'auth' },
  { method: 'post', path: '/providers/applications/{id}/report', tag: 'Providers', summary: 'Report a provider application for suspicious/incorrect information', auth: 'auth', body: reportSchema },
  { method: 'patch', path: '/providers/applications/{id}/availability', tag: 'Providers', summary: 'Toggle live availability (ambulance providers only)', auth: 'auth', body: setAvailabilitySchema },
  { method: 'post', path: '/providers/applications/{id}/staff', tag: 'Providers', summary: 'Invite an existing user as staff (owner only)', auth: 'auth', body: inviteStaffSchema },
  { method: 'get', path: '/providers/applications/{id}/staff', tag: 'Providers', summary: 'List staff members (owner only)', auth: 'auth' },
  { method: 'delete', path: '/providers/applications/{id}/staff/{staffId}', tag: 'Providers', summary: 'Remove a staff member (owner only)', auth: 'auth' },
  { method: 'post', path: '/providers/staff/{staffId}/accept', tag: 'Providers', summary: 'Accept a staff invitation', auth: 'auth' },

  // Scheduling
  { method: 'post', path: '/providers/applications/{id}/slots', tag: 'Scheduling', summary: 'Create a bookable appointment slot (provider member only)', auth: 'auth', body: createSlotSchema, successStatus: 201 },
  { method: 'get', path: '/providers/applications/{id}/slots', tag: 'Scheduling', summary: 'List all slots for a provider, including past/full/cancelled (provider member only)', auth: 'auth' },
  { method: 'get', path: '/providers/applications/{id}/slots/available', tag: 'Scheduling', summary: 'List future, open, not-yet-full slots (any authenticated user)', auth: 'auth' },
  { method: 'delete', path: '/providers/applications/{id}/slots/{slotId}', tag: 'Scheduling', summary: 'Cancel a slot (blocked while it has active bookings)', auth: 'auth' },
  { method: 'get', path: '/providers/applications/{id}/appointments', tag: 'Scheduling', summary: 'List appointments for a provider (provider member only)', auth: 'auth' },
  { method: 'post', path: '/appointments', tag: 'Scheduling', summary: 'Book an appointment slot (atomic capacity reservation)', auth: 'auth', body: bookAppointmentBodySchema, successStatus: 201 },
  { method: 'post', path: '/appointments/{id}/cancel', tag: 'Scheduling', summary: 'Cancel an appointment (patient or provider member)', auth: 'auth' },
  { method: 'get', path: '/appointments/mine', tag: 'Scheduling', summary: "List the caller's own appointments", auth: 'auth' },

  // Pharmacy — public
  { method: 'get', path: '/medicines/search', tag: 'Pharmacy', summary: 'Public medicine search (text + optional city)', auth: 'none', query: searchMedicinesQuerySchema },
  { method: 'get', path: '/medicines/{id}', tag: 'Pharmacy', summary: 'Get a medicine item', auth: 'none' },
  { method: 'get', path: '/medicines/{id}/alternatives', tag: 'Pharmacy', summary: 'Find cheaper generic alternatives from other pharmacies', auth: 'none' },
  // Pharmacy — inventory
  { method: 'post', path: '/providers/applications/{id}/medicines', tag: 'Pharmacy', summary: 'Add a medicine to inventory (pharmacy member only)', auth: 'auth', body: createMedicineItemSchema, successStatus: 201 },
  { method: 'get', path: '/providers/applications/{id}/medicines', tag: 'Pharmacy', summary: "List a pharmacy's own inventory", auth: 'auth' },
  { method: 'patch', path: '/providers/applications/{id}/medicines/{medicineId}', tag: 'Pharmacy', summary: 'Update price/stock/prescription-required/active flag', auth: 'auth', body: updateMedicineItemSchema },
  { method: 'get', path: '/providers/applications/{id}/orders', tag: 'Pharmacy', summary: 'List orders for a pharmacy (pharmacy member only)', auth: 'auth' },
  // Pharmacy — orders
  { method: 'post', path: '/orders', tag: 'Pharmacy', summary: 'Place a medicine order (atomic stock reservation per line item)', auth: 'auth', body: createOrderSchema, successStatus: 201 },
  { method: 'get', path: '/orders/mine', tag: 'Pharmacy', summary: "List the caller's own orders", auth: 'auth' },
  { method: 'get', path: '/orders/my-deliveries', tag: 'Pharmacy', summary: 'List orders assigned to the caller as delivery partner', auth: 'auth' },
  { method: 'get', path: '/orders/{id}', tag: 'Pharmacy', summary: 'Get an order (patient or pharmacy member only)', auth: 'auth' },
  { method: 'post', path: '/orders/{id}/prescription', tag: 'Pharmacy', summary: 'Upload a prescription to unblock a pending_prescription order', auth: 'auth', multipart: ['prescription'] },
  { method: 'post', path: '/orders/{id}/transition', tag: 'Pharmacy', summary: 'Advance (or cancel) an order through its fulfillment status machine', auth: 'auth', body: orderTransitionSchema },
  { method: 'post', path: '/orders/{id}/assign-delivery-partner', tag: 'Pharmacy', summary: 'Assign an approved delivery partner to an order (pharmacy member only)', auth: 'auth', body: assignDeliveryPartnerSchema },

  // Diagnostics — public
  { method: 'get', path: '/diagnostic-tests/search', tag: 'Diagnostics', summary: 'Public diagnostic test search', auth: 'none', query: searchTestsQuerySchema },
  { method: 'get', path: '/diagnostic-tests/{id}', tag: 'Diagnostics', summary: 'Get a diagnostic test', auth: 'none' },
  { method: 'get', path: '/health-camps/search', tag: 'Diagnostics', summary: 'Public health camp search (geo radius or city)', auth: 'none', query: searchCampsQuerySchema },
  { method: 'get', path: '/health-camps/{id}', tag: 'Diagnostics', summary: 'Get a health camp', auth: 'none' },
  // Diagnostics — lab catalogue
  { method: 'post', path: '/providers/applications/{id}/diagnostic-tests', tag: 'Diagnostics', summary: 'Add a test to a lab catalogue (lab member only)', auth: 'auth', body: createTestSchema, successStatus: 201 },
  { method: 'get', path: '/providers/applications/{id}/diagnostic-tests', tag: 'Diagnostics', summary: "List a lab's own test catalogue", auth: 'auth' },
  { method: 'patch', path: '/providers/applications/{id}/diagnostic-tests/{testId}', tag: 'Diagnostics', summary: 'Update a catalogue test', auth: 'auth', body: updateTestSchema },
  { method: 'get', path: '/providers/applications/{id}/diagnostic-orders', tag: 'Diagnostics', summary: 'List bookings for a lab (lab member only)', auth: 'auth' },
  // Diagnostics — health camps (provider side)
  { method: 'post', path: '/providers/applications/{id}/health-camps', tag: 'Diagnostics', summary: 'Schedule a health camp (mobile van operator or NGO coordinator)', auth: 'auth', body: createHealthCampSchema, successStatus: 201 },
  { method: 'get', path: '/providers/applications/{id}/health-camps', tag: 'Diagnostics', summary: "List a provider's own scheduled camps", auth: 'auth' },
  { method: 'delete', path: '/providers/applications/{id}/health-camps/{campId}', tag: 'Diagnostics', summary: 'Cancel a scheduled camp', auth: 'auth' },
  // Diagnostics — orders
  { method: 'post', path: '/diagnostic-orders', tag: 'Diagnostics', summary: 'Book one or more diagnostic tests at a lab', auth: 'auth', body: createDiagnosticOrderSchema, successStatus: 201 },
  { method: 'get', path: '/diagnostic-orders/mine', tag: 'Diagnostics', summary: "List the caller's own diagnostic orders", auth: 'auth' },
  { method: 'get', path: '/diagnostic-orders/{id}', tag: 'Diagnostics', summary: 'Get a diagnostic order (patient or lab member only)', auth: 'auth' },
  { method: 'post', path: '/diagnostic-orders/{id}/transition', tag: 'Diagnostics', summary: 'Advance (or cancel) a diagnostic order through its status machine', auth: 'auth', body: diagnosticOrderTransitionSchema },
  { method: 'post', path: '/diagnostic-orders/{id}/report', tag: 'Diagnostics', summary: 'Upload the finished report', auth: 'auth', multipart: ['report'] },
  { method: 'get', path: '/diagnostic-orders/{id}/report/download', tag: 'Diagnostics', summary: 'Download the report (patient or lab member only)', auth: 'auth' },
  // Diagnostics — camp registration (patient side)
  { method: 'post', path: '/health-camps/{id}/register', tag: 'Diagnostics', summary: 'Register for a health camp (atomic capacity reservation)', auth: 'auth', successStatus: 201 },
  { method: 'post', path: '/health-camps/{id}/cancel-registration', tag: 'Diagnostics', summary: 'Cancel a camp registration', auth: 'auth' },
  { method: 'get', path: '/health-camps/registrations/mine', tag: 'Diagnostics', summary: "List the caller's own camp registrations", auth: 'auth' },

  // Emergency
  { method: 'get', path: '/emergency/guides', tag: 'Emergency', summary: 'Public red-flag symptom guidance (no login required)', auth: 'none' },
  { method: 'get', path: '/emergency/admin/guides', tag: 'Emergency (admin)', summary: 'List every guide, including inactive', auth: 'role', roles: ['super_admin'] },
  { method: 'post', path: '/emergency/admin/guides', tag: 'Emergency (admin)', summary: 'Create a guide', auth: 'role', roles: ['super_admin'], body: createGuideSchema, successStatus: 201 },
  { method: 'patch', path: '/emergency/admin/guides/{id}', tag: 'Emergency (admin)', summary: 'Update a guide (including the clinicallyReviewed flag)', auth: 'role', roles: ['super_admin'], body: updateGuideSchema },
  { method: 'delete', path: '/emergency/admin/guides/{id}', tag: 'Emergency (admin)', summary: 'Delete a guide', auth: 'role', roles: ['super_admin'] },

  // Medical records
  { method: 'post', path: '/medical-records/caregivers', tag: 'Medical Records', summary: 'Invite an existing user as a caregiver with a chosen scope set', auth: 'auth', body: inviteCaregiverSchema, successStatus: 201 },
  { method: 'get', path: '/medical-records/caregivers', tag: 'Medical Records', summary: "List caregivers the caller has granted access to", auth: 'auth' },
  { method: 'post', path: '/medical-records/caregivers/{grantId}/revoke', tag: 'Medical Records', summary: 'Revoke a caregiver grant', auth: 'auth' },
  { method: 'get', path: '/medical-records/caregiver-invites', tag: 'Medical Records', summary: 'List pending invites addressed to the caller', auth: 'auth' },
  { method: 'post', path: '/medical-records/caregiver-invites/{grantId}/accept', tag: 'Medical Records', summary: 'Accept a caregiver invite', auth: 'auth' },
  { method: 'post', path: '/medical-records/caregiver-invites/{grantId}/decline', tag: 'Medical Records', summary: 'Decline a caregiver invite', auth: 'auth' },
  { method: 'get', path: '/medical-records/{patientId}/profile', tag: 'Medical Records', summary: 'Get a medical profile — patientId is "me" or a patient the caller has a grant for', auth: 'auth' },
  { method: 'patch', path: '/medical-records/{patientId}/profile', tag: 'Medical Records', summary: 'Update a medical profile', auth: 'auth', body: updateProfileSchema },
  { method: 'post', path: '/medical-records/{patientId}/documents', tag: 'Medical Records', summary: 'Upload a medical document', auth: 'auth', body: recordDocumentMetaSchema, multipart: ['document'], successStatus: 201 },
  { method: 'get', path: '/medical-records/{patientId}/documents', tag: 'Medical Records', summary: 'List medical documents', auth: 'auth' },
  { method: 'get', path: '/medical-records/{patientId}/documents/{documentId}/download', tag: 'Medical Records', summary: 'Download a medical document', auth: 'auth' },
  { method: 'delete', path: '/medical-records/{patientId}/documents/{documentId}', tag: 'Medical Records', summary: 'Delete a medical document (patient only, even for a manage_profile caregiver)', auth: 'auth' },
  { method: 'post', path: '/medical-records/{patientId}/visits', tag: 'Medical Records', summary: 'Log a visit record', auth: 'auth', body: createVisitSchema, successStatus: 201 },
  { method: 'get', path: '/medical-records/{patientId}/visits', tag: 'Medical Records', summary: 'List visit records', auth: 'auth' },
  { method: 'patch', path: '/medical-records/{patientId}/visits/{visitId}', tag: 'Medical Records', summary: 'Update a visit record', auth: 'auth', body: updateVisitSchema },
  { method: 'delete', path: '/medical-records/{patientId}/visits/{visitId}', tag: 'Medical Records', summary: 'Delete a visit record (patient only)', auth: 'auth' },
  { method: 'get', path: '/medical-records/{patientId}/access-log', tag: 'Medical Records', summary: "View who (besides the patient) has accessed these records — patient only", auth: 'auth' },

  // Home care / equipment
  { method: 'get', path: '/offerings/search', tag: 'Home Care', summary: 'Public search of equipment/home-visit offerings', auth: 'none', query: searchCareOfferingsQuerySchema },
  { method: 'get', path: '/offerings/{id}', tag: 'Home Care', summary: 'Get an offering', auth: 'none' },
  { method: 'post', path: '/providers/applications/{id}/offerings', tag: 'Home Care', summary: 'Create an offering (equipment_provider member only)', auth: 'auth', body: createCareOfferingSchema, successStatus: 201 },
  { method: 'get', path: '/providers/applications/{id}/offerings', tag: 'Home Care', summary: "List a provider's own offerings", auth: 'auth' },
  { method: 'patch', path: '/providers/applications/{id}/offerings/{offeringId}', tag: 'Home Care', summary: 'Update an offering', auth: 'auth', body: updateCareOfferingSchema },
  { method: 'get', path: '/providers/applications/{id}/care-requests', tag: 'Home Care', summary: 'List requests against a provider', auth: 'auth' },
  { method: 'post', path: '/care-requests', tag: 'Home Care', summary: 'Request equipment rental/purchase or a home-visit service', auth: 'auth', body: createCareRequestSchema, successStatus: 201 },
  { method: 'get', path: '/care-requests/mine', tag: 'Home Care', summary: "List the caller's own requests", auth: 'auth' },
  { method: 'get', path: '/care-requests/{id}', tag: 'Home Care', summary: 'Get a request', auth: 'auth' },
  { method: 'post', path: '/care-requests/{id}/transition', tag: 'Home Care', summary: 'Advance (or cancel) a request through its status machine', auth: 'auth', body: careRequestTransitionSchema },

  // Delivery partners
  { method: 'post', path: '/delivery-partners/apply', tag: 'Delivery Partners', summary: 'Apply to become a delivery partner (role granted only on admin approval)', auth: 'auth', body: applyDeliveryPartnerSchema, successStatus: 201 },
  { method: 'get', path: '/delivery-partners/me', tag: 'Delivery Partners', summary: "Get the caller's own application", auth: 'auth' },
  { method: 'get', path: '/delivery-partners/directory', tag: 'Delivery Partners', summary: 'List approved delivery partners (any authenticated user — used by pharmacies to assign)', auth: 'auth' },
  { method: 'get', path: '/delivery-partners', tag: 'Delivery Partners', summary: 'List all applications', auth: 'role', roles: ['super_admin', 'support'] },
  { method: 'post', path: '/delivery-partners/{id}/review', tag: 'Delivery Partners', summary: 'Approve/reject/suspend an application', auth: 'role', roles: ['super_admin'], body: reviewDeliveryPartnerSchema },

  // Support tickets
  { method: 'post', path: '/support/tickets', tag: 'Support', summary: 'Create a support ticket', auth: 'auth', body: createTicketSchema, successStatus: 201 },
  { method: 'get', path: '/support/tickets/mine', tag: 'Support', summary: "List the caller's own tickets", auth: 'auth' },
  { method: 'get', path: '/support/tickets/admin', tag: 'Support', summary: 'List every ticket (staff only)', auth: 'role', roles: ['support', 'super_admin'], query: listTicketsQuerySchema },
  { method: 'get', path: '/support/tickets/{id}', tag: 'Support', summary: 'Get a ticket (creator or staff only)', auth: 'auth' },
  { method: 'post', path: '/support/tickets/{id}/messages', tag: 'Support', summary: 'Add a message to a ticket', auth: 'auth', body: addMessageSchema },
  { method: 'post', path: '/support/tickets/{id}/status', tag: 'Support', summary: 'Assign/triage/resolve/close/reopen a ticket (staff only)', auth: 'role', roles: ['support', 'super_admin'], body: updateTicketStatusSchema },
  { method: 'post', path: '/support/tickets/{id}/refund', tag: 'Support', summary: 'Open a manual-review refund against a refund_request ticket (staff only)', auth: 'role', roles: ['support', 'super_admin'], body: initiateRefundSchema, successStatus: 201 },

  // Admin
  { method: 'get', path: '/admin/users', tag: 'Admin', summary: 'List/search users', auth: 'role', roles: ['super_admin'], query: listUsersQuerySchema },
  { method: 'patch', path: '/admin/users/{id}/status', tag: 'Admin', summary: 'Suspend or reactivate a user (revokes sessions on suspend)', auth: 'role', roles: ['super_admin'], body: setUserStatusSchema },
  { method: 'get', path: '/admin/commission-rules', tag: 'Admin', summary: 'List commission rules by provider type', auth: 'role', roles: ['super_admin'] },
  { method: 'patch', path: '/admin/commission-rules/{providerType}', tag: 'Admin', summary: 'Set the commission percentage for a provider type', auth: 'role', roles: ['super_admin'], body: setCommissionRuleSchema },
  { method: 'get', path: '/admin/analytics/overview', tag: 'Admin', summary: 'Revenue, commission, booking-volume and moderation-queue overview', auth: 'role', roles: ['super_admin'] },
  { method: 'get', path: '/admin/audit-log', tag: 'Admin', summary: 'List recorded admin/staff decisions', auth: 'role', roles: ['super_admin'], query: listAuditLogQuerySchema },
  { method: 'get', path: '/admin/transactions', tag: 'Admin', summary: 'List refund transactions', auth: 'role', roles: ['super_admin'] },
  { method: 'post', path: '/admin/transactions/{id}/settle', tag: 'Admin', summary: 'Mark a pending refund completed or rejected', auth: 'role', roles: ['super_admin'], body: settleTransactionSchema },
];

function toJsonSchema(schema: z.ZodTypeAny) {
  return z.toJSONSchema(schema, {
    target: 'draft-7',
    unrepresentable: 'any',
    // z.coerce.date() (preferredDate, expiresAt, visitDate, ...) has no native JSON Schema
    // representation and throws by default; every one of these fields is sent over the wire as an
    // ISO date-time string, so that's what the docs should say, not an empty/unrepresentable schema.
    override: (ctx) => {
      const def = (ctx.zodSchema as unknown as { _zod?: { def?: { type?: string } } })._zod?.def;
      if (def?.type === 'date') {
        ctx.jsonSchema.type = 'string';
        ctx.jsonSchema.format = 'date-time';
      }
    },
  });
}

function pathParams(expressPath: string) {
  const matches = [...expressPath.matchAll(/\{([a-zA-Z0-9_]+)\}/g)];
  return matches.map((m) => ({
    name: m[1],
    in: 'path',
    required: true,
    schema: { type: 'string' },
  }));
}

function queryParams(schema?: z.ZodTypeAny) {
  if (!schema) return [];
  const json = toJsonSchema(schema) as { properties?: Record<string, unknown>; required?: string[] };
  const required = new Set(json.required ?? []);
  return Object.entries(json.properties ?? {}).map(([name, s]) => ({
    name,
    in: 'query',
    required: required.has(name),
    schema: s,
  }));
}

const paths: Record<string, Record<string, unknown>> = {};

for (const r of routes) {
  paths[r.path] ??= {};
  const parameters = [...pathParams(r.path), ...queryParams(r.query)];

  const responses: Record<string, unknown> = {
    [String(r.successStatus ?? 200)]: { description: 'Success' },
  };
  if (r.body || r.query) responses['400'] = { description: 'Validation failed' };
  if (r.auth !== 'none') responses['401'] = { description: 'Missing or invalid access token' };
  if (r.auth === 'role') responses['403'] = { description: 'Caller lacks the required role' };

  const operation: Record<string, unknown> = {
    tags: [r.tag],
    summary: r.summary,
    ...(parameters.length ? { parameters } : {}),
    responses,
  };

  if (r.auth !== 'none') {
    operation.security = [{ bearerAuth: [] }];
  }
  if (r.roles) {
    operation.description = `Requires role: ${r.roles.join(' or ')}.`;
  }

  if (r.multipart) {
    const bodyProps: Record<string, unknown> = {};
    for (const field of r.multipart) {
      bodyProps[field] = { type: 'string', format: 'binary' };
    }
    if (r.body) {
      const json = toJsonSchema(r.body) as { properties?: Record<string, unknown>; required?: string[] };
      Object.assign(bodyProps, json.properties ?? {});
      operation.requestBody = {
        required: true,
        content: {
          'multipart/form-data': {
            schema: { type: 'object', properties: bodyProps, required: [...r.multipart, ...(json.required ?? [])] },
          },
        },
      };
    } else {
      operation.requestBody = {
        required: true,
        content: { 'multipart/form-data': { schema: { type: 'object', properties: bodyProps, required: r.multipart } } },
      };
    }
  } else if (r.body) {
    operation.requestBody = {
      required: r.bodyRequired ?? true,
      content: { 'application/json': { schema: toJsonSchema(r.body) } },
    };
  }

  paths[r.path][r.method] = operation;
}

const spec = {
  openapi: '3.0.3',
  info: {
    title: 'MediConnect API',
    version: '1.0.0',
    description:
      'REST API shared by the MediConnect website and (Phase 14+) Flutter mobile app. Generated from the ' +
      'same zod validation schemas that run at request time — see scripts/generate-openapi.ts. Every ' +
      'authenticated route takes a bearer access token obtained from /auth/login or /auth/refresh. ' +
      'For the website, the refresh token travels only as an HttpOnly cookie scoped to /api/v1/auth, never ' +
      'in a JSON body. A native app has no cookie jar, so sending the header `X-Client-Platform: mobile` on ' +
      '/auth/login and /auth/refresh additionally returns the raw refresh token in the JSON body (store it ' +
      'in platform secure storage, e.g. Keychain/Keystore — never plain storage); /auth/refresh and ' +
      '/auth/logout then also accept `{ "refreshToken": "..." }` in the body as a fallback when no cookie is ' +
      'present. CORS (CORS_ORIGIN) only restricts browser-based callers — it has no effect on a native ' +
      'mobile app\'s HTTP requests, which are never subject to the same-origin policy a browser enforces.',
  },
  servers: [{ url: 'http://localhost:5000/api/v1', description: 'Local development' }],
  components: {
    securitySchemes: {
      bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
    },
  },
  paths,
};

const outPath = path.resolve(__dirname, '../openapi.json');
writeFileSync(outPath, JSON.stringify(spec, null, 2));
console.log(`Wrote ${Object.keys(paths).length} paths (${routes.length} operations) to ${outPath}`);
