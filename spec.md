# Taskco — Build Specification

> **Status:** 🚧 In progress — living document. Filled in only from explicit answers. Nothing assumed.
> **Audience:** Written for Claude Code to read and build the project exactly as specified.
> **Last updated:** Modules 6 & 7 / Lab 3 folded in (auth completion + projects CRUD), refactored to the Taskco stack.

---

## 0. How to read this document

- Requirements come directly from the project owner, captured step by step.
- **_⏳ Pending_** = not yet answered. **⚠️ Blocking** = resolve before that build step.
- **🔁 Refactor note** = translated from a Prisma/Fastify/Vitest/pnpm source onto the locked Taskco stack (Next.js + Drizzle + Jest + npm + jose).

---

## 1. Project Overview — ✅ Locked

- **What Taskco is:** A self-managed **todo application**.
- **Domain model:** `users` → `projects` → `tasks`. Each user only sees/manages **their own** projects (and tasks). No sharing/teams.
- **Build order of entities:** `users` (done in auth module) → `projects` (this module) → `tasks` (Lab 4, later).
- **Platform:** Web app (Next.js, local-only for now).

## 2. Tech Stack — ✅ Locked

Next.js (App Router, `src/`, TypeScript) · Neon Postgres · **Drizzle ORM** + drizzle-kit · Zod · bcrypt · **jose** (JWT) · **Jest** (real Neon test branch) · Axios · Tailwind · npm · Prettier + ESLint. No raw SQL.

## 3. Structure & Conventions — ✅ Locked

- Single full-stack Next.js app, App Router, `src/`.
- **Naming:** PascalCase components, camelCase functions.
- **Routes (🔁 from `/auth/*`, `/projects/*`):** `src/app/api/auth/...`, `src/app/api/projects/...`; dynamic routes use `[id]` folders (e.g. `src/app/api/projects/[id]/route.ts`).

## 4. API Response Conventions — ⚠️ Confirm

- Appropriate **HTTP status** on every response (status on the response only).
- **Success:** `{ data: ... }`.
- **Error:** locked as structured `{ error: { message, code, details? } }`.
  - ⚠️ **All three lab docs instead use plain `{ error: string }`.** Pick one globally — Open Q E.
- Zod failures → **400**, details in `error.details` (or message string, per E).

## 5. Development Workflow — ✅ Locked

Bottom-up: **schema → auth → API → frontend**. Tests at every step.

- **Optional TDD** for project endpoints: write a failing test first (e.g. auth-protected create, ownership filter), confirm it fails, implement the minimum to pass.

## 6. Working Agreement — ✅ Locked

