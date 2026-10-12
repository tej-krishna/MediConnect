# MediConnect Implementation Tracker

Status legend: `[ ]` pending · `[x]` done and verified · `[!]` blocked

A task is marked `[x]` only after its code, tests, and manual verification all pass. See
`ARCHITECTURE.md` for the decisions behind these choices and `README.md` for how to run each
package.

**Current phase: Phase 5 — Doctor, Hospital and Clinic Workflows**
**Next task: 5.1 — Provider dashboards; organization/facility profile and staff membership permissions**

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

- [x] 1.1 — Express app (`src/app.ts`) + server entry (`src/server.ts`): env validation (`src/config/env.ts`, zod), MongoDB connection via Mongoose (`src/config/db.ts`), graceful shutdown, `GET /api/v1/health` (`src/modules/health/health.routes.ts`) reporting live DB connection state.
- [x] 1.2 — Centralized request validation (zod `ZodError` branch) and centralized error-handling middleware (`src/middleware/errorHandler.ts`, `src/utils/AppError.ts`) with request IDs (`src/middleware/requestId.ts`) and structured logging (`src/utils/logger.ts`, winston + morgan).
- [x] 1.3 — Security headers (helmet), CORS from `CORS_ORIGIN` env, rate limiting (express-rate-limit) on `/api/v1`; isolated test-database strategy via `mongodb-memory-server` (`tests/globalSetup.ts`) and a shared response/pagination convention (`src/utils/response.ts`).

**Evidence:**
- `npm run typecheck` and `npm run build` pass (split `tsconfig.json`/`tsconfig.build.json` so build only emits `src`, while typecheck also covers `tests`).
- `npm run lint` clean (0 errors, 0 warnings).
- `npx vitest run` → 2 files / 3 tests passing: `tests/app.test.ts` (app factory) and `tests/health.test.ts` (health endpoint reports `database: "connected"` against a real `mongodb-memory-server` instance spun up in `globalSetup.ts`; unknown route returns structured 404).
- Manual end-to-end smoke test: started a throwaway `mongodb-memory-server` instance, ran `npx tsx src/server.ts` against its real URI, and confirmed via `curl`: `GET /api/v1/health` → `200 {"success":true,"data":{"status":"ok","database":"connected",...}}`; `GET /api/v1/does-not-exist` → `404` with structured error body; structured request-logged lines (with request IDs) appeared in the server log for both. Throwaway processes were torn down afterward.

**Known issues:** none. Developers still need a real MongoDB instance (local install, Docker, or Atlas) for day-to-day `npm run dev`; automated tests do not depend on one since they use `mongodb-memory-server`.

## Phase 2 — Authentication and Authorization

- [x] 2.1 — Registration (`POST /auth/register`, patient-only self-signup — any `role` field in the request body is ignored, never trusted), login (`POST /auth/login`), logout (`POST /auth/logout`); password hashing via bcryptjs (12 salt rounds); account lockout after 5 failed attempts (15 min lock, `423 ACCOUNT_LOCKED`) and `suspended` status support.
- [x] 2.2 — Short-lived JWT access tokens (`src/modules/auth/jwt.ts`) + opaque, DB-tracked refresh tokens with rotation and reuse detection (`src/modules/auth/auth.service.ts`, `refreshToken.model.ts`): each refresh revokes the old token and issues a new one; presenting an already-revoked token revokes the user's entire session set. Refresh token is set as an `HttpOnly`/`SameSite=Lax` cookie scoped to `/api/v1/auth`; access token is returned in the JSON body for the client to hold in memory.
- [x] 2.3 — Password reset flow (`POST /auth/forgot-password`, `POST /auth/reset-password`) with a 30-minute token expiry, single-use tokens, no email-existence disclosure, and full session revocation on reset; role-based authorization middleware (`src/middleware/auth.ts` — `requireAuth`, `requireRole`); auth test coverage across 4 test files (register/login/refresh/logout, lockout, password reset, and middleware permitted-vs-forbidden cases).

**Evidence:**
- `npm run typecheck`, `npm run build`, and `npm run lint` all pass with 0 errors/warnings.
- `npx vitest run` → 19/19 tests passing across 6 files, including: duplicate-email 409, invalid-payload 400, generic "Invalid email or password" for both wrong-password and unknown-email (no user enumeration), full register→login→/auth/me→refresh→logout flow, refresh-token reuse triggering full session revocation, account lockout after 5 failed attempts, forgot/reset-password (captured via a spy on `notificationService` rather than a real mailbox) including post-reset session revocation and old-password rejection, and `requireAuth`/`requireRole` 401/403/200 cases on a minimal standalone app.
- Self-registration explicitly verified to ignore a client-supplied `role: "super_admin"` and always assign `["patient"]`.

