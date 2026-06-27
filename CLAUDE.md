# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Important: Next.js Version

This project uses **Next.js 16**, which has breaking changes from earlier versions. Read the relevant guide in `node_modules/next/dist/docs/` before writing any Next.js-specific code.

## Commands

```bash
npm run dev          # Start dev server
npm run build        # Production build
npm run lint         # ESLint
npm run format       # Prettier (write)
npm run format:check # Prettier (check only)
npm test             # Run all Jest tests
npm run test:watch   # Jest in watch mode

# Database (Drizzle)
npm run db:generate  # Generate migrations from schema
npm run db:migrate   # Apply migrations to DB
npm run db:studio    # Open Drizzle Studio (DB browser)
```

To run a single test file: `npx jest src/tests/health.test.ts`

## Environment Variables

Copy `.env.example` to `.env` and fill in values:

```
DATABASE_URL=        # Neon DB (development/production branch)
DATABASE_URL_TEST=   # Neon DB (dedicated test branch — keeps tests isolated)
JWT_ACCESS_SECRET=   # Signs short-lived access tokens (15 min)
JWT_REFRESH_SECRET=  # Signs long-lived refresh tokens (7 days)
```

Tests automatically swap `DATABASE_URL` → `DATABASE_URL_TEST` when the latter is set (see `src/tests/setup.ts`).

## Architecture

Full-stack Next.js App Router app (single repo, `src/` directory layout).

```
src/
├── app/
│   ├── api/          # API route handlers (Next.js route.ts convention)
│   └── ...           # React pages and layouts
├── db/
│   └── schema.ts     # Drizzle ORM schema (source of truth for DB shape)
├── lib/
│   └── db.ts         # Drizzle instance (Neon HTTP driver) — import this everywhere
└── tests/            # Jest tests — co-located by feature, not by type
```

**Data layer:** Drizzle ORM over Neon serverless Postgres. The single `db` export from `@/lib/db` is used across all API routes. Never write raw SQL — use Drizzle query builders. Schema lives in `src/db/schema.ts`; run `db:generate` + `db:migrate` after changes.

**Auth:** JWT (access + refresh tokens). Access tokens are short-lived (15 min); refresh tokens are persisted in the DB so they can be revoked. Passwords hashed with bcrypt.

**Path alias:** `@/*` maps to `src/*`.

## API Response Shape

All API routes must follow this convention (status code on the HTTP response, never in the body):

```ts
// Success
{ data: ... }

// Error
{ error: { message: string; code: string; details?: unknown } }
```

## Project Spec

Full requirements, data model decisions, and open questions are in `spec.md` at the repo root. Consult it before implementing new features — it is the authoritative source for what gets built and why.

## Development Order

The project is built bottom-up: **DB schema → auth layer → API endpoints → frontend**. Don't skip ahead; auth and API tests run against a real Neon test branch, not mocks.
