import { POST as register } from '@/app/api/auth/register/route';
import { POST as createTask, GET as listTasks } from '@/app/api/projects/[id]/tasks/route';
import { PATCH as updateTask, DELETE as deleteTask } from '@/app/api/tasks/[id]/route';
import { db } from '@/lib/db';
import { users, projects, tasks } from '@/db/schema';
import { eq } from 'drizzle-orm';

const USER_A = { email: 'tasks-user-a@taskco.test', password: 'password123', name: 'User A' };
const USER_B = { email: 'tasks-user-b@taskco.test', password: 'password123', name: 'User B' };

let tokenA: string;
let tokenB: string;
let userAId: string;
let projectId: string;

function makeRegisterRequest(user: typeof USER_A): Request {
  return new Request('http://localhost/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(user),
  });
}

function makePostRequest(body: unknown, token?: string): Request {
  return new Request(`http://localhost/api/projects/${projectId}/tasks`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
}

function makeGetRequest(query?: string, token?: string): Request {
  const url = `http://localhost/api/projects/${projectId}/tasks${query ? `?${query}` : ''}`;
  return new Request(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
}

function makePatchRequest(id: string, body: unknown, token?: string): Request {
  return new Request(`http://localhost/api/tasks/${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
}

function makeDeleteRequest(id: string, token?: string): Request {
  return new Request(`http://localhost/api/tasks/${id}`, {
    method: 'DELETE',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
}

function makeProjectParams(id?: string) {
  return { params: Promise.resolve({ id: id ?? projectId }) };
}

function makeTaskParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

async function cleanupUsers() {
  await db.delete(users).where(eq(users.email, USER_A.email));
  await db.delete(users).where(eq(users.email, USER_B.email));
}

beforeAll(async () => {
  await cleanupUsers();

  const resA = await register(makeRegisterRequest(USER_A));
  const bodyA = await resA.json();
  tokenA = bodyA.data.token;
  userAId = bodyA.data.user.id;

  const resB = await register(makeRegisterRequest(USER_B));
  const bodyB = await resB.json();
  tokenB = bodyB.data.token;

  const [proj] = await db.insert(projects).values({ name: 'Test Project', userId: userAId }).returning();
  projectId = proj.id;
});

afterAll(async () => {
  await cleanupUsers();
});

// ─── POST /api/projects/[id]/tasks ───────────────────────────────────────────

describe('POST /api/projects/[id]/tasks', () => {
  it('creates a task with title only (defaults applied)', async () => {
    const res = await createTask(makePostRequest({ title: 'Setup CI' }, tokenA), makeProjectParams());
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.data.task.title).toBe('Setup CI');
    expect(body.data.task.status).toBe('TODO');
    expect(body.data.task.priority).toBe('MEDIUM');
    expect(body.data.task.description).toBeNull();
    expect(body.data.task.dueDate).toBeNull();
    expect(body.data.task.projectId).toBe(projectId);
    expect(body.data.task.id).toBeDefined();

    await db.delete(tasks).where(eq(tasks.id, body.data.task.id));
  });

  it('creates a task with all optional fields', async () => {
    const res = await createTask(
      makePostRequest({
        title: 'Write docs',
        description: 'API reference',
        status: 'IN_PROGRESS',
        priority: 'HIGH',
        dueDate: '2026-12-31T00:00:00.000Z',
      }, tokenA),
      makeProjectParams(),
    );
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.data.task.status).toBe('IN_PROGRESS');
    expect(body.data.task.priority).toBe('HIGH');
    expect(body.data.task.description).toBe('API reference');
    expect(body.data.task.dueDate).toBeDefined();

    await db.delete(tasks).where(eq(tasks.id, body.data.task.id));
  });

  it('returns 400 when title is missing', async () => {
    const res = await createTask(makePostRequest({ status: 'TODO' }, tokenA), makeProjectParams());
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 when title is empty', async () => {
    const res = await createTask(makePostRequest({ title: '' }, tokenA), makeProjectParams());
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 when status is not a valid enum value', async () => {
    const res = await createTask(makePostRequest({ title: 'x', status: 'PENDING' }, tokenA), makeProjectParams());
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 when priority is not a valid enum value', async () => {
    const res = await createTask(makePostRequest({ title: 'x', priority: 'URGENT' }, tokenA), makeProjectParams());
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 401 when no token is provided', async () => {
    const res = await createTask(makePostRequest({ title: 'Unauthorized' }), makeProjectParams());
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.error.code).toBe('MISSING_TOKEN');
  });

  it('returns 404 for a non-existent project', async () => {
    const res = await createTask(makePostRequest({ title: 'Ghost' }, tokenA), makeProjectParams('does-not-exist'));
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.error.code).toBe('NOT_FOUND');
  });

  it('returns 404 when the project belongs to another user', async () => {
    const res = await createTask(makePostRequest({ title: 'Steal' }, tokenB), makeProjectParams());
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.error.code).toBe('NOT_FOUND');
  });
});

