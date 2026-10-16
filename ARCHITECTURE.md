# MediConnect Architecture

## Mission to have

Help patients find the right healthcare provider, at the right time, at a reasonable cost, with
minimal search effort — without unnecessary treatment expense, and without exposing patients to
unverified or fraudulent providers. Patient safety takes priority over price.

## System shape

One backend, two clients:

- **React website** (`frontend/`) — patient portal, provider dashboards, admin panel.
- **Flutter mobile app** (`mobile/`, Phase 13+) — consumes the same REST API, same accounts, same
  permissions. No separate backend, no duplicated business logic.
- **Node.js + Express + TypeScript backend** (`backend/`) — all business logic, verification
  workflows, booking, emergency routing, and authorization live here.
- **MongoDB + Mongoose** — users, providers, appointments, orders, and all other persistent data.
- **Local file storage** behind a storage adapter interface — uploaded documents and images today;
  swappable for S3-compatible storage later without changing calling code.

## Key decisions and why

| Decision | Reason |
|---|---|
| Single backend for web + mobile | Avoids divergent business rules and duplicated verification/booking logic across two codebases. |
| MongoDB + Mongoose | Flexible schema fits heterogeneous provider types (doctor, pharmacy, lab, ambulance, …) while still allowing validation and indexes. |
| Storage adapter interface (`backend/src/storage/`) | Local filesystem is fine for development; production needs persistent, backed-up, access-controlled storage (e.g. S3). The adapter boundary means swapping providers later doesn't touch route/controller code. |
| Short-lived access tokens + refresh-token rotation | Limits the blast radius of a leaked access token; refresh rotation lets us detect reuse and revoke sessions. |
| `bcryptjs` over native `bcrypt` | Pure-JS, no native build toolchain required — avoids Windows build friction while keeping an equivalent hashing algorithm. |
| Express 5 | Current stable major version at project start; async route errors propagate to error-handling middleware without extra wrapping. |
| `zod` for request validation | Schema-first validation with TypeScript type inference, used at every API boundary. |
| Vitest (backend and frontend) | One test runner shared across both packages; fast, native ESM/TS support. |

## Verification and trust model

Uploaded documents, OTP verification, and successful file uploads are **never** treated as proof of
professional legitimacy by themselves. Provider applications move through explicit states
(`draft → submitted → under_review → approved/rejected → suspended/expired`) and only `approved`
providers backed by a recorded verification decision can appear as "verified" or accept
restricted/clinical bookings. Where authorized automated registry lookups are unavailable, a manual
review workflow is used instead, and that is documented — not papered over with a fabricated
integration.

## Data sensitivity tiers

- **Public/low-sensitivity**: provider listings, service catalogues, published fees.
- **Account data**: profile info, contact details — access controlled by authentication + ownership.
- **Sensitive**: medical records, identity/verification documents, diagnostic reports — stored outside
  any publicly served directory, access-controlled per user/role plus explicit consent (for caregiver
  access), and audited.

## Storage layout (backend)

```
src/config/      environment loading, constants
src/modules/      feature modules (model + validation + controller + service + routes + tests)
src/middleware/   auth, error handling, rate limiting, request validation
src/services/     cross-cutting services (email/OTP, notifications, etc.)
src/storage/       storage adapter interface + local implementation
src/utils/         shared helpers
src/routes/        route aggregation
src/app.ts         Express app construction (no listen())
src/server.ts      process entry point — loads env, starts the HTTP server, handles graceful shutdown
```

## Status

This document records decisions as they are made. See IMPLEMENTATION_TRACKER.md for what is actually
built versus planned. Entries are added here at the end of each phase, not in advance of the work.

### Phase 0 — Project setup

- Monorepo with independent `frontend/` and `backend/` npm packages (no workspace tooling added yet —
  not needed until there is a shared internal package to publish between them).
- Backend currently exposes only `app.ts`/`server.ts` bootstrapping; no routes yet (added in Phase 1).

### Phase 1 — Backend foundation

- **Env validation at startup** (`src/config/env.ts`, zod): the process refuses to start with a clear
  error message if required variables (e.g. `MONGO_URI`, JWT secrets) are missing or malformed,
  instead of failing confusingly later at first use.
- **Response envelope** (`src/utils/response.ts`): every success response is `{ success: true, data, meta? }`
  and every error is `{ success: false, error: { code, message, details? }, requestId }`. Kept in one
  place so every module (and the future Flutter client) can rely on one shape.
- **`AppError` + centralized `errorHandler`**: route/service code throws `AppError.notFound()` /
  `.badRequest()` / etc. instead of building response objects inline; the single error-handling
  middleware (`src/middleware/errorHandler.ts`) is the only place that turns an error into an HTTP
  response, a `ZodError` into a 400, or logs a 5xx. This keeps authorization/validation failures
  consistent across every future module.
- **Request ID middleware** runs first so every log line and every error response can be correlated
  back to one request, including across the async MongoDB/service calls a request triggers.
- **Split `tsconfig.json` / `tsconfig.build.json`**: the base config type-checks `src` and `tests`
  together (`npm run typecheck`); the build config extends it but only emits `src`, so `tests/` isn't
  pulled into `dist/` and `rootDir` stays strict. `npm run build` uses the build config.
- **Test database**: `mongodb-memory-server` spins up a real (in-memory) MongoDB per test run via
  Vitest's `globalSetup`, so integration tests exercise a real Mongoose connection without requiring
  a developer to have MongoDB installed, and without mocking the database layer.
- **Rate limiting** is applied globally to the whole `/api/v1` prefix for now (`express-rate-limit`,
  configurable via env); tighter, endpoint-specific limits (login, OTP, uploads) are added in Phase 2
  per the security requirements in the project brief.

### Phase 2 — Authentication and authorization