- Always enumerate edge cases. If unclear, **don't write code — ask**. **No assumptions.** No unrequested features/fields.
- **Debugging protocol (Trap #6):** never paste only an error. Use **SYMPTOM / CODE / TRIED / ASK**:
  - **SYMPTOM** — exact error/behavior, pasted verbatim, no speculation.
  - **CODE** — only the relevant function/block (~10–15 lines of context around the failing line); not the whole file unless asked.
  - **TRIED** — specific steps actually taken (never claim unverified checks).
  - **ASK** — one specific question with a specific answer.
- **Pre-accept review questions:** does every code path return a response? what if an id doesn't exist? does every error follow the agreed error envelope? does every query apply the ownership filter?

## 7. Project Setup & Version Control — ✅ Locked

- Scaffold new Next.js app (App Router, TS, `src/`, Tailwind, ESLint, Prettier, npm).
- Read `DATABASE_URL` from `.env`; provide `.env.example` (`DATABASE_URL`, `DATABASE_URL_TEST`, `JWT_SECRET`). Ensure `JWT_SECRET` is set before running auth.
- `git init`; `.gitignore` (standard Next.js set + `node_modules`, `.env`, `dist`; keep `.env.example` tracked); `git add .`; verify via `git status`; commit.

## 8. Database Health Check — ✅ Locked

`GET /api/health` → 200 `{ data: { status: "ok", database: "connected" } }` / 503 error. Checked through Drizzle.

## 9. Authentication Module — ✅ Detailed (refactored)

> Scope now COMPLETE across Modules 2 + 6: User model, register, login, **JWT middleware**, **`/auth/me`**, comprehensive tests.

### 9.1 `users` table (Drizzle, 🔁 from Prisma) — ✅ fields locked

`id` (text PK, CUID via `$defaultFn`), `email` (unique, not null), `passwordHash` (not null; never `password`), `name` (not null), `createdAt` (timestamp default now()). **No** `updatedAt`/`role`/`avatar`/`isActive`. Gains a **`projects` relation** (added with the Project model, §10). Migration name e.g. `add-user-model`; verify via `drizzle-kit studio`.

### 9.2 `POST /api/auth/register` — body `email,password,name` (all required, Zod: valid email, password ≥8, name non-empty) → bcrypt-hash → jose JWT (explicit payload/secret/expiry) → `{ data: { token, user } }`, **user excludes `passwordHash`**. Errors: validation 400, duplicate email 409.

### 9.3 `POST /api/auth/login` — body `email,password` → bcrypt.compare → identical JWT config to register → `{ data: { token, user } }`. **Reuse the register handler's patterns** (Trap #1); invalid creds → 401, message generic vs specific per Open Q L. No lockout/attempt tracking.

### 9.4 JWT Middleware (🔁 Fastify preHandler → Next.js auth helper) — ✅

- Implement a reusable **`requireAuth`/`withAuth` helper** wrapping protected route handlers (the Next.js analog of a Fastify `preHandler`).
- Reads `Authorization: Bearer <token>`; verifies with **jose** using the **same algorithm, secret, and claims as login**; resolves the authenticated **user** and makes it available to the handler (🔁 replaces Fastify `request.user`).
- Returns **401** (standard error envelope) when the header is **missing, malformed, invalid, or expired**.
- **Verify:** matches login's verification exactly; consistent handling of all failure cases; tested with valid / missing / invalid / genuinely expired tokens.

### 9.5 `GET /api/auth/me` (protected) — ✅

- Uses the auth helper. Returns only `id`, `email`, `name`, `createdAt`. **Never `passwordHash`.**
- 🔁 The Drizzle query must **explicitly select** those columns (don't rely on TS types to hide fields).
- Serves as the **reference implementation** for all future protected routes.
- **Verify:** valid token → profile; no token → 401.

### 9.6 Comprehensive Auth Tests (Jest, 🔁 from Vitest) — ✅

Cover: register success, duplicate email, missing fields; login success, wrong password, nonexistent email; `/me` with valid token, no token, **genuinely expired** token, malformed token.

- Invoke route handlers directly (🔁 from `app.inject()`); isolate by **cleaning the DB between runs** (test branch); **≥ as many failure as success** cases; assert **status + body**; descriptive test names. Run `npm test` (🔁 from `pnpm test`); fix failures, don't rewrite.

### 9.7 Security Rules — never store raw passwords; always bcrypt-hash; never return password in any response.

## 10. Projects Module — ✅ Detailed (refactored from Lab 3)

### 10.1 `projects` table (Drizzle, 🔁 from Prisma) — ✅

- `id` (text PK, CUID via `$defaultFn`), `name` (not null, required), `description` (nullable, optional), `color` (text, not null, **default `#3b82f6`**), `ownerId` (text, not null, **FK → `users.id`**), `createdAt` (timestamp default now()).
- `owner` relation → `users`; add the reciprocal `projects` relation on `users` (Drizzle `relations()`).
- **Do NOT add a `tasks` relation yet** (Lab 4). No extra fields.
- Generate & apply a new drizzle-kit migration; verify table/columns/relations in `drizzle-kit studio`.

### 10.2 `POST /api/projects` (protected) — ✅

- Requires auth (§9.4). **`ownerId` MUST come from the authenticated user — never from the request body, under any circumstances** (mandatory security requirement).
- Zod-validate body: `name` required, `description` optional, `color` optional (default `#3b82f6`).
- Success → `{ data: { project } }`; validation failures → standard error envelope.
- **Verify:** stored `ownerId` equals the authenticated user's id.

### 10.3 `GET /api/projects` (protected) — ✅

- Returns **only** projects where `ownerId` = authenticated user. **Must never return all projects** (top security requirement).
- `{ data: { projects: [...] } }`.
- Decide whether to include related data such as **task count** (Open Q O; depends on the Task model, Lab 4).

### 10.4 `GET /api/projects/[id]` (protected) — ✅

- Query must filter by **both project `id` AND the authenticated user's `ownerId`** (lookup by id alone is insufficient — security).
- Include the project's **task count** (🔁 Prisma `_count` → Drizzle count via relational query/`sql` count; depends on Task model, Lab 4).
- Not found / not owned → consistent **403 or 404** (Open Q N). `{ data: { project } }`.

### 10.5 `PATCH /api/projects/[id]` (protected, partial update) — ✅

- Zod **`.partial()`** over editable fields (`name`, `description`, `color`) — no field required.
- **Verify ownership before updating**; failure → consistent 403/404 (Open Q N).
- `{ data: { project } }`. **Iterate on existing code; don't rewrite from scratch.**

### 10.6 `DELETE /api/projects/[id]` (protected) — ✅

- **Verify ownership before deleting**; never delete others' projects.
- **Deleting a project deletes its tasks** — via Drizzle FK `onDelete: 'cascade'` (preferred, applies once Task exists) or explicit deletion.
- Success → `{ data: { deleted: true } }`; failures → standard error envelope.

### 10.7 Ownership Isolation Test (Jest, 🔁 from Vitest) — ✅

- Register **User A** and **User B** (different creds); get separate JWTs. As A, create a project.
- As **B**: `GET /api/projects` returns **zero** projects; and `GET/PATCH/DELETE /api/projects/[A's id]` each return **403/404** (consistent).
- Reference the existing auth test file; create two independent users w/ separate JWTs; assert **status + standard envelope**; **clean up all created data** so it's repeatable.
- Interpretation: if B sees A's projects → `GET /projects` missing ownership filter; if B can modify/delete → per-endpoint ownership missing. **Fix before continuing.**

### 10.8 Lab 3 Completion Checklist

POST creates for the auth user · GET lists only owned · GET/:id returns project + task count only when owned · PATCH updates only owned · DELETE removes project + its tasks only when authorized · ownership test passes fully · every endpoint uses the agreed `{ data }`/`{ error }` envelopes. **If the ownership test fails, do not proceed.**

## 11. Tasks Module — _⏳ Pending (Lab 4, later)_

The `tasks` (todo) model, its relation to `projects`, cascade behavior, and the task count used by §10.3–10.4 are defined in a later lab.

## 12. Non-Functional & Standards — ✅ Locked

Tests vs real Neon **test branch** (`DATABASE_URL_TEST`), isolated/resettable · API tests included · local-only deployment · React naming · ESLint + Prettier.

---

## Decision Log (delta)

| #   | Topic                | Decision                                                                                                                           | Status |
| --- | -------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | ------ |
| 24  | JWT middleware       | Next.js `requireAuth/withAuth` helper (🔁 Fastify preHandler); jose verify same as login; 401 on missing/malformed/invalid/expired | ✅     |
| 25  | `/api/auth/me`       | Protected; returns id,email,name,createdAt via explicit Drizzle select; never passwordHash; reference for protected routes         | ✅     |
| 26  | Auth tests           | Jest, handler-invoke, DB cleanup, ≥failure≥success, status+body, genuinely-expired tokens                                          | ✅     |
| 27  | `projects` model     | id(cuid), name, description?, color default `#3b82f6`, ownerId→users, createdAt; +users.projects relation; NO tasks relation yet   | ✅     |
| 28  | POST /projects       | protected; ownerId from auth user ONLY (never body); `{ data: { project } }`                                                       | ✅     |
| 29  | GET /projects        | protected; only owner's; `{ data: { projects } }`                                                                                  | ✅     |
| 30  | GET /projects/:id    | filter id AND ownerId; include task count; `{ data }`                                                                              | ✅     |
| 31  | PATCH /projects/:id  | Zod `.partial()`; ownership check; iterate not rewrite                                                                             | ✅     |
| 32  | DELETE /projects/:id | ownership check; cascade-delete tasks; `{ data: { deleted: true } }`                                                               | ✅     |
| 33  | Ownership test       | A/B isolation; Jest; cleanup; status+envelope                                                                                      | ✅     |
| 34  | TDD                  | Optional for project endpoints                                                                                                     | ✅     |
| 35  | Debugging            | SYMPTOM/CODE/TRIED/ASK protocol (Trap #6) + pre-accept review questions                                                            | ✅     |

## Open Questions

**Decide once — affects many endpoints:**

- E. **Error envelope:** keep your locked structured `{ error: { message, code, details? } }`, or switch to the labs' plain **`{ error: string }`** (used consistently across all three docs)?
- N. **Ownership failure status:** **403** or **404** — pick one and apply consistently across all `/projects/[id]` routes. (Recommend 404 to avoid leaking existence.)

**Auth token decisions (still open):**

- D. **Token model:** all lab docs use a **single bearer `token`** (no refresh; middleware just 401s on expiry). This conflicts with your earlier **access+refresh** choice. Follow the labs (single token) or keep access+refresh?
- M. **Token expiry** value (e.g. 15m / 1h / 7d).
- L. **Invalid-login message:** generic vs specific (recommend generic).

**Dependencies / later:**

- O. **GET /projects task count:** include per-project task count in the list, or only in `GET /:id`? (Both depend on the Task model — Lab 4.)
