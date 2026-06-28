import { POST as register } from '@/app/api/auth/register/route';
import { POST as createTodo, GET as listTodos } from '@/app/api/todos/route';
import { GET as getTodo, PATCH as updateTodo, DELETE as deleteTodo } from '@/app/api/todos/[id]/route';
import { db } from '@/lib/db';
import { users, todos } from '@/db/schema';
import { eq } from 'drizzle-orm';

const USER_A = { email: 'todos-user-a@taskco.test', password: 'password123', name: 'User A' };
const USER_B = { email: 'todos-user-b@taskco.test', password: 'password123', name: 'User B' };

let tokenA: string;
let tokenB: string;

function makeRequest(body: unknown, token?: string): Request {
  return new Request('http://localhost/api/todos', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
}

function makeGetRequest(token?: string): Request {
  return new Request('http://localhost/api/todos', {
    method: 'GET',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
}

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

async function registerUser(user: typeof USER_A): Promise<string> {
  const res = await register(makeRequest(user));
  const body = await res.json();
  return body.data.token;
}

async function cleanupUsers() {
  await db.delete(todos).where(eq(todos.userId, (await db.select({ id: users.id }).from(users).where(eq(users.email, USER_A.email)).limit(1))[0]?.id ?? ''));
  await db.delete(todos).where(eq(todos.userId, (await db.select({ id: users.id }).from(users).where(eq(users.email, USER_B.email)).limit(1))[0]?.id ?? ''));
  await db.delete(users).where(eq(users.email, USER_A.email));
  await db.delete(users).where(eq(users.email, USER_B.email));
}

beforeAll(async () => {
  await cleanupUsers();
  tokenA = await registerUser(USER_A);
  tokenB = await registerUser(USER_B);
});

afterAll(async () => {
  await cleanupUsers();
});

// ─── POST /api/todos ──────────────────────────────────────────────────────────

describe('POST /api/todos', () => {
  it('creates a todo with title only', async () => {
    const res = await createTodo(makeRequest({ title: 'Buy groceries' }, tokenA));
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.data.title).toBe('Buy groceries');
    expect(body.data.description).toBeNull();
    expect(body.data.completed).toBe(false);
    expect(body.data.id).toBeDefined();
    expect(body.data.userId).toBeDefined();

    await db.delete(todos).where(eq(todos.id, body.data.id));
  });

  it('creates a todo with title and description', async () => {
    const res = await createTodo(makeRequest({ title: 'Read book', description: 'Chapter 3 onwards' }, tokenA));
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.data.title).toBe('Read book');
    expect(body.data.description).toBe('Chapter 3 onwards');

    await db.delete(todos).where(eq(todos.id, body.data.id));
  });

  it('returns 400 when title is missing', async () => {
    const res = await createTodo(makeRequest({ description: 'No title here' }, tokenA));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 when title is empty', async () => {
    const res = await createTodo(makeRequest({ title: '' }, tokenA));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 401 when no token is provided', async () => {
    const res = await createTodo(makeRequest({ title: 'Unauthorized' }));
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.error.code).toBe('MISSING_TOKEN');
  });

  it('returns 401 when token is invalid', async () => {
    const res = await createTodo(makeRequest({ title: 'Bad token' }, 'not.a.valid.token'));
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.error.code).toBe('INVALID_TOKEN');
  });
});

// ─── GET /api/todos ───────────────────────────────────────────────────────────

describe('GET /api/todos', () => {
  let createdId: string;

  beforeAll(async () => {
    const res = await createTodo(makeRequest({ title: 'List test todo' }, tokenA));
    const body = await res.json();
    createdId = body.data.id;
  });

  afterAll(async () => {
    if (createdId) await db.delete(todos).where(eq(todos.id, createdId));
  });

  it('returns the todos for the authenticated user', async () => {
    const res = await listTodos(makeGetRequest(tokenA));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data.some((t: { id: string }) => t.id === createdId)).toBe(true);
  });

  it('does not return other users\' todos', async () => {
    const res = await listTodos(makeGetRequest(tokenB));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.every((t: { id: string }) => t.id !== createdId)).toBe(true);
  });

  it('returns 401 when no token is provided', async () => {
    const res = await listTodos(makeGetRequest());
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.error.code).toBe('MISSING_TOKEN');
  });
});

// ─── GET /api/todos/[id] ─────────────────────────────────────────────────────

describe('GET /api/todos/[id]', () => {
  let todoId: string;

  beforeAll(async () => {
    const res = await createTodo(makeRequest({ title: 'Fetch me', description: 'details' }, tokenA));
    const body = await res.json();
    todoId = body.data.id;
  });

  afterAll(async () => {
    if (todoId) await db.delete(todos).where(eq(todos.id, todoId));
  });

  it('returns the todo for the owner', async () => {
    const req = makeGetRequest(tokenA);
    const res = await getTodo(req, makeParams(todoId));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.id).toBe(todoId);
    expect(body.data.title).toBe('Fetch me');
  });

  it('returns 404 for a non-existent id', async () => {
    const req = makeGetRequest(tokenA);
    const res = await getTodo(req, makeParams('does-not-exist'));
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.error.code).toBe('NOT_FOUND');
  });

  it('returns 404 when another user tries to access the todo', async () => {
    const req = makeGetRequest(tokenB);
    const res = await getTodo(req, makeParams(todoId));
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.error.code).toBe('NOT_FOUND');
  });

  it('returns 401 when no token is provided', async () => {
    const req = makeGetRequest();
    const res = await getTodo(req, makeParams(todoId));
    const body = await res.json();

    expect(res.status).toBe(401);
  });
});