- **Access tokens are JWTs; refresh tokens are not.** Access tokens (`src/modules/auth/jwt.ts`) are
  short-lived, stateless, signed JWTs — cheap to verify on every request, no DB round trip. Refresh
  tokens are opaque random values whose SHA-256 hash is stored in a `RefreshToken` collection
  (`src/modules/auth/refreshToken.model.ts`). Making refresh tokens DB-backed rather than JWTs is what
  makes rotation and revocation actually possible: a JWT refresh token still needs a server-side
  denylist to be revocable, so there's no real benefit to making it a JWT in the first place.
- **Refresh rotation + reuse detection.** Every `/auth/refresh` call revokes the presented token and
  issues a new one (`auth.service.ts: refresh`). If a token that was already revoked is presented
  again — which only happens if someone replayed a stolen or previously-rotated-out token — every
  active refresh token for that user is revoked immediately, forcing a full re-login everywhere. This
  trades a small amount of user friction (an attacker *or* a buggy client retry can trigger it) for
  catching session theft quickly.
- **Cookie vs. body split.** The refresh token goes in an `HttpOnly`, `SameSite=Lax` cookie scoped to
  `/api/v1/auth` (never readable by page JavaScript, never sent to unrelated routes); the access token
  comes back in the JSON response body for the client to hold in memory. This keeps the long-lived
  credential out of reach of XSS while leaving the access token's storage to the frontend (in-memory,
  not `localStorage`, once Phase 4 wires this up) rather than baking a second cookie policy in now.
- **No user enumeration.** Login failure (wrong password) and login failure (no such account) return
  the identical `401 "Invalid email or password"`. `forgot-password` always returns the same success
  message whether or not the email exists. The one deliberate exception is a locked account, which
  returns a distinct `423 ACCOUNT_LOCKED` — a small, intentional enumeration trade-off for a clearer
  user experience, not an oversight.
- **Self-registration cannot grant roles.** `POST /auth/register` always creates a `patient` account;
  any `role`/`roles` field in the request body is silently ignored by `auth.service.ts: register`
  rather than validated-and-rejected, because the field isn't part of `registerSchema` at all — zod
  strips unknown keys by default, so there's nothing for the service layer to even consider. Every
  other role is granted only through the Phase 3 provider-verification workflow or by an admin.
- **Password reset revokes everything.** Resetting a password revokes every refresh token the user
  had (`auth.service.ts: resetPassword`), so a compromised-password scenario doesn't leave old sessions
  (e.g. on an attacker's device) still valid after the legitimate user resets their credentials.
- **`NotificationService` is a seam, not an integration.** No email/SMS provider is configured yet
  (`src/services/notification.service.ts`). The interface exists so a real provider (SES, Twilio, etc.)
  can be dropped in later without touching `auth.service.ts`; until then it only logs, and tests
  verify the reset flow by spying on that interface rather than needing a real mailbox.
- **Account lockout** trips after 5 failed attempts and lasts 15 minutes; there is no background job
  unlocking accounts. Once `lockUntil` has passed, the *next* login attempt is allowed to check the
  password again: if it's correct, the lock clears (`status` back to `active`, counters reset); if
  it's wrong, the account re-locks for another 15 minutes rather than clearing.

### Phase 3 — Provider registration and verification

- **The `ProviderApplication` status is the trust signal, not the `User` role.** A `User.roles`
  entry like `doctor` only gates which provider-side UI/API surface an account can reach; whether
  that provider should actually be shown to patients or allowed to accept bookings is decided by
  re-checking `ProviderApplication.status` (via `isActivelyVerified()`) at query time, every time.
  This is deliberate: a role, once granted, doesn't silently keep conferring trust after a provider
  is suspended or their verification expires — suspending or expiring the *application* is enough,
  with no need to also strip the role (which the provider might still legitimately need for other
  purposes, e.g. viewing their own historical bookings).
- **Roles are granted in exactly two places**, both server-controlled, never by the user: initial
  self-registration always assigns `patient` ([[Phase 2]]), and `ProviderApplication` approval
  `$addToSet`s the role mapped from `providerType` (`provider.types.ts: PROVIDER_TYPE_TO_ROLE`). No
  other code path mutates `User.roles`.
- **No real registry integration.** Doctor/facility/pharmacy registration numbers are recorded and
  reviewed by a human admin; there is no Medical Council or Drug Control API to call against, and the
  brief is explicit that fabricating one would be worse than not having it. `issuingAuthority` and
  `registrationNumber` are captured so a real integration has somewhere to plug in later.
- **Expiry is computed, not maintained.** `expiresAt` is stored, but "is this provider currently
  verified" is always `status === 'approved' && expiresAt > now`, computed on read
  (`isActivelyVerified()`). There's no cron job flipping `approved` to `expired` in the background —
  one doesn't exist yet — so the stored `status` can lag reality by design; `isActivelyVerified()` is
  the one function every other module should call, never a raw `status === 'approved'` check.
  `mark_expired` exists as an explicit, admin-triggered transition for bookkeeping/audit-trail
  purposes once a real scheduler is added.
- **Duplicate detection is a hard block only for an active conflict.** Two different users racing to
  claim the same `(providerType, registrationNumber)` while one of them is `submitted`/`under_review`/
  `approved` is blocked outright (409) — this is the actual fraud case (impersonating someone else's
  licence). The same user reapplying after a `rejected`/`expired` application with the same number is
  allowed, since renewals and corrected resubmissions are legitimate.
- **"Suspicious profile detection" is one honest heuristic, not a scoring model.** Sharing contact
  details (phone or email) with a different account's application sets `flagged: true` and a specific
  `flagReasons` entry, surfaced in the admin review queue — it never blocks the application. Likewise,
  accumulating 3 reports auto-flags for review. Both are signals for a human reviewer, not automated
  rejections, which matches the brief's instruction not to treat any automated check as proof of (or
  disproof of) legitimacy.