// ─── GET /api/projects/[id]/tasks ────────────────────────────────────────────

describe('GET /api/projects/[id]/tasks', () => {
  let taskTodoLow: string;
  let taskTodoHigh: string;
  let taskDoneMedium: string;
  let taskInProgressLow: string;

  beforeAll(async () => {
    const insert = async (data: object) => {
      const res = await createTask(makePostRequest(data, tokenA), makeProjectParams());
      const body = await res.json();
      return body.data.task.id as string;
    };
    taskTodoLow = await insert({ title: 'T1', status: 'TODO', priority: 'LOW' });
    taskTodoHigh = await insert({ title: 'T2', status: 'TODO', priority: 'HIGH' });
    taskDoneMedium = await insert({ title: 'T3', status: 'DONE', priority: 'MEDIUM' });
    taskInProgressLow = await insert({ title: 'T4', status: 'IN_PROGRESS', priority: 'LOW' });
  });

  afterAll(async () => {
    for (const id of [taskTodoLow, taskTodoHigh, taskDoneMedium, taskInProgressLow]) {
      if (id) await db.delete(tasks).where(eq(tasks.id, id));
    }
  });

  it('returns all tasks when no filters are provided', async () => {
    const res = await listTasks(makeGetRequest(undefined, tokenA), makeProjectParams());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(Array.isArray(body.data.tasks)).toBe(true);
    const ids = body.data.tasks.map((t: { id: string }) => t.id);
    expect(ids).toContain(taskTodoLow);
    expect(ids).toContain(taskTodoHigh);
    expect(ids).toContain(taskDoneMedium);
    expect(ids).toContain(taskInProgressLow);
  });

  it('filters by status only', async () => {
    const res = await listTasks(makeGetRequest('status=TODO', tokenA), makeProjectParams());
    const body = await res.json();

    expect(res.status).toBe(200);
    const ids = body.data.tasks.map((t: { id: string }) => t.id);
    expect(ids).toContain(taskTodoLow);
    expect(ids).toContain(taskTodoHigh);
    expect(ids).not.toContain(taskDoneMedium);
    expect(ids).not.toContain(taskInProgressLow);
  });

  it('filters by priority only', async () => {
    const res = await listTasks(makeGetRequest('priority=LOW', tokenA), makeProjectParams());
    const body = await res.json();

    expect(res.status).toBe(200);
    const ids = body.data.tasks.map((t: { id: string }) => t.id);
    expect(ids).toContain(taskTodoLow);
    expect(ids).toContain(taskInProgressLow);
    expect(ids).not.toContain(taskTodoHigh);
    expect(ids).not.toContain(taskDoneMedium);
  });

  it('filters by both status and priority (intersection)', async () => {
    const res = await listTasks(makeGetRequest('status=TODO&priority=LOW', tokenA), makeProjectParams());
    const body = await res.json();

    expect(res.status).toBe(200);
    const ids = body.data.tasks.map((t: { id: string }) => t.id);
    expect(ids).toContain(taskTodoLow);
    expect(ids).not.toContain(taskTodoHigh);
    expect(ids).not.toContain(taskDoneMedium);
    expect(ids).not.toContain(taskInProgressLow);
  });

  it('returns 400 for an invalid status filter value', async () => {
    const res = await listTasks(makeGetRequest('status=PENDING', tokenA), makeProjectParams());
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 for an invalid priority filter value', async () => {
    const res = await listTasks(makeGetRequest('priority=URGENT', tokenA), makeProjectParams());
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 401 when no token is provided', async () => {
    const res = await listTasks(makeGetRequest(), makeProjectParams());
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.error.code).toBe('MISSING_TOKEN');
  });

  it('returns 404 for a non-existent project', async () => {
    const res = await listTasks(makeGetRequest(undefined, tokenA), makeProjectParams('does-not-exist'));
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.error.code).toBe('NOT_FOUND');
  });

  it('returns 404 when another user tries to list tasks from the project', async () => {
    const res = await listTasks(makeGetRequest(undefined, tokenB), makeProjectParams());
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.error.code).toBe('NOT_FOUND');
  });
});

