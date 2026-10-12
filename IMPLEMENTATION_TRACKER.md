# MediConnect Implementation Tracker

Status legend: `[ ]` pending · `[x]` done and verified · `[!]` blocked

A task is marked `[x]` only after its code, tests, and manual verification all pass. See
`ARCHITECTURE.md` for the decisions behind these choices and `README.md` for how to run each
package.

**Current phase: Phase 1 — Backend Foundation**
**Next task: 1.1 — Express app skeleton with health endpoint, env config, and graceful shutdown**

---

## Phase 0 — Project Setup and Repository Audit

- [x] 0.1 — Inspect repository and environment; confirm tooling (Node v24.19.0, npm 11.17.0, git 2.36.1). Repository was empty, so a fresh monorepo was scaffolded.
- [x] 0.2 — Create `frontend/` (React + TypeScript + Vite) and `backend/` (Node + Express + TypeScript) packages with the agreed folder structure (`src/config`, `src/modules`, `src/middleware`, `src/services`, `src/storage`, `src/utils`, `src/routes` in backend; `src/app`, `src/components`, `src/features`, `src/pages`, `src/layouts`, `src/hooks`, `src/services`, `src/types`, `src/utils` in frontend).
- [x] 0.3 — Add `IMPLEMENTATION_TRACKER.md`, `ARCHITECTURE.md`, `README.md`, `.gitignore`, and per-package `.env.example` files.

**Evidence:**
- Backend: `npx tsc --noEmit` passes; `npm run build` produces `dist/server.js`; `node dist/server.js` and `npx tsx src/server.ts` both log `MediConnect backend listening on port 5000`; `npx vitest run` → 1/1 test passing (`backend/tests/app.test.ts`); `npm run lint` (ESLint flat config) clean.
- Frontend: `npm run build` (tsc -b && vite build) succeeds; `npm run lint` (oxlint) clean; `npx vite` starts and serves on localhost.
- Git repository initialized at the project root.

**Known issues:** none.

---

## Phase 1 — Backend Foundation

- [ ] 1.1 — Express app (`src/app.ts`) + server entry (`src/server.ts`): MongoDB connection via Mongoose, graceful shutdown, `GET /api/v1/health`.
- [ ] 1.2 — Centralized request validation (zod) and centralized error-handling middleware with request IDs and structured logging (winston).
- [ ] 1.3 — Security headers (helmet), CORS configuration, rate limiting (express-rate-limit); isolated test-database strategy (mongodb-memory-server) and consistent paginated-response convention.

## Phase 2 — Authentication and Authorization

- [ ] 2.1 — Registration, login, logout; password hashing (bcryptjs); account status and lockout controls.
- [ ] 2.2 — Short-lived access tokens + refresh-token rotation and revocation; secure session handling (HttpOnly cookies) on the frontend.
- [ ] 2.3 — Password reset flow with expiry/abuse protection; role-based authorization middleware; auth test coverage (permitted vs. forbidden operations).

## Phase 3 — Provider Registration and Verification

- [ ] 3.1 — Provider application model + document upload; application status machine (draft/submitted/under_review/approved/rejected/suspended/expired).
- [ ] 3.2 — Admin review queue with recorded decisions, audit history, verification expiry/renewal reminders.
- [ ] 3.3 — Duplicate-registration and suspicious-profile detection; report-provider and suspend-provider workflows.

## Phase 4 — React Website Foundation and Patient Discovery

- [ ] 4.1 — Landing, auth, and static pages (contact/help/privacy/terms) with the shared design system.
- [ ] 4.2 — Nearby-provider discovery: location permission + manual fallback, search, filters, sort by distance.
- [ ] 4.3 — Provider listing/detail pages wired to real persisted data; loading/empty/offline/error states.

## Phase 5 — Doctor, Hospital and Clinic Workflows

- [ ] 5.1 — Provider dashboards; organization/facility profile and staff membership permissions.
- [ ] 5.2 — Consultation fees, working hours, appointment slots and availability management.
- [ ] 5.3 — Appointment booking/cancel/reschedule with duplicate-booking and race-condition handling.

## Phase 6 — Pharmacy and Medicine Services

- [ ] 6.1 — Pharmacy inventory and medicine search/availability.
- [ ] 6.2 — Prescription upload (private access) and order placement with stock validation.
- [ ] 6.3 — Price comparison and generic-alternative suggestions (for pharmacist/clinician review, never auto-substituted).

## Phase 7 — Diagnostics, Radiology and Mobile Medical Vans

- [ ] 7.1 — Diagnostic test catalogue with transparent prices; lab appointment booking.
- [ ] 7.2 — Home sample collection requests, staff assignment, status tracking; secure report upload/access.
- [ ] 7.3 — Mobile medical van schedules and village health-camp registration.

## Phase 8 — Emergency Support and Smart Care Routing

- [ ] 8.1 — Emergency-access UI: nearest verified providers, ambulance contacts, one-tap call/directions.
- [ ] 8.2 — Fee estimates, opening status, availability-freshness indicators; emergency escalation when local providers are unavailable.
- [ ] 8.3 — Clinician-reviewed symptom guidance with safe red-flag escalation (no self-diagnosis, no fabricated dispatch/tracking).

## Phase 9 — Medical Records and Caregiver Access

- [ ] 9.1 — Patient medical history, allergies, medications, prescriptions, reports, visit history.
- [ ] 9.2 — Caregiver invitations with explicit consent, scoped access, expiry and revocation.
- [ ] 9.3 — Audit logs for sensitive-record access; data correction/deletion workflows.

## Phase 10 — Additional Healthcare Services

- [ ] 10.1 — Medical equipment rental/purchase; home nursing/physiotherapy booking.
- [ ] 10.2 — Ambulance provider dashboards; medicine delivery assignment/confirmation.
- [ ] 10.3 — NGO/health-camp coordination; customer support, disputes, complaints, refunds.

## Phase 11 — Admin, Revenue and Platform Operations

- [ ] 11.1 — Super admin dashboard; user/provider moderation; verification review and expiry management.
- [ ] 11.2 — Booking/order analytics; configurable commission rules; payment-provider adapter with verified webhooks.
- [ ] 11.3 — Refund/transaction handling; notification service abstraction; audit logs and monitoring.

## Phase 12 — Website Quality and Production Readiness

- [ ] 12.1 — Full unit/integration/E2E test coverage for critical journeys; auth regression tests.
- [ ] 12.2 — Responsive/accessibility checks; DB index and query-performance checks; rate-limit/abuse tests.
- [ ] 12.3 — Environment/secret management review; production build, deployment, backup/recovery docs; security and privacy review.

## Phase 13 — Stabilize APIs for Flutter

- [ ] 13.1 — Finalize REST contracts and OpenAPI documentation.
- [ ] 13.2 — Confirm every mobile-required workflow has authenticated, paginated, validated APIs.
- [ ] 13.3 — API compatibility/regression tests; CORS and web/mobile auth configuration documented.

## Phase 14 — Flutter Mobile Application

- [ ] 14.1 — Flutter project setup, API client, auth/token refresh/logout, secure token storage.
- [ ] 14.2 — Core patient journeys: discovery, listings, booking, emergency quick actions.
- [ ] 14.3 — Pharmacy/diagnostics/medical-records/caregiver flows; offline/retry/network-error handling.

## Phase 15 — Mobile Release and Final Validation

- [ ] 15.1 — Device/emulator testing; permission and secure-storage review.
- [ ] 15.2 — API-failure/token-expiry/interrupted-upload testing; release APK/AAB build with verified artifact path.
- [ ] 15.3 — Final tested-features/limitations/outstanding-work report.