- **Document storage reuses the Phase 0 storage adapter.** Uploads go through `multer` with
  memory storage (MIME type restricted to PDF/JPEG/PNG, size capped via `MAX_UPLOAD_SIZE_MB`) and are
  handed to the same `StorageAdapter` interface as everything else; `LocalStorageAdapter` generates a
  random UUID filename per file, so a document's storage path can never be derived from its original
  filename or guessed. All document access goes through an authorized download endpoint
  (owner or `super_admin` only) that resolves a document ID to a storage key server-side — there is no
  static file serving of the private storage root.

### Phase 4 — Website foundation and patient discovery

- **Two provider response shapes, never shared.** The owner/admin view (`toApplicationView`) and the
  public discovery view (`toPublicListing`) are separate mapper functions in
  `provider.controller.ts`, not one shape with fields conditionally stripped. That makes it
  structurally impossible for a future change to the admin view (e.g. adding a new internal field)
  to leak into the public API by accident — someone has to deliberately add a field to the public
  mapper for it to ever reach an unauthenticated response.
- **Public discovery re-derives "actively verified" on every query**, via the same
  `status === 'approved' && (!expiresAt || expiresAt > now)` check `isActivelyVerified()` uses — it
  does not trust a cached or denormalized "isVerified" flag. A provider that was approved and later
  suspended or whose verification expired disappears from search and returns 404 on its detail page
  immediately, with no separate cleanup step required.
- **Geo search uses `$geoNear` (aggregation) for the sorted/paginated list and `$geoWithin` +
  `$centerSphere` (plain query) for the total count**, rather than `$near`/`$nearSphere` for both.
  MongoDB doesn't allow `$near` inside an aggregation `$match`, and `countDocuments()` runs as an
  aggregation internally — so getting both a distance-sorted page and an accurate total in one
  consistent request needs these two different geospatial operators for the two different jobs.
- **City-name fallback is a case-insensitive substring match on `address.city`, not geocoding.** No
  geocoding provider is configured (same "don't fabricate an integration" rule as provider
  verification), so when a patient can't or won't share location, search falls back to the city they
  typed rather than pretending to compute a distance that doesn't exist. The input is regex-escaped
  before use to avoid both injection and accidental catastrophic patterns.
- **Access token lives only in a React state variable (via a module-level variable in
  `apiClient.ts`, never `localStorage`/`sessionStorage`)**, consistent with the Phase 2 cookie/body
  split: it's gone on a hard reload by design, and `AuthProvider`'s mount effect calls
  `POST /auth/refresh` (which relies solely on the HttpOnly cookie) to silently re-establish it. A
  401 from any other API call triggers exactly one silent refresh-and-retry before giving up, so an
  expired access token doesn't surface as a visible error if the refresh token is still valid.
- **`connectDatabase()` now awaits every model's index build before returning** (`model.init()` for
  everything registered on the connection). Without this, `$geoNear` run immediately after startup
  against a fresh database can fail because mongoose creates declared indexes asynchronously in the
  background after `connect()` resolves — a race that's easy to miss in development against a
  long-running database (indexes are usually already built) but shows up reliably against a fresh
  one. All backend tests connect through this same function now instead of a raw `mongoose.connect`,
  so the test suite exercises the exact startup path production uses.

### Phase 5 — Provider workflows, scheduling, and booking

- **Discrete slots, not a recurring schedule.** A provider (or staff member) creates individual
  bookable time slots — explicit start/end time and capacity — rather than defining a weekly
  availability pattern that the system expands into future slots. This is a deliberate scope
  decision, not an oversight: a recurrence engine (weekly patterns, holiday exceptions, DST,
  per-slot overrides) is a meaningfully larger feature with its own edge cases, and the brief's
  actual requirement — "appointment capacity," "a reliable reservation mechanism" — is fully met by
  explicit slots. A "repeat this slot weekly" convenience can be layered on top later without
  changing the `Slot`/`Appointment` data model or any API shape, since it would just mean creating
  more `Slot` documents, not a different kind of one.
- **Booking requires a MongoDB transaction — not an optimistic/compensating workaround.** The brief
  explicitly says to use transactions "where supported and necessary," and this is the textbook case
  for one: reserving slot capacity and creating the appointment record have to succeed or fail
  together, and multiple patients can race for the same slot. `bookAppointment()`
  (`appointment.service.ts`) wraps the atomic `findOneAndUpdate` (which only matches and increments
  `bookedCount` when `bookedCount < capacity`) and the `Appointment.create()` in one
  `session.withTransaction()`. Concretely verified under real concurrency in
  `tests/scheduling.test.ts`: 5 simulated patients hit a capacity-1 slot via `Promise.all`, exactly 1
  gets a 201, the other 4 get a 409, and the slot's `bookedCount` ends at exactly 1 — not something
  a sequential test could prove, since the whole point is what happens when requests overlap.
- **Transactions forced a test-infrastructure change.** MongoDB only supports multi-document
  transactions on a replica set — a plain standalone `mongod` rejects `session.withTransaction()`
  outright. `tests/globalSetup.ts` now boots a single-node `MongoMemoryReplSet` instead of a plain
  `MongoMemoryServer`. The same requirement applies to any real deployment: `README.md` documents
  that local MongoDB needs `--replSet` + a one-time `rs.initiate()` (a managed service like Atlas is
  already a replica set by default, so production is unaffected).
- **Double-booking prevention lives in a database constraint, not just application logic.** The
  partial unique index on `Appointment { slotId, patientId }` (scoped to non-cancelled statuses) is
  what actually makes "the same patient can't double-book the same slot" true under concurrency — an
  application-level "check if a booking already exists, then insert" has exactly the same race
  condition as overbooking a slot would without the atomic capacity check. The database constraint
  is the source of truth; the service layer just turns the resulting duplicate-key error into a
  clean `409`.
- **`isProviderMember()` is the one authorization gate for schedule management**, treating the
  application's `userId` (owner) and any `ProviderStaff` row with `status: 'active'` identically. It
  deliberately does *not* gate the Phase 3 verification actions (document upload, submission,
  listing-info edits, admin review transitions) — those stay owner-only — so a staff invite can never
  become a path to altering a provider's legal/verification identity, only to managing its day-to-day
  schedule and bookings.
