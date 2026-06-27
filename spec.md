# Taskco — Build Specification

> **Status:** 🚧 In progress — living document. Filled in only from explicit answers. Nothing assumed.
> **Audience:** Written for Claude Code to read and build the project exactly as specified.
> **Last updated:** Step 2 follow-ups (Drizzle, refresh tokens, gitignore, error shape, Prettier, test branch locked; user-fields + token details remain)

---

## 0. How to read this document

- Each requirement comes directly from the project owner, captured step by step.
- Sections marked **_⏳ Pending_** have not been answered yet.
- **⚠️ Blocking** items must be resolved before the related build step can begin.
- The **Decision Log** and **Open Questions** at the bottom track what is locked vs. still open.

---

## 1. Project Overview — ✅ Locked

- **What Taskco is:** A self-managed **todo application**.
- **Model:** Multiple users register; **each user only sees and manages their own private todos** (no sharing/teams). ✅
- **Platform:** Web app (Next.js, local-only for now).
- **Core data entities:**
  - `users` — authentication (fields ⏳ to be confirmed by owner — Open Q B).
  - `refresh_tokens` (or equivalent) — to support refresh-token rotation/revocation (see §9).
  - `todos` — user tasks. **Fields ⏳ pending a later step.**

## 2. Tech Stack — ✅ Locked

- **Framework:** Next.js, full-stack, **App Router**, Next.js-recommended structure.
- **Language:** **TypeScript**.
- **Database:** Neon DB (serverless Postgres).
- **DB access / ORM:** **Drizzle ORM** (no raw SQL). Use **drizzle-kit** for schema definition & migrations.
- **Schema validation:** Zod.
- **Password hashing:** bcrypt.
- **Auth:** JWT **access + refresh tokens** (see §9).
- **Testing:** Jest, against a **real Neon** database (dedicated test branch — §11).
- **HTTP client:** Axios.
- **Styling:** Tailwind CSS.
- **Package manager:** npm.
- **Formatting:** Prettier.

## 3. Project Structure & Conventions — ✅ Locked

- Single full-stack Next.js app, App Router, **`src/` directory**, structured per Next.js recommendations.
- **Naming:** React conventions — **PascalCase** components, **camelCase** functions; applied consistently.

## 4. API Response Conventions — ✅ Locked

- Every response sets the **appropriate HTTP status code** (status on the response only — never repeated in the body).
- **Success:** `{ data: ... }`.
- **Error (structured / "clean"):** `{ error: { message: string, code: string, details?: ... } }`.
  - For **Zod validation failures**, return HTTP **400** with field-level issues in `error.details`.

## 5. Development Workflow — ✅ Locked

Bottom-up: 1) **DB schema**, 2) **Auth layer (+tests)**, 3) **API endpoints (+tests)**, 4) **Frontend**.

- **Write test cases at every step.**

## 6. Working Agreement (process rules) — ✅ Locked

- **Always** enumerate possible edge cases where the implementation might fail.
- If any requirement is unclear, **do not write code** — ask questions until fully clear.
- **Make no assumptions.**

## 7. Project Setup & Version Control (Step 2) — ✅ Locked

### 7.1 Scaffolding

- Create a **new Next.js project** (App Router) honoring all Step 1 decisions: TypeScript, `src/`, Tailwind, ESLint, Prettier, npm.

### 7.2 Environment & Configuration

- DB connection string supplied via **`DATABASE_URL`**, read from a **`.env`** file.
- Provide a **`.env.example`** with all required vars: `DATABASE_URL`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, and `DATABASE_URL_TEST` (test branch). _Final token var names depend on Open Q D._

### 7.3 Version Control (Git)

- Run **`git init`**.
- Create a **`.gitignore`** covering the standard Next.js set **plus** the explicitly requested entries:
  ```
  # dependencies
  node_modules
  # next.js
  .next/
  out/
  # build
  build
  dist
  # env — keep .env.example TRACKED
  .env
  .env.local
  .env.*.local
  .env.test
  # logs / debug
  *.log
  npm-debug.log*
  # testing
  coverage/
  # misc / OS
  .DS_Store
  *.pem
  # typescript
  *.tsbuildinfo
  next-env.d.ts
  ```

  - **Important:** `.env` is ignored but **`.env.example` must remain tracked** — do not use a broad `.env*` rule that would exclude the example file.
- Run **`git add .`**.
- **Before committing**, run **`git status`** and verify **`.env` and `node_modules` are NOT tracked**.

## 8. Database Health Check Endpoint (Step 2) — ✅ Locked

- **Route:** `GET /api/health` — reports whether the DB connection succeeded or failed.
- **Success:** HTTP **200**, body `{ data: { status: "ok", database: "connected" } }`.
- **Failure:** HTTP **503**, body `{ error: { message: "Database connection failed", code: "DB_UNAVAILABLE" } }`.
- Connectivity check runs **through Drizzle** (no raw SQL), e.g. a trivial `SELECT 1`.

