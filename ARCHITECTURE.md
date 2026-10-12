# MediConnect Architecture

## Mission

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