- **Staff invites require an existing account**, found by email, rather than sending an email
  invite to an arbitrary address (consistent with no email provider being configured — see
  [[Phase 2]] — and avoids a pre-account-creation flow neither the brief nor this phase asked for).

### Phase 6 — Pharmacy and medicine services

- **Stock reservation reuses the Phase 5 booking pattern exactly**: reserve the scarce resource
  atomically inside a transaction, then create the dependent record, with the whole thing succeeding
  or failing together. The only real difference from appointment booking is that an order can have
  *multiple* line items, each needing its own atomic `findOneAndUpdate` — if any one of them can't be
  satisfied, the `AppError` thrown inside `session.withTransaction()` aborts the whole transaction,
  so there's no risk of an order that reserved stock for item 1 but not item 2. This is the same
  reason Phase 5 needed a replica-set test database; nothing new was required here.
- **A medicine's price/prescription requirement is snapshotted onto the order at creation time**
  (`OrderItem.unitPrice`), not re-read live from `MedicineItem` later. If a pharmacy changes a price
  after an order is placed, the order's total stays what the patient actually agreed to pay — the
  same "don't silently change terms after the fact" reasoning as e-commerce systems generally use.
- **Never auto-substitute.** `findAlternatives()` is read-only and purely additive — it never alters
  the patient's order or the pharmacy's fulfillment of it. The response always carries a disclaimer
  string alongside the data, so the *frontend* can't accidentally present "alternatives" as if they
  were an automatic swap (the disclaimer travels with the data, not just in frontend copy that could
  drift out of sync with what the API actually does).
- **Prescription documents go through the same `StorageAdapter`/private-download pattern as provider
  verification documents** ([[Phase 3]]) — server-generated storage key, never served statically.
  There's no separate "medical records" concept yet for where a prescription lives long-term; it's
  attached to the order it unblocks. Phase 9 (medical records) is where a patient's prescription
  history across orders would get a proper home if that's wanted later — this phase doesn't duplicate
  that work ahead of time.
- **Text search needs its index to exist before it's queried**, same class of issue as the Phase 4
  `$geoNear` race — already solved by `connectDatabase()` awaiting `model.init()` for every model, so
  `MedicineItem`'s `{name: 'text', genericName: 'text'}` index is just as covered as the `2dsphere`
  one without any extra work this phase.

### Phase 7 — Diagnostics and mobile health camps

- **A diagnostic order is its own flow, not a repurposed `Slot`/`Appointment`.** Doctor/clinic
  booking is "pick an existing time slot the provider published." A diagnostic order is closer to
  the pharmacy flow: the patient picks *tests* and a *collection method*, and the lab then confirms
  a time — the request comes from the patient side first, not from provider-published availability.
  Forcing it through the Phase 5 slot system would mean either pharmacies-style labs pre-publishing
  slots for every possible test combination (impractical) or awkwardly bolting collection-method and
  home-address fields onto `Slot`, which exists for a conceptually different thing. Two small,
  purpose-built models were less code and clearer than stretching one general one to cover both.
- **One `HealthCamp` model serves two different provider types** (`mobile_van_operator` and
  `ngo_coordinator`) rather than one model per type. The brief describes them as the same kind of
  event — a scheduled, capacity-limited public health activity at a location — differing only in who
  runs it, which `CAMP_PROVIDER_TYPES` in `healthCamp.service.ts` already captures as an authorization
  check, not a schema difference. If the two ever need genuinely different fields later, that's a
  schema migration at that point, not a redesign now for a difference that doesn't exist yet.
- **Report/collector assignment reuses `isProviderMember()` with no finer-grained role**, same as
  every other lab/pharmacy/provider action. A real system would likely want a "radiologist" or "lab
  technician" credential distinct from "works at this lab," matching the brief's mention of
  radiologist-specific finalization — but the Phase 5 staff model has no per-member role/specialty
  field to check yet, and inventing one for this phase alone (rather than as a real cross-cutting
  staff-permissions feature) would be the kind of half-measure the brief explicitly warns against.
  Documented as a known gap rather than silently narrowed.
- **The "schedule" action takes an explicit `confirmedDateTime`, never defaults silently.** An
  earlier draft of the frontend defaulted it to "now" when the lab clicked Schedule without picking a
  time — caught via a lint warning on the stray `new Date()` call, not a design review, which is
  itself worth noting: a purity/impure-call lint rule flagged a real product correctness issue, not
  just a style nit. Fixed by giving the lab a `datetime-local` input per order, falling back to the
  patient's own originally-requested time (not "now") when left blank.

### Phase 8 — Emergency support

- **No new discovery backend — the emergency page is a client-side view over Phase 4's existing
  `GET /providers/search`.** Finding "nearby ambulances, hospitals, and clinics" is the same
  verified-only, geo-sorted query Find Care already does, just called three times (once per relevant
  `providerType`) and merged/sorted client-side. A dedicated `/emergency/nearby` endpoint would have
  duplicated that logic for no real benefit — the only thing actually new in this phase is *which*
  provider types to show together and how urgently to frame them, which is a page-level concern, not
  a data-access one.
- **Red-flag guidance is a checklist with one rule, not a symptom checker.** There is deliberately no
  scoring, no "mild/moderate/severe" weighting, and no combination logic — checking *any* symptom in
  *any* guide shows the same unconditional "call now" banner. The brief is explicit that the system
  "must not independently diagnose patients or guarantee a minor symptom is harmless," and the surest
  way to honor that isn't a careful diagnosis algorithm, it's not having one: the UI's only job is
  recognizing "this might be serious" and getting out of the way.