## 9. Authentication & Security — ⚠️ Partial

- **Scope:** Email + password only. No email verification, password reset, or roles.
- **Endpoints:** sign-up, login, **token refresh** (e.g. `POST /api/auth/refresh`). (Logout = invalidate refresh token / client discards tokens.)
- **Security rules (✅ Locked):**
  - **Never** store the raw/plaintext password.
  - **Always** hash with **bcrypt** before storing.
  - **Never** return the password (hashed or plaintext) in **any** response.
- **Token model (✅ decided):** short-lived **access token** + long-lived **refresh token**. When the access token expires, the client uses the refresh token to obtain a new access token automatically (keeping the user logged in). Frontend uses an **Axios interceptor** to auto-refresh on `401`.
- **Token details (⏳ to confirm — Open Q D):** access/refresh **expiry durations**, **storage** (httpOnly cookie vs `Authorization: Bearer` for access; httpOnly cookie recommended for refresh), and whether refresh tokens are **persisted (hashed) & revocable** in a `refresh_tokens` table.
- **`users` table fields:** ⏳ owner to confirm (Open Q B).

## 10. Features & Functionality

**_⏳ Pending — later step (will define `todos` fields)._**

## 11. Non-Functional Requirements — ✅ Locked

- **Testing data:** Tests run against a **real Neon** database, on a **dedicated Neon test branch** (recommended & adopted) with its own connection string (`DATABASE_URL_TEST` / `.env.test`), so tests stay isolated and resettable.
- **API tests:** API endpoint test cases are **included** (alongside schema/auth tests).
- **Deployment:** None — **runs locally only**.
- **Env vars:** `DATABASE_URL`, `DATABASE_URL_TEST`, JWT secrets (names pending Open Q D).

## 12. Coding Standards — ✅ Locked

- Naming: see §3.
- **ESLint** (Next.js default) + **Prettier** for formatting.
- Commit conventions: none specified (free-form) unless added later.

---

## Decision Log

| #   | Topic             | Decision                                                                                          | Status                     |
| --- | ----------------- | ------------------------------------------------------------------------------------------------- | -------------------------- |
| 1   | Framework         | Next.js full-stack, App Router, `src/`, Next.js structure                                         | ✅                         |
| 2   | Language          | TypeScript                                                                                        | ✅                         |
| 3   | Database          | Neon DB (serverless Postgres)                                                                     | ✅                         |
| 4   | ORM               | Drizzle ORM + drizzle-kit (no raw SQL)                                                            | ✅                         |
| 5   | Validation        | Zod                                                                                               | ✅                         |
| 6   | Password security | bcrypt; never store raw; never return password                                                    | ✅                         |
| 7   | Auth model        | JWT access + refresh tokens; email+password only                                                  | ✅ (token details pending) |
| 8   | Testing           | Jest vs real Neon **test branch**; tests every step incl. API                                     | ✅                         |
| 9   | HTTP client       | Axios (+ auto-refresh interceptor)                                                                | ✅                         |
| 10  | Styling           | Tailwind CSS                                                                                      | ✅                         |
| 11  | Package manager   | npm                                                                                               | ✅                         |
| 12  | API response      | success `{ data }`; error `{ error: { message, code, details? } }`; HTTP status on response only  | ✅                         |
| 13  | Naming            | React conventions                                                                                 | ✅                         |
| 14  | Dev approach      | Bottom-up: schema → auth → API → frontend                                                         | ✅                         |
| 15  | Process           | Edge cases; ask before assuming; no assumptions                                                   | ✅                         |
| 16  | Deployment        | Local only                                                                                        | ✅                         |
| 17  | Env config        | Read from `.env`; provide `.env.example`                                                          | ✅                         |
| 18  | Health check      | `GET /api/health` (200 ok / 503 fail) via Drizzle                                                 | ✅                         |
| 19  | Git setup         | `git init`; full Next.js `.gitignore` (keep `.env.example`); `git add .`; verify via `git status` | ✅                         |
| 20  | Formatting        | Prettier                                                                                          | ✅                         |

## Open Questions

**Blocking — auth (last detail):**

- D. Access + refresh token specifics: **expiry durations** (suggest access **15 min**, refresh **7 days**), **storage** (suggest access via `Authorization: Bearer`, refresh via **httpOnly secure cookie**), and **persist refresh tokens (hashed) in DB for revocation?** Confirm or adjust.

**Owner will confirm later:**

- B. `users` table fields (suggested: `id`, `email` unique, `passwordHash`, `createdAt`, `updatedAt`).
- Todo entity fields (a later step).

**Optional / recommended (already adopted unless you object):**

- G. Component tests via **React Testing Library** when the frontend is built. API tests: invoke route handlers directly (e.g. via `next-test-api-route-handler`). Object if you prefer otherwise.
