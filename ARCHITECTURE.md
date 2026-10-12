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