- **`clinicallyReviewed` defaults to `false` and nothing in this codebase ever sets it to `true`
  automatically.** This is the honest resolution of the brief's "configurable symptom guidance
  reviewed by qualified clinical professionals": an AI assistant can build the *configuration* system
  (the admin CRUD, the public read API, the per-guide flag) but cannot make the review itself true by
  writing code. The flag exists so a real clinician reviewing this content later has somewhere to
  record that they did, and the public page visibly discloses the unreviewed state rather than
  presenting draft content as though it were vetted.
- **The emergency page has no `ProtectedRoute` wrapper, on purpose** — it's the one page in the
  application explicitly designed to work for a signed-out visitor mid-emergency. Every other
  patient-facing page in the app that touches personal data or a transaction requires login; this one
  doesn't, because requiring an account first would work directly against the page's purpose.
- **No fabricated dispatch, ETA, or live tracking anywhere.** Every action on this page is either a
  `tel:` link (real phone call) or a link into the same discovery/booking flows the rest of the site
  already uses — there is no "ambulance is 4 minutes away" style UI, because the system has no actual
  dispatch integration and would be lying if it displayed one.

### Phase 9 — Medical records and caregiver access

- **One route shape, one access function, for both self and caregiver access.** Every endpoint in
  this module is `/medical-records/:patientId/...`, where `:patientId` is either the literal string
  `"me"` or someone else's user id, and every single one of them calls the same `assertAccess()`
  before doing anything. There is no separate "my records" vs "patient records" code path to keep in
  sync — self-access and caregiver-access are the same code with a different outcome of one function,
  which is exactly the property you want for an authorization boundary this sensitive: one place to
  get right, not several copies that can drift apart.
- **Medical records are the one place in this app where `super_admin` has no special access.**
  Everywhere else — provider verification, order fulfillment, emergency guidance — a platform admin
  reviewing or moderating the system is core to how that feature works. Health data is different: an
  admin being able to browse patient records "because they're an admin" isn't a feature, it's a
  liability, and nothing in this module checks `req.user.roles` at all. The only two ways in are
  "you're the patient" and "the patient explicitly granted you a scope."
- **Expiry and revocation are both checked at read time, not enforced by a background job.** A
  `CaregiverAccess` grant with a past `expiresAt` is treated as inactive the instant the next request
  checks it (same `isActivelyVerified()`-style computed check as Phase 3 provider verification and
  Phase 4 discovery), and a revoked grant simply fails that same check from then on. There's no
  scheduled task sweeping through expired grants — the check is cheap enough to do on every request,
  which is also strictly more correct than a periodic sweep that could leave a technically-expired
  grant working for up to one sweep interval.
- **Deletion is patient-only, even for a caregiver who can edit everything else.** `manage_profile`
  grants the ability to add documents and visits and edit the profile — it does not grant deletion.
  This is a deliberate asymmetry: a caregiver helping manage someone's records is a reasonable thing
  to support, but giving a third party the ability to permanently remove another person's health
  records is a different, much higher-risk capability that the brief's "appropriate" deletion controls
  shouldn't be read as implying.
- **The audit log only records caregiver access, not the patient's own.** A patient viewing their own
  profile isn't a privacy-relevant event in the way a caregiver's access is — logging it would just be
  noise that makes the real signal (who *else* looked at this) harder to find. `logAccess()` is a
  no-op whenever `patientId === accessedBy`.

### Phase 10 — Additional healthcare services

- **Equipment and home-visit services are one offering model with a type discriminator, not two.**
  `CareOffering.offeringType` is `equipment_rental` / `equipment_purchase` / `home_visit_service`, and
  `availableQuantity` is `null` precisely for the service case. Equipment genuinely is finite
  inventory that needs the Phase 5/6/7 atomic-reservation transaction; a home nursing visit isn't —
  there's no stock to oversell, only a provider's own capacity to say yes or no to. Forcing a nurse
  booking through the same check-then-decrement transaction as a wheelchair rental would be modeling a
  race condition that doesn't exist, just to keep the code path uniform. The branch is in the service
  layer (`if (offering.availableQuantity === null) { create directly } else { transaction }`), not two
  separate models, because everything else about a request — status history, pricing snapshot,
  delivery address — is identical regardless of which kind of offering it is.
- **`equipment_provider` already covered home healthcare; no new provider type or role was added.**
  The master prompt's own provider-role list names this type "Medical Equipment / Home Healthcare
  Provider" — the role was always meant to span both, it just had no functionality built on it until
  this phase. Recognizing that avoided inventing a parallel `home_care_provider` type that would have
  fragmented an already-correct role boundary.
- **The delivery-partner role follows the exact same "never self-granted" shape as provider
  verification, deliberately, even though a delivery partner isn't a regulated business entity the way
  a pharmacy or hospital is.** `delivery_partner` sat reserved but unused in `config/roles.ts` since
  Phase 0. The alternative — letting a user instantly self-grant it, since gig-worker onboarding is
  usually lighter-weight than business verification — was rejected because a delivery partner still
  gets access to patient addresses and order details; "lower stakes than a hospital" isn't "no stakes."
  `DeliveryPartnerProfile` is intentionally smaller than `ProviderApplication` (no document upload, no
  registration-number dedup, no expiry) because the regulatory weight genuinely is lower, but the one
  property that matters — a human admin decides, the code never does — was kept identical.
- **A delivery-partner directory endpoint is open to any authenticated user, not just admins, because
  the alternative is unusable.** A pharmacy needs to find someone to assign a delivery to; gating that
  list behind `super_admin`/`support` would mean no pharmacy owner could ever actually use the
  assignment feature without asking an admin to look someone up for them every time. The directory
  deliberately exposes only what assignment needs (name, vehicle, city) — not phone number, not
  application history, not status — so it's the minimum necessary, not the full admin view reused.
