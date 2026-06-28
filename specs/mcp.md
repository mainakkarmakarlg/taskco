You are working in the Taskco repo. Read spec.md first and follow it exactly.

STACK: Next.js (App Router, src/, TypeScript) · Drizzle ORM + drizzle-kit on Neon Postgres · jose (JWT) · Zod · bcrypt · Jest (tests run against the Neon test branch via DATABASE_URL_TEST) · npm. NO raw SQL. Do not add fields, endpoints, or features that aren't requested.

CONVENTIONS (from taskco-spec.md):

- Success: { data: ... }. Error: { error: { message, code } }. HTTP status on the response only.
- Payload nesting is nested for consistency with the project routes: { data: { task } } and { data: { tasks } }.
- Auth: the existing requireAuth helper reads `Authorization: Bearer <token>`, verifies with jose (same secret/alg/claims as login), and gives the handler the authenticated user. Use it on every endpoint below.
- Ownership failures return 404 consistently. Match the existing project routes' style, imports, and error handling exactly.

PRECONDITIONS (already built — do not recreate): users + projects Drizzle tables, requireAuth, and the full projects CRUD with ownership.

MCP SETUP (do this first):

- Add Context7 and Postgres MCP to .claude/settings.json WITHOUT overwriting existing settings; restart the session and verify both work (Context7 returns live docs for Drizzle; Postgres MCP can list tables).
- Use Context7 to confirm current Drizzle pgEnum / relation / FK syntax BEFORE writing schema code. Use Postgres MCP to inspect the Neon DB and confirm the migration after applying it.
- If a server fails: check Docker is running, the connection string is valid, and package names are current.

TASK 1 — Schema (extend the existing Drizzle schema; do not create a new one):

- Enums (pgEnum): task_status = TODO | IN_PROGRESS | DONE; priority = LOW | MEDIUM | HIGH.
- tasks table: id (text PK, CUID via $defaultFn), title (required), description (optional), status (task_status, default TODO), priority (priority, default MEDIUM), dueDate (timestamp, optional), projectId (text, not null, FK → projects.id, onDelete: 'cascade'), createdAt (timestamp default now()). NO other fields.
- Add the task.project relation and the reciprocal project.tasks relation.
- Generate + apply a drizzle-kit migration; confirm the table, enum types, and FK via Postgres MCP and drizzle-kit studio.

TASK 2 — POST /api/projects/[id]/tasks (protected):

- requireAuth. Load the parent project by route [id]; verify the authenticated user owns it BEFORE creating (reuse the existing ownership logic — don't reimplement).
- Zod body: title required; description, status, priority, dueDate optional with correct types/defaults. Validate status/priority as real enum values, not plain strings.
- Success → { data: { task } }. Failures: 401 (auth), 400 (validation), 404 (project missing OR not owned — never reveal another user's project).

TASK 3 — GET /api/projects/[id]/tasks (protected):

- requireAuth; verify project ownership with the SAME pattern as create, BEFORE any query.
- Optional query params status and/or priority; validate they are valid enum values before querying (invalid → 400). No params → all tasks for the project.
- Filter at the DB level with Drizzle `where`; when both are supplied, apply both (AND). Sort by createdAt DESC.
- Success → { data: { tasks } }.

SECURITY: ownerId/ownership always derives from the authenticated user, never from the body or params. Every query scopes to the owner at the DB level.

TESTS (Jest, against the test branch): create tasks across multiple statuses/priorities and assert: no filter → all; status-only → that status; priority-only → that priority; both → intersection; and a non-owner cannot create or read tasks under another user's project (→ 404). Assert status code AND body. Clean up data so tests are repeatable.

OPTIONAL (only if time remains): PATCH /api/tasks/[id] (Zod .partial() over title, description, status, priority, dueDate) and DELETE /api/tasks/[id] (→ { data: { deleted: true } }), ownership verified via task → project → owner, same 404 + envelopes + tests.

WORKFLOW:

- Verify unfamiliar Drizzle/Next.js APIs with Context7 before using them — don't assume.
- Self-review before finishing: every path returns a response? every query applies the ownership filter at the DB level? every error uses { error: { message, code } }? enums validated as enums? what if the project/task id doesn't exist?
- If a bug appears (especially filtering), report it as SYMPTOM / CODE / TRIED / ASK and fix only the relevant `where` clause rather than regenerating the endpoint.
- Run `npm test`; make all tests pass without rewriting passing tests to mask failures.

Stop and ask me if anything is ambiguous instead of assuming.