// ─── PATCH /api/tasks/[id] ───────────────────────────────────────────────────

describe('PATCH /api/tasks/[id]', () => {
  let taskId: string;

  beforeEach(async () => {
    const res = await createTask(
      makePostRequest({ title: 'Original', description: 'Original desc', status: 'TODO', priority: 'LOW' }, tokenA),
      makeProjectParams(),
    );
    const body = await res.json();
    taskId = body.data.task.id;
  });

  afterEach(async () => {
    if (taskId) await db.delete(tasks).where(eq(tasks.id, taskId));
  });

  it('updates title', async () => {
    const res = await updateTask(makePatchRequest(taskId, { title: 'Updated' }, tokenA), makeTaskParams(taskId));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.task.title).toBe('Updated');
    expect(body.data.task.description).toBe('Original desc');
  });

  it('updates status to DONE', async () => {
    const res = await updateTask(makePatchRequest(taskId, { status: 'DONE' }, tokenA), makeTaskParams(taskId));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.task.status).toBe('DONE');
  });

  it('updates priority to HIGH', async () => {
    const res = await updateTask(makePatchRequest(taskId, { priority: 'HIGH' }, tokenA), makeTaskParams(taskId));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.task.priority).toBe('HIGH');
  });

  it('clears description by setting it to null', async () => {
    const res = await updateTask(makePatchRequest(taskId, { description: null }, tokenA), makeTaskParams(taskId));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.task.description).toBeNull();
  });

  it('returns 400 when no fields are provided', async () => {
    const res = await updateTask(makePatchRequest(taskId, {}, tokenA), makeTaskParams(taskId));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error.code).toBe('NO_FIELDS');
  });

  it('returns 400 when title is empty', async () => {
    const res = await updateTask(makePatchRequest(taskId, { title: '' }, tokenA), makeTaskParams(taskId));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 when status is invalid', async () => {
    const res = await updateTask(makePatchRequest(taskId, { status: 'PENDING' }, tokenA), makeTaskParams(taskId));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 401 when no token is provided', async () => {
    const res = await updateTask(makePatchRequest(taskId, { title: 'x' }), makeTaskParams(taskId));
    const body = await res.json();

    expect(res.status).toBe(401);
  });

  it('returns 404 for a non-existent task', async () => {
    const res = await updateTask(makePatchRequest('does-not-exist', { title: 'Ghost' }, tokenA), makeTaskParams('does-not-exist'));
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.error.code).toBe('NOT_FOUND');
  });

  it('returns 404 when another user tries to update the task', async () => {
    const res = await updateTask(makePatchRequest(taskId, { title: 'Steal' }, tokenB), makeTaskParams(taskId));
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.error.code).toBe('NOT_FOUND');
  });
});

// ─── DELETE /api/tasks/[id] ──────────────────────────────────────────────────

describe('DELETE /api/tasks/[id]', () => {
  it('deletes the task and returns its id', async () => {
    const createRes = await createTask(makePostRequest({ title: 'Delete me' }, tokenA), makeProjectParams());
    const { data: created } = await createRes.json();

    const res = await deleteTask(makeDeleteRequest(created.task.id, tokenA), makeTaskParams(created.task.id));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.id).toBe(created.task.id);

    const [gone] = await db.select().from(tasks).where(eq(tasks.id, created.task.id)).limit(1);
    expect(gone).toBeUndefined();
  });

  it('returns 401 when no token is provided', async () => {
    const createRes = await createTask(makePostRequest({ title: 'Auth guard' }, tokenA), makeProjectParams());
    const { data: created } = await createRes.json();

    const res = await deleteTask(makeDeleteRequest(created.task.id), makeTaskParams(created.task.id));
    expect(res.status).toBe(401);

    await db.delete(tasks).where(eq(tasks.id, created.task.id));
  });

  it('returns 404 for a non-existent task', async () => {
    const res = await deleteTask(makeDeleteRequest('does-not-exist', tokenA), makeTaskParams('does-not-exist'));
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.error.code).toBe('NOT_FOUND');
  });

  it('returns 404 when another user tries to delete the task', async () => {
    const createRes = await createTask(makePostRequest({ title: 'Protected' }, tokenA), makeProjectParams());
    const { data: created } = await createRes.json();

    const res = await deleteTask(makeDeleteRequest(created.task.id, tokenB), makeTaskParams(created.task.id));
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.error.code).toBe('NOT_FOUND');

    await db.delete(tasks).where(eq(tasks.id, created.task.id));
  });
});