- **`transitionOrder`'s `deliver` action now has two legitimate actors instead of one, and the code
  says so explicitly rather than widening the existing `isPharmacyMember` check.** The assigned
  delivery partner can confirm delivery; a pharmacy staff member still can too (useful for in-house
  delivery or correcting a mistaken assignment); nobody else can, including a *different* delivery
  partner who happens to also be approved. This was deliberately **not** implemented by adding
  `delivery_partner` to the set of roles that can hit the endpoint — that would let any approved
  delivery partner confirm *any* pharmacy's order, anywhere. The check is "are you the specific person
  this specific order was assigned to," which is a per-resource relationship, not a role.
- **NGO/health-camp coordination needed no new code.** Phase 7's `HealthCamp`/`HealthCampRegistration`
  module already deliberately served both `mobile_van_operator` and `ngo_coordinator` provider types
  under one model, specifically so this exact situation — the brief listing "NGO/health-camp
  coordination" as if it were a separate feature — wouldn't require rebuilding something that already
  existed. Recognizing prior work already satisfies a later requirement is as much a part of this
  process as building something new; re-implementing it under a different module name would have been
  needless duplication, not thoroughness.
- **`refund_request` is a support-ticket category, not a refund-processing feature.** No payment
  provider is integrated anywhere in this codebase yet (that's Phase 11's job), so there is no real
  money-movement capability to attach a "process refund" button to. Building one now would mean either
  faking a successful refund (actively dishonest to whoever reads that response) or building dead code
  against an API that doesn't exist yet. Routing it to a human support queue is the honest version of
  "handle refund requests" available at this point in the build — the ticket captures the request and
  evidence; actual execution is deliberately left to Phase 11 once there's a real payment integration
  to execute it against.
- **The support-ticket action set is split the same way order/appointment cancellation already is:**
  the person who filed it can message it, the people who handle it can change its state. This isn't a
  new pattern invented for this phase — it's the same patient-vs-operator asymmetry from Phase 5
  (appointment cancellation) and Phase 6 (order cancellation) applied to a new resource, because the
  underlying shape of the problem (a customer-facing actor and an operator-facing actor needing
  different permissions on the same record) is the same one, and reusing a proven shape is safer than
  inventing a new permission model per feature.

### Phase 11 — Admin, revenue and platform operations

- **A `super_admin` can never suspend another `super_admin`, or themselves.** The only way to remove
  platform-admin access is a direct database edit, not a UI action available to any admin account.
  This is a deliberate floor: without it, a compromised or simply careless admin session could lock
  out every other admin (including itself), and there would be no way back in through the app's own
  UI. A capability this destructive to the platform's own operability needs to require stepping
  outside the normal admin surface entirely, not just an extra confirmation dialog.
- **The provider-verification review UI was missing for seven phases, and nobody noticed until Phase
  11 built it.** `GET /providers/admin` and `POST /providers/admin/:id/transition` have existed since
  Phase 3; every single manual-verification pass from Phase 3 through Phase 10 approved providers by
  calling those endpoints directly, because no frontend page ever consumed them. This is worth stating
  plainly rather than glossing over: a backend capability with no UI is not a finished feature, even if
  every test for it passes, and "the API already does this" had quietly become an excuse not to check
  whether a real admin could actually use the product. Phase 11.1 closing this gap is itself evidence
  for why "verification review" was named explicitly in the brief's Phase 11 scope rather than assumed
  complete.
- **Revenue analytics are computed live from source collections on every request, not from a
  pre-aggregated rollup table.** A rollup is the standard answer once this kind of aggregate query
  gets expensive, but it introduces a second source of truth that can silently drift from the orders
  it summarizes — a bug in a rollup-maintenance job produces a number that looks authoritative and is
  wrong. At this project's data volume, computing it live is both simpler and strictly more correct;
  a rollup is a performance optimization to reach for later if the live aggregation ever actually
  becomes slow, not a default to build pre-emptively against a problem that doesn't exist yet.
- **Commission is a flat, admin-configured percentage per provider type, not a contract/negotiation
  system.** The brief asks for "configurable commission rules," and the honest reading of what's
  buildable without a real finance/legal process behind it is exactly this: one number per provider
  type that an admin can see and change, applied uniformly. A per-provider negotiated-rate system
  would imply a business process (contracts, approvals, effective-dating) that doesn't exist anywhere
  else in this codebase and wasn't asked for — building it would be solving an imagined requirement,
  not the stated one.
- **`ManualPaymentProvider` never claims to move money, and `verifyWebhookSignature()` always returns
  `false`.** This mirrors the exact reasoning behind `ConsoleNotificationService` (Phase 2) and
  `LocalStorageAdapter` (Phase 0): no real payment gateway is configured anywhere in this codebase,
  so the only honest implementation is one that records what a human needs to do manually and never
  pretends otherwise. A refund "moves" through exactly one real state change in this system — a
  `Transaction` document's status field — and the UI says so explicitly rather than implying a refund
  button actually transfers funds. Building a fake "success" response would be actively dishonest
  about a capability the system does not have.
- **Refunds are scoped to support tickets, not bolted onto every order/appointment model.** A refund
  only ever makes sense in response to a specific complaint a human is handling — there's no capability
  anywhere in this codebase to *take* a payment in the first place (every order/appointment/booking
  flow records a `totalAmount` but never actually charges one), so a generic "refund this order" button
  on every transactional model would be refunding money that was never collected. Routing refunds
  through the support-ticket workflow that already exists for exactly this kind of request keeps the
  feature honest about what it's actually doing: opening a manual-review record tied to a specific
  complaint, not simulating a payment reversal against a charge that was never real.
- **A real `window.prompt()` bug, caught by browser verification, led to replacing it everywhere in
  the admin surface, not just where it broke.** Four separate "enter a reason" admin actions had been
  built with `window.prompt()` — it's quick to write and matches a common tutorial pattern — but it
  silently failed in this project's automated browser pane (no network request was ever sent) and is
  poor practice regardless: it blocks the main thread, can't be styled or validated inline, and is
  increasingly disabled or auto-dismissed by browsers and extensions. Once the bug was found in one
  place (transaction settlement), the fix was applied to all four occurrences discovered by searching
  for the same pattern, not just the one that happened to get exercised first — the same category of
  mistake, found once, is worth fixing everywhere it was made, not just where it was caught.
