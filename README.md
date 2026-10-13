# MediConnect

A trustworthy healthcare access platform for rural and urban India — helping patients find the right
healthcare provider, at the right time, at a reasonable cost, with minimal search effort.

One Node.js + Express + MongoDB backend serves both the React website and (later) the Flutter mobile
app, so accounts, permissions, and business rules stay in one place.

See [ARCHITECTURE.md](ARCHITECTURE.md) for design decisions and [IMPLEMENTATION_TRACKER.md](IMPLEMENTATION_TRACKER.md)
for current build status.

## Repository layout

```
frontend/   React + TypeScript + Vite website
backend/    Node.js + Express + TypeScript REST API
mobile/     Flutter app (added in Phase 14)
```

## Prerequisites

- Node.js 20+ and npm
- MongoDB running locally (or a connection string to a reachable instance), **configured as a
  replica set** (a single-node one is enough). Appointment booking uses a MongoDB transaction to
  atomically reserve slot capacity and create the booking together, and transactions require a
  replica set — a plain standalone `mongod` will throw an error when a booking is attempted. A
  managed service like Atlas is already a replica set by default; for a local install:
  ```bash
  mongod --replSet rs0 --dbpath <your-db-path>
  # then, in a mongosh connected to it, once:
  rs.initiate()
  ```
  Automated tests don't need this — they run against an in-memory single-node replica set
  (`mongodb-memory-server`, see `backend/tests/globalSetup.ts`) regardless of your local setup.

## Backend setup

```bash
cd backend
npm install
cp .env.example .env   # edit values as needed
npm run dev             # starts the API with auto-reload
```

The API listens on `http://localhost:5000` by default and requires a reachable MongoDB instance
(see Prerequisites). Health check: `GET /api/v1/health` — returns `database: "connected"` once
Mongoose has established a connection.

Other backend scripts:

```bash
npm run build   # compile TypeScript to dist/
npm start       # run the compiled server
npm test        # run the test suite (vitest)
```

## Frontend setup

```bash
cd frontend
npm install
cp .env.example .env   # edit values as needed
npm run dev             # starts the Vite dev server (http://localhost:5173)
```

Other frontend scripts:

```bash
npm run build     # production build
npm run preview   # preview the production build locally
```

## Environment files

Each package has its own `.env.example`:

- `backend/.env.example` — port, MongoDB URI, JWT secrets, CORS origin, storage paths, rate limits.
- `frontend/.env.example` — the backend API base URL.

Copy each to `.env` in the same folder and fill in real values before running. Never commit `.env`
files — they are already excluded via `.gitignore`.

## API documentation

`backend/openapi.json` is a complete OpenAPI 3.0 spec covering every route — auth requirement,
path/query parameters, and request-body shape. It's generated, not hand-written: `scripts/generate-openapi.ts`
builds every request-body and query schema directly from the same zod schemas that validate requests
at runtime (via zod v4's native `z.toJSONSchema()`), so it can't silently drift from what the API
actually accepts the way a separately hand-maintained spec could. Route metadata (method, path, auth,
tags) is curated in that same script, since Express routes don't carry that information themselves.

Regenerate it after changing any validation schema or adding/removing a route:

```bash
cd backend
npm run generate:openapi
```

`tests/openapi.test.ts` runs the generator itself as part of the normal test suite, so a schema
change that `z.toJSONSchema()` can't represent (the way `z.coerce.date()` couldn't until the script's
`override` handled it) fails CI immediately instead of producing a stale or broken spec that goes
unnoticed. Paste `openapi.json`'s contents into any OpenAPI viewer (Swagger UI, Postman, Redocly) to
browse it, or point client-code generators at it directly.

### Mobile vs. web authentication

The website and a native Flutter app need different refresh-token handling, since a native app has
no browser cookie jar:

- **Website** (unchanged): `/auth/login` and `/auth/refresh` set the refresh token as an `HttpOnly`
  cookie scoped to `/api/v1/auth`. JavaScript never sees the raw token — that's deliberate, it's what
  keeps it safe from an XSS payload. The access token is held in memory only (see `AuthContext.tsx`).
- **Mobile**: sending the header `X-Client-Platform: mobile` on `/auth/login` or `/auth/refresh`
  additionally returns the raw refresh token in the JSON response body. The app is expected to store
  it in platform secure storage (iOS Keychain / Android Keystore via a package like
  `flutter_secure_storage`) — never plain `SharedPreferences`/unencrypted storage. `/auth/refresh` and
  `/auth/logout` both accept `{ "refreshToken": "..." }` in the body as a fallback whenever no cookie
  is present, which is always true for a native client.
- **CORS** (`CORS_ORIGIN`) only restricts browser-based callers — the same-origin policy it enforces
  is a browser mechanism. A native Android/iOS Flutter app's HTTP requests are never subject to it, so
  nothing needs to be added to `CORS_ORIGIN` for the mobile app to work; CORS only matters if a future
  Flutter **web** build is ever shipped, at which point its origin would need adding like any other
  browser client.

## Production deployment

No live deployment exists for this project — what follows is a runbook for standing one up, not a
description of infrastructure that's actually running anywhere.

**Backend**
- `npm run build` compiles to `dist/`; run it with `node dist/server.js` behind a process manager
  (pm2, systemd) so it restarts on crash, and behind a reverse proxy (nginx, Caddy) that terminates
  TLS — the app itself speaks plain HTTP.
