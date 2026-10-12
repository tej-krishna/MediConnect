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
mobile/     Flutter app (added in Phase 13)
```

## Prerequisites

- Node.js 20+ and npm
- MongoDB running locally (or a connection string to a reachable instance)

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

## Project status

This project is being built phase by phase. Current phase and task-level status live in
[IMPLEMENTATION_TRACKER.md](IMPLEMENTATION_TRACKER.md) — check there before assuming a feature is
complete.