- **`AuditLog` records decisions, not reads.** It captures provider-verification transitions,
  delivery-partner review outcomes, support-ticket resolution/closure, user suspension, commission-rule
  changes, and transaction settlement — the moments where a staff member's judgment changed something
  about another user's access, money, or standing on the platform. It deliberately does not log every
  `GET /admin/users` call or dashboard view; that's what request-level winston/morgan logging (Phase 1)
  is for. Conflating "who looked at what" with "who decided what" would make the audit log noisy enough
  that the signal that actually matters — accountability for consequential decisions — gets harder to
  find, not easier.

### Phase 12 — Website quality and production readiness

- **Rate limiting had been configured since Phase 1 but never actually proven to work.**
  `createLimiter()` has always gone effectively unlimited whenever `NODE_ENV === 'test'`, specifically
  so functional suites that log in dozens of times don't fail for unrelated reasons — a deliberate,
  documented choice. But that same escape hatch meant no test in the suite had ever exercised the
  branch where a limit is actually enforced; "the config exists" and "the config works" are different
  claims, and only the first one had evidence behind it until this phase. The fix wasn't to remove the
  escape hatch (every other test still needs it) — it's one dedicated test file that briefly flips
  `env.NODE_ENV` to `'production'` for the handful of assertions that need the real behavior, then
  restores it, so the one test that needs the limiter *on* doesn't force it on for anyone else.
- **A mobile-layout check means measuring `scrollWidth` vs `clientWidth`, not looking at a
  screenshot.** Phase 4 had already learned this lesson once — a screenshot that looked like a layout
  bug turned out to be a rendering-scale artifact, confirmed only by checking `getBoundingClientRect()`
  directly. This phase leaned on that lesson from the other direction: a systematic sweep using the
  same kind of direct measurement found two real overflow bugs that a visual pass across the same pages
  very plausibly would have missed, because the overflow in both cases was a thin sliver (57–116px) at
  the right edge of a 375px viewport — easy to not notice in a screenshot, impossible to miss in a
  number comparison. The lesson generalizes in both directions: don't trust a screenshot that looks
  broken without checking the DOM, and don't trust a screenshot that looks fine without checking it
  either.
- **The horizontal-overflow fix was applied at the shared container level
  (`.dashboard-page { overflow-x: auto }`), not per-page.** Six admin list pages added across Phases
  10–11 all independently rendered a bare `<table className="simple-table">` with no wrapper, because
  each one was built by copying the same established pattern from earlier phases — a pattern that had
  never been checked at mobile width because none of the phases that established it had reason to
  think a *table* needed the same mobile check a *search form* already got. Finding the bug once and
  tracing it to the shared ancestor every affected page already had in common, rather than patching
  each page's JSX individually, means the same class of bug can't recur the next time someone adds a
  `.simple-table` to a new admin page — the fix generalizes to pages that don't exist yet, which a
  per-page patch wouldn't have.
- **The security/privacy review documents what's true, including what's missing, rather than reading
  as a checklist of reassurances.** A security section that only lists what *is* protected reads as
  marketing; one that's silent about what isn't implies more coverage than actually exists. This
  project's standing practice — never claim a capability that doesn't exist, whether that's a payment
  gateway, a reviewed clinical guide, or a CSRF framework — applies exactly the same way to documenting
  security posture as it does to building any other feature: the honest version of "here's our security
  review" names the gaps (no CSRF-specific scheme, no WAF, no CI-wired scanning, no third-party pen
  test) in the same document as the things that are genuinely in place, so a reader can calibrate trust
  correctly instead of assuming completeness that was never claimed outright but would otherwise be
  implied by omission.
- **No E2E browser-automation suite (Playwright, Cypress) was added.** Every multi-step journey in this
  project — booking, ordering, verification, caregiver access, refunds, admin review — has instead been
  verified manually through a real browser during its own phase's verification pass, against a live
  backend and a real (if throwaway) database, never mocked. That's genuine evidence the feature works,
  but it is not the same claim as "a repeatable, CI-runnable test suite exists for these journeys" —
  the manual passes don't run again automatically the next time someone changes related code. Building
  a proper E2E suite is a substantial scope of its own (environment setup, test-data fixtures, CI
  wiring) that this phase's time was better spent finding and fixing the two real bugs above than
  starting and leaving half-finished.

### Phase 13 — Stabilizing APIs for Flutter

- **The OpenAPI spec is generated from the same zod schemas that validate requests, not
  hand-written.** A hand-maintained spec for ~95 endpoints is both a huge amount of error-prone
  transcription and, worse, a second description of each contract that can silently drift from the
  real one the moment a schema changes and nobody remembers to update the doc by hand. Zod v4 ships
  `z.toJSONSchema()` natively, so `scripts/generate-openapi.ts` converts the actual imported schema
  for every request body and query string — the literal object `validateBody()` runs at request time
  — rather than re-describing it. The only hand-curated part is route metadata (method, path, auth,
  tags) that Express's router objects don't carry themselves; everything that could drift from the
  real contract is derived, not retyped. `tests/openapi.test.ts` runs the generator for real as part
  of the suite specifically so a schema construct it can't represent fails CI immediately, the way
  `z.coerce.date()` did the first time the script ran, rather than silently producing a stale spec.
- **Mobile gets the raw refresh token only when it explicitly asks for it, via a header, never
  inferred.** Before this phase, `/auth/refresh` and `/auth/logout` read the refresh token *only*
  from the HttpOnly cookie, and `/auth/login` never returned it in the response body at all — meaning
  a native mobile client had no documented way to obtain a refresh token whatsoever. The fix adds a
  second channel without weakening the first: the website's behavior is completely unchanged (the
  cookie is still HttpOnly, still never reaches JavaScript), and a client only receives the raw token
  in the JSON body by sending `X-Client-Platform: mobile` — an explicit opt-in the caller controls,
  never inferred from `User-Agent` (trivially spoofable by a browser, and not a reliable signal for a
  mobile HTTP client either). Accepting the token back via the request body on refresh/logout is safe
  to allow unconditionally for every caller, cookie or not — it's just an alternate transport for a
  value the request already legitimately needs to prove it holds, not a new way to forge one.