- Set `NODE_ENV=production`. Provide every secret (`JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`,
  `MONGO_URI`) via real environment variables or a secret manager — never the `changeme-*`
  placeholders from `.env.example`, and never commit a production `.env`.
- `MONGO_URI` must point at a **replica set** in production too, for the same transactional reason
  noted under Prerequisites — a managed service (Atlas) already satisfies this.
- `CORS_ORIGIN` must exactly match the deployed frontend's origin, or the browser will block every
  request.
- `STORAGE_DRIVER=local` writes uploaded files to a local disk directory outside any publicly served
  path. That's fine for a single instance; it does **not** work across multiple backend instances
  behind a load balancer, since each instance only sees its own disk. Scaling horizontally requires
  implementing the S3-backed `StorageAdapter` the local driver already leaves room for (see
  `backend/src/storage/`) — that adapter does not exist yet, and this is a real gap, not a detail.
- No `Dockerfile` or container image is included. Adding one is straightforward (compile, copy
  `dist/` + `node_modules`, run `node dist/server.js`) but none has been written or tested here, so
  none is claimed to exist.

**Frontend**
- `npm run build` produces a static `frontend/dist/` folder servable from any static host or CDN
  (nginx, S3+CloudFront, Netlify, Vercel).
- `VITE_API_BASE_URL` is baked in at **build time** — set it to the deployed backend's public URL
  before running `npm run build`, not afterward.

## Secrets and environment management

- Every secret lives in `.env` (gitignored) locally, or real environment variables / a secret
  manager in any deployed environment — never in source.
- `backend/.env.example` and `frontend/.env.example` document every variable each package reads;
  there are no undocumented environment variables.
- The payment and notification "providers" (`backend/src/modules/payments/`,
  `backend/src/services/notification.service.ts`) have no real credentials configured anywhere in
  this codebase, by design — see ARCHITECTURE.md's Phase 2 and Phase 11 sections. Wiring in a real
  email/SMS provider or payment gateway means adding credentials to the environment and swapping the
  one exported implementation in each file; no call site elsewhere needs to change.

## Backup and recovery

No automated backup job exists in this codebase — this is guidance for operating one, not a
description of a scheduled process that runs anywhere here.

- **MongoDB**: back it up with `mongodump`/`mongorestore`, or rely on a managed service's built-in
  continuous backup and point-in-time recovery (e.g. Atlas). Take backups on a schedule appropriate
  to how much data loss is acceptable between backups — this project doesn't prescribe one.
- **Uploaded files** (`backend/storage/private/` under `STORAGE_LOCAL_ROOT`): back these up
  alongside the database, on the same schedule. Every stored document is referenced by a database
  record holding its storage key — restoring one without the other leaves either orphaned files with
  no record pointing at them, or records pointing at files that no longer exist.
- Restoring a backup restores a point in time for *both* together; restoring only one independently
  will leave the two inconsistent with each other.

## Security and privacy review

What's actually implemented, so this list can be checked against the code rather than taken on
faith:

- Passwords hashed with bcrypt (12 rounds); never logged or returned in any API response.
- Short-lived JWT access tokens plus opaque, database-tracked, rotating refresh tokens with reuse
  detection — presenting an already-rotated-out refresh token revokes every session for that user,
  not just the one request.
- Account lockout after repeated failed login attempts; suspended accounts are rejected at login and
  have every active refresh token revoked immediately on suspension (Phase 11).
- Role-based access control throughout; no endpoint lets a user grant themselves a role — every role
  beyond the default `patient` is only ever added by an admin-gated verification/review decision.
- Rate limiting on every API route, with a stricter limit specifically on login/password-reset
  endpoints to slow credential-guessing; verified by a dedicated test (Phase 12,
  `backend/tests/rateLimiter.test.ts`) rather than just configured and assumed to work.
- Every request body and query string is validated against an explicit zod schema before it reaches
  business logic — nothing is trusted on shape alone.
- File uploads are restricted by MIME type and size, stored under server-generated random filenames
  (never the client-supplied name, which is never used as a path), and never served as static files
  — every download goes through an authorization check first.
- Medical records (Phase 9) are the one module in the app where `super_admin` has **no** special
  access — only the patient themselves or a caregiver they explicitly granted a scope to.
- CORS is restricted to the single configured origin; `helmet` sets standard security headers on
  every response.
- No secret or credential is committed anywhere in this repository; `.env` is gitignored in both
  packages.
- High-stakes admin and staff decisions (provider verification, delivery-partner review, user
  suspension, support-ticket resolution, commission changes, transaction settlement) are recorded in
  an audit log (Phase 11) attributing the decision to the actor who made it.

Known gaps, stated honestly rather than left implicit:

- No dedicated CSRF token scheme. State-changing requests require a bearer access token held only in
  JS memory (never in a cookie), so a cross-site request can't carry it — the refresh-token cookie
  alone can't authenticate an API call without that token. This is a reasonable mitigation for this
  architecture, not a formal CSRF defense that's been independently reviewed.
- No WAF, DDoS protection, or infrastructure-level hardening — those are deployment/hosting-platform
  concerns outside what an application codebase can provide, and none has been configured because no
  real hosting environment exists for this project yet.
- No automated dependency-vulnerability scanning wired into CI, because there is no CI pipeline in
  this repository yet.
- No third-party penetration test or formal security audit has been performed. This review is a
  self-assessment against the code as written, not an independent verification.

## Project status

This project is being built phase by phase. Current phase and task-level status live in
[IMPLEMENTATION_TRACKER.md](IMPLEMENTATION_TRACKER.md) — check there before assuming a feature is
complete.