// ─── PATCH /api/todos/[id] ───────────────────────────────────────────────────

describe('PATCH /api/todos/[id]', () => {
  let todoId: string;

  beforeEach(async () => {
    const res = await createTodo(makeRequest({ title: 'Original title', description: 'Original desc' }, tokenA));
    const body = await res.json();
    todoId = body.data.id;
  });

  afterEach(async () => {
    if (todoId) await db.delete(todos).where(eq(todos.id, todoId));
  });

  function makePatchRequest(body: unknown, token?: string): Request {
    return new Request(`http://localhost/api/todos/${todoId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(body),
    });
  }

  it('updates the title', async () => {
    const res = await updateTodo(makePatchRequest({ title: 'Updated title' }, tokenA), makeParams(todoId));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.title).toBe('Updated title');
    expect(body.data.description).toBe('Original desc');
  });

  it('marks the todo as completed', async () => {
    const res = await updateTodo(makePatchRequest({ completed: true }, tokenA), makeParams(todoId));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.completed).toBe(true);
  });

  it('clears the description by setting it to null', async () => {
    const res = await updateTodo(makePatchRequest({ description: null }, tokenA), makeParams(todoId));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.description).toBeNull();
  });

  it('updates updatedAt timestamp', async () => {
    const getRes = await getTodo(makeGetRequest(tokenA), makeParams(todoId));
    const { data: before } = await getRes.json();

    await new Promise((r) => setTimeout(r, 10));

    await updateTodo(makePatchRequest({ title: 'New title' }, tokenA), makeParams(todoId));

    const getRes2 = await getTodo(makeGetRequest(tokenA), makeParams(todoId));
    const { data: after } = await getRes2.json();

    expect(new Date(after.updatedAt).getTime()).toBeGreaterThanOrEqual(new Date(before.updatedAt).getTime());
  });

  it('returns 400 when no fields are provided', async () => {
    const res = await updateTodo(makePatchRequest({}, tokenA), makeParams(todoId));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error.code).toBe('NO_FIELDS');
  });

  it('returns 400 when title is empty', async () => {
    const res = await updateTodo(makePatchRequest({ title: '' }, tokenA), makeParams(todoId));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 404 for a non-existent id', async () => {
    const req = makePatchRequest({ title: 'Ghost' }, tokenA);
    const res = await updateTodo(req, makeParams('does-not-exist'));
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.error.code).toBe('NOT_FOUND');
  });

  it('returns 404 when another user tries to update the todo', async () => {
    const req = makePatchRequest({ title: 'Stolen' }, tokenB);
    const res = await updateTodo(req, makeParams(todoId));
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.error.code).toBe('NOT_FOUND');
  });

  it('returns 401 when no token is provided', async () => {
    const req = makePatchRequest({ title: 'No auth' });
    const res = await updateTodo(req, makeParams(todoId));
    const body = await res.json();

    expect(res.status).toBe(401);
  });
});

// ─── DELETE /api/todos/[id] ──────────────────────────────────────────────────

describe('DELETE /api/todos/[id]', () => {
  function makeDeleteRequest(token?: string): Request {
    return new Request('http://localhost/api/todos/x', {
      method: 'DELETE',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
  }

  it('deletes the todo and returns its id', async () => {
    const createRes = await createTodo(makeRequest({ title: 'Delete me' }, tokenA));
    const { data: created } = await createRes.json();

    const res = await deleteTodo(makeDeleteRequest(tokenA), makeParams(created.id));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.id).toBe(created.id);

    const getRes = await getTodo(makeGetRequest(tokenA), makeParams(created.id));
    expect(getRes.status).toBe(404);
  });

  it('returns 404 for a non-existent id', async () => {
    const res = await deleteTodo(makeDeleteRequest(tokenA), makeParams('does-not-exist'));
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.error.code).toBe('NOT_FOUND');
  });

  it('returns 404 when another user tries to delete the todo', async () => {
    const createRes = await createTodo(makeRequest({ title: 'Protected' }, tokenA));
    const { data: created } = await createRes.json();

    const res = await deleteTodo(makeDeleteRequest(tokenB), makeParams(created.id));
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.error.code).toBe('NOT_FOUND');

    await db.delete(todos).where(eq(todos.id, created.id));
  });

  it('returns 401 when no token is provided', async () => {
    const createRes = await createTodo(makeRequest({ title: 'No auth delete' }, tokenA));
    const { data: created } = await createRes.json();

    const res = await deleteTodo(makeDeleteRequest(), makeParams(created.id));
    const body = await res.json();

    expect(res.status).toBe(401);

    await db.delete(todos).where(eq(todos.id, created.id));
  });
});