- **CORS is explicitly documented as a web-only concern, not configured differently for mobile.**
  `CORS_ORIGIN` governs a browser-enforced mechanism; a native Android/iOS Flutter app's HTTP client
  has no same-origin policy to enforce in the first place, so the mobile app needs zero CORS
  configuration to work. This is worth stating plainly in the docs specifically because it's a common
  point of confusion — someone unfamiliar with the distinction might otherwise assume the mobile app's
  bundle ID or scheme needs adding to `CORS_ORIGIN`, which would be a no-op at best and a sign of a
  misunderstanding at worst.
- **The pagination audit paginated growing history, not managed catalogues — on purpose, not by
  oversight.** Checking every `list*` service function surfaced several that don't paginate
  (`listPharmacyMedicines`, `listLabTests`, `listProviderCamps`, `listStaff`, …) alongside three that
  didn't but should have (`listDocuments`, `listVisits`, `listAccessLog` in medical records). The
  distinction is what kind of collection each one is: the unpaginated ones are a provider's own
  catalogue or roster, rendered as a single editable table a dashboard owner needs to see and edit as
  a whole, where pagination would actively hurt the UX it's actually used for. The three that got
  fixed are patient-facing *history* that only ever grows over the lifetime of an account — years of
  documents, visits, and caregiver-access log entries — exactly the shape of collection an unbounded
  query becomes a real problem for, especially for a mobile client on a metered or slow connection.
  Recognizing that distinction and fixing only the genuine gap, rather than paginating everything for
  uniformity, matches this project's standing practice of not solving a problem that doesn't exist
  alongside the one that does.

### Phase 14 — Flutter mobile application

- **One access token in memory, one refresh token in secure storage — the native-app analogue of the
  website's cookie split, not a weaker version of it.** The website keeps the refresh token in an
  HttpOnly cookie (unreachable from JS, so an XSS can't exfiltrate it) and the access token in memory
  only. A native app has no cookie jar and no equivalent "unreachable from the app's own code"
  boundary, but `flutter_secure_storage` (Android Keystore / iOS Keychain-backed) is the closest
  native analogue, so that's where the refresh token lives — and only the refresh token. The access
  token stays in-memory in `ApiClient`, exactly like the website's `AuthContext`, so a cold app start
  always has to prove itself via the stored refresh token rather than resuming a long-lived access
  token from disk.
- **A single shared `Completer` serializes concurrent 401-triggered refreshes.** If three in-flight
  requests all 401 at once (a realistic case — a screen that fires off several parallel API calls on
  load after a token just expired), naively refreshing once per 401 would race three refresh calls
  against the same refresh token, and the backend's rotation-with-reuse-detection (Phase 2) would
  correctly treat the second and third as reuse of an already-rotated token and revoke the whole
  chain, forcing an unnecessary logout. `ApiClient` instead has every concurrent 401 await the *same*
  in-flight refresh `Completer`, so only one refresh call is ever made per expiry, and all three
  original requests retry once the single refresh resolves.
- **`X-Client-Platform: mobile` is the only mobile-specific thing in the HTTP layer.** Everything else
  — pagination, error shapes, validation, role checks — is identical to what the website already
  calls, by design: Phase 13 built the contract to be platform-neutral specifically so the mobile app
  wouldn't need its own parallel API surface. The one header exists because the token-delivery
  mechanism genuinely differs (body vs. cookie, per Phase 13's own decision above), not because
  mobile needed different business logic anywhere.
- **Route protection mirrors the website's `ProtectedRoute`, with the same three-way split.**
  `go_router`'s `redirect` callback encodes exactly the website's distinction: pages that make no
  sense once authenticated (login/register — bounce to home), pages that must work regardless of
  auth state (discovery/browsing and, deliberately, `/emergency` — an emergency screen behind a login
  wall defeats the point of it), and everything else (protected, bounce to login). Keeping this a
  three-way classification instead of a simple public/private boolean is what makes `/emergency`
  correct: it needed to be reachable *both* logged in and logged out, which an auth-only or
  protected-only bucket can't express.
- **The mobile app is patient journeys only — provider dashboards and admin screens stay web-only, on
  purpose.** The master prompt scoped Phase 14 to "core patient journeys" and
  "pharmacy/diagnostics/medical-records/caregiver flows," language that describes what a patient does,
  not what a provider-owner or platform admin does. Nothing about the backend contract prevents a
  provider or admin mobile client from existing later — the same `X-Client-Platform` mechanism would
  cover it — but building one wasn't asked for here, and doing it anyway would have doubled this
  phase's scope for a user base (clinic staff, platform admins) far less likely to need a phone-first
  experience than a patient booking an appointment or finding a pharmacy.
- **A Mongoose single-nested-object default bug, not a mobile-specific one, surfaced through mobile's
  live verification.** `diagnosticOrder.model.ts` declared `reportDocument` as a bare nested object
  rather than a proper sub-schema with an explicit default, so Mongoose auto-vivified it to `{}` on
  every new document — truthy, so `hasReport` read `true` on orders that had never had a report
  uploaded, and the download-report guard's `if (!order.reportDocument)` check never fired either.
  This equally affected the website; it surfaced here because this phase's live verification booked a
  *fresh* order and happened to look at it before any report existed, which the original test suite's
  one `hasReport` assertion (post-upload only) never did. Fixed with a real `reportDocumentSchema`
  (`_id: false`) and `default: null`, which is the correct general fix for this Mongoose behavior —
  worth remembering for any future nested-object field that's meant to be optional/nullable rather
  than always-present.