**Known issues / deferred:** Frontend session handling (storing the access token, calling `/auth/refresh`, protected routes) is deferred to Phase 4, where real pages first exist to wire it against and verify end-to-end — building that context now, with nothing to protect yet, would be unverifiable. Password-reset email delivery has no real provider configured; `src/services/notification.service.ts` documents this and currently only logs (see ARCHITECTURE.md).

## Phase 3 — Provider Registration and Verification

- [x] 3.1 — `ProviderApplication` model (`src/modules/providers/provider.model.ts`) covering 10 provider types (doctor, hospital, clinic, pharmacy, diagnostic_lab, ambulance_provider, equipment_provider, mobile_van_operator, ngo_coordinator, insurance_provider); document upload via a storage-adapter seam (`src/storage/` — local disk today, server-generated UUID filenames, never served statically) behind `multer` memory-storage with MIME/size restrictions; full `draft → submitted → under_review → approved/rejected`, `approved ⇄ suspended`, `approved → expired` status machine enforced server-side (`provider.types.ts: ALLOWED_TRANSITIONS`), not just by the schema enum.
- [x] 3.2 — Admin review queue (`GET /providers/admin`, filterable by status/providerType, paginated) with every decision recorded in `statusHistory` (status, actor, timestamp, reason) — a real audit trail, not just the current status; `approve` sets `verifiedAt`/`expiresAt` (default 1-year validity, admin-overridable) and grants the corresponding `User` role via `$addToSet` (the only other path besides initial patient self-registration that can add a role, and it's entirely admin-gated); `isActivelyVerified()` computes current trust status from `status` + `expiresAt` at read time rather than relying on a background job that doesn't exist; `mark_expired` is an explicit admin-triggered transition for bookkeeping once real past-expiry data exists.
- [x] 3.3 — Duplicate detection blocks a second user from claiming an already-active (`submitted`/`under_review`/`approved`) `(providerType, registrationNumber)` pair, and blocks a user from opening a second in-progress application of the same provider type; a documented heuristic (shared contact phone/email with a different user's application) soft-flags new applications for admin attention without blocking them; `report-provider` (any authenticated user, only on non-draft applications) accumulates reports and auto-flags at 3; `suspend`/`reinstate` let an admin pull an approved provider out of (and back into) active standing, recorded in the same audit trail.

**Evidence:**
- `npm run typecheck`, `npm run build`, and `npm run lint` all pass with 0 errors/warnings.
- `npx vitest run` → 29/29 tests passing across 8 files. New in this phase: `tests/provider.test.ts` (full draft→submit→review→approve lifecycle including the role grant, reject-with-reason, disallowed-file-type rejection, non-owner forbidden from viewing, non-admin forbidden from the review queue) and `tests/provider.security.test.ts` (duplicate-registration-number conflict across users, same-user in-progress duplicate conflict, shared-contact-info flagging, report-threshold auto-flagging, and document-download access control).
- Manual end-to-end smoke test against a live (throwaway, in-memory) MongoDB: registered a user, created a pharmacy application, uploaded a real PDF over multipart/form-data, and confirmed via `find` that the file landed on disk under a server-generated UUID filename (`746984ba-...-....pdf`), not the original filename — i.e. not a guessable path. Throwaway server and storage directory were torn down afterward.
- Note for future manual smoke tests: killing a `tsx`-spawned dev server from this Git Bash environment via `kill $!` does not reliably terminate the underlying `node.exe` on Windows — a stale listener survived from the Phase 1 smoke test and silently absorbed this phase's first attempt. Confirmed and killed via `Get-CimInstance Win32_Process` + `Stop-Process -Id <winpid> -Force` instead.

**Known issues / deferred:** The "suspicious profile" check is a simple same-contact-details heuristic, not fraud scoring — it flags for human review, never blocks. Real medical-council/licensing-registry lookups are not integrated (none were available); verification is the manual admin-review workflow the brief asked for when no registry API exists. Rate limiting on the auth endpoints is widened to effectively unlimited when `NODE_ENV=test` so functional test suites (which log in many times) aren't blocked by it — a dedicated rate-limit/abuse test belongs to Phase 12.

## Phase 4 — React Website Foundation and Patient Discovery

- [x] 4.1 — React Router site shell (`src/App.tsx`, `src/layouts/MainLayout.tsx`) with a calm healthcare design system (`src/index.css` — teal primary palette, reusable `.btn`/`.card`/`.form-field`/`.alert` classes); landing page, login/register pages, and forgot/reset-password pages wired to the full Phase 2 auth API; static contact/help/privacy/terms pages with real (clearly-marked-draft, not fabricated-final) copy. Session handling deferred from Phase 2 is implemented here: `src/app/AuthContext.tsx` (access token held in memory only, silent `/auth/refresh` restore on load) and `src/app/ProtectedRoute.tsx` (redirects to `/login`, returns after); `/account` is the protected page proving it end-to-end.
- [x] 4.2 — Nearby-provider discovery (`src/pages/ProviderSearchPage.tsx`, `src/hooks/useGeolocation.ts`): browser geolocation permission with an explicit manual city-name fallback when denied/unavailable/declined, a provider-type filter, and results sorted by real distance when geolocation is used. Backend gained a **public, unauthenticated** discovery API to support this — `GET /providers/search` and `GET /providers/search/:id` (`src/modules/providers/provider.service.ts: searchPublicProviders/getPublicProviderById`) — using MongoDB `$geoNear` for radius+distance search and a case-insensitive `address.city` match for the manual fallback; both paths are restricted to `status: 'approved'` and not past `expiresAt`, computed the same way `isActivelyVerified()` does, so nothing pending/rejected/suspended/expired can ever appear. A separate `toPublicListing` response mapper (distinct from the owner/admin `toApplicationView`) deliberately excludes `registrationNumber`, `contactEmail`, `documents`, and `statusHistory`.
- [x] 4.3 — Provider cards (`src/components/ProviderCard.tsx`) and the detail page (`src/pages/ProviderDetailPage.tsx`) are wired to that real API — verified badge, address, consultation fee, operating hours, Call (`tel:`) and Directions (maps) actions — with explicit loading/empty/error states on the search page and a not-found state on the detail page for an unverified/removed provider ID. `consultationFee`/`operatingHoursNote`/`location` were added to the provider model in this phase (optional at application creation, editable after via the new owner-only `PATCH /providers/applications/:id/listing-info`) specifically so these display fields are backed by real data rather than being left blank or fabricated; Phase 5 will build the fuller scheduling/availability system on top.

**Evidence:**
- Backend: `npm run typecheck`, `npm run build`, `npm run lint` all pass; `npx vitest run` → 9 files / 33 tests passing, including a new `tests/provider.discovery.test.ts` (geo search returns only in-radius actively-verified providers sorted by distance and excludes one simulated as past-expiry; city fallback; public shape never leaks registration number/email/documents/statusHistory; listing-info update is owner-only).
- A real `2dsphere`-index race was caught and fixed during this phase: mongoose builds declared indexes asynchronously after `connect()`, so a `$geoNear` query issued immediately after startup against a fresh database intermittently failed with "requires a 2d or 2dsphere index, but none were found." `connectDatabase()` (`src/config/db.ts`) now awaits `model.init()` for every registered model before returning. All test files were switched from raw `mongoose.connect`/`disconnect` to this same `connectDatabase`/`disconnectDatabase`, so tests exercise the identical startup path production uses.
- Frontend: `npm run build` and `npm run lint` pass (3 pre-existing warnings accepted as correct patterns — see Known issues).
- Full manual browser verification (Claude's built-in browser pane) against both dev servers with a real MongoDB instance: register → auto-login → protected `/account` page → hard-reload session persistence (silent refresh) → logout → `/account` correctly redirects to `/login` → provider search by city returns a real API-approved provider as a card → provider detail page renders the same data → forgot-password → reset-password (token read from the logged notification) → login with the new password, all against live network calls, not mocked. Mobile (375px) viewport checked; one apparent rendering gap turned out to be a screenshot-scaling artifact, not a real layout bug (confirmed via `getBoundingClientRect()` — every element was genuinely 375px wide).

**Known issues / deferred:**
- Three frontend lint warnings are accepted, not fixed: `AuthContext.tsx` co-exports the `useAuth` hook alongside the `AuthProvider` component (a standard, widely-used React pattern; splitting it into a second file purely to satisfy a Fast-Refresh heuristic was judged not worth the fragmentation), and two `set-state-in-effect` warnings on the search/detail pages for the standard fetch-in-effect-then-setState data-loading pattern.
- This machine's **C: system drive was critically low on free space (under 1GB)** during this phase, which made MongoDB itself (including the pre-existing local Windows MongoDB service, not just test infrastructure) refuse to create indexes or sometimes crash outright — unrelated to any MediConnect code, but worth the user's attention, since it will affect other tools too. `tests/globalSetup.ts` now redirects `mongodb-memory-server`'s scratch data to a folder inside the repo (on a drive with space) specifically to keep automated tests reliable regardless.
- No map view (list + distance only) — matches the brief's "avoid unnecessary heavy dependencies" guidance; can be added later without changing the API.

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
