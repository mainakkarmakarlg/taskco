import { POST as register } from '@/app/api/auth/register/route';
import { GET, POST as createTodo } from '@/app/api/todos/route';
import { PATCH, DELETE } from '@/app/api/todos/[id]/route';
import { db } from '@/lib/db';
import { todos, users } from '@/db/schema';
import { eq } from 'drizzle-orm';

const TEST_EMAIL = 'todos-test@taskco.test';
const OTHER_EMAIL = 'todos-other@taskco.test';
const PASSWORD = 'password123';

function makeRequest(body: unknown, token?: string): Request {
  return new Request('http://localhost', {
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
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
}

async function getToken(email: string): Promise<string> {
  const res = await register(makeRequest({ email, password: PASSWORD, name: 'Test User' }));
  const body = await res.json();
  return body.data.token;
}

async function cleanupUsers() {
  await db.delete(users).where(eq(users.email, TEST_EMAIL));
  await db.delete(users).where(eq(users.email, OTHER_EMAIL));
}

beforeEach(async () => {
  await cleanupUsers();
});

afterAll(async () => {
  await cleanupUsers();
});

// ─── GET /api/todos ───────────────────────────────────────────────────────────

describe('GET /api/todos', () => {
  it('returns 401 without a token', async () => {
    const res = await GET(makeGetRequest());
    expect(res.status).toBe(401);
  });

  it('returns 401 with an invalid token', async () => {
    const res = await GET(makeGetRequest('not-a-token'));
    expect(res.status).toBe(401);
  });

  it('returns empty list when user has no todos', async () => {
    const token = await getToken(TEST_EMAIL);
    const res = await GET(makeGetRequest(token));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data).toEqual([]);
  });

  it('returns only the authenticated user\'s todos', async () => {
    const token = await getToken(TEST_EMAIL);
    const otherToken = await getToken(OTHER_EMAIL);

    await createTodo(makeRequest({ title: 'My todo' }, token));
    await createTodo(makeRequest({ title: 'Other todo' }, otherToken));

    const res = await GET(makeGetRequest(token));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data).toHaveLength(1);
    expect(body.data[0].title).toBe('My todo');
  });
});

// ─── POST /api/todos ──────────────────────────────────────────────────────────

describe('POST /api/todos', () => {
  it('returns 401 without a token', async () => {
    const res = await createTodo(makeRequest({ title: 'Test' }));
    expect(res.status).toBe(401);
  });

  it('creates a todo and returns it', async () => {
    const token = await getToken(TEST_EMAIL);
    const res = await createTodo(makeRequest({ title: 'Buy groceries' }, token));
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.data.title).toBe('Buy groceries');
    expect(body.data.completed).toBe(false);
    expect(body.data.id).toBeDefined();
  });

  it('returns 400 when title is empty', async () => {
    const token = await getToken(TEST_EMAIL);
    const res = await createTodo(makeRequest({ title: '' }, token));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 when title is missing', async () => {
    const token = await getToken(TEST_EMAIL);
    const res = await createTodo(makeRequest({}, token));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });
});

// ─── PATCH /api/todos/[id] ────────────────────────────────────────────────────

describe('PATCH /api/todos/[id]', () => {
  async function createOne(token: string): Promise<string> {
    const res = await createTodo(makeRequest({ title: 'Initial title' }, token));
    const body = await res.json();
    return body.data.id;
  }

  function patchRequest(body: unknown, token?: string): Request {
    return new Request('http://localhost', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(body),
    });
  }

  it('returns 401 without a token', async () => {
    const res = await PATCH(patchRequest({ title: 'x' }), { params: Promise.resolve({ id: 'any' }) });
    expect(res.status).toBe(401);
  });

  it('updates title', async () => {
    const token = await getToken(TEST_EMAIL);
    const id = await createOne(token);

    const res = await PATCH(patchRequest({ title: 'Updated' }, token), { params: Promise.resolve({ id }) });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.title).toBe('Updated');
  });

  it('marks todo as completed', async () => {
    const token = await getToken(TEST_EMAIL);
    const id = await createOne(token);

    const res = await PATCH(patchRequest({ completed: true }, token), { params: Promise.resolve({ id }) });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.completed).toBe(true);
  });

  it('returns 404 when todo does not exist', async () => {
    const token = await getToken(TEST_EMAIL);
    const res = await PATCH(patchRequest({ title: 'x' }, token), { params: Promise.resolve({ id: 'nonexistent-id' }) });

    expect(res.status).toBe(404);
  });

  it('returns 404 when todo belongs to another user', async () => {
    const token = await getToken(TEST_EMAIL);
    const otherToken = await getToken(OTHER_EMAIL);
    const id = await createOne(otherToken);

    const res = await PATCH(patchRequest({ title: 'Stolen' }, token), { params: Promise.resolve({ id }) });
    expect(res.status).toBe(404);
  });
});

// ─── DELETE /api/todos/[id] ───────────────────────────────────────────────────

describe('DELETE /api/todos/[id]', () => {
  async function createOne(token: string): Promise<string> {
    const res = await createTodo(makeRequest({ title: 'To delete' }, token));
    const body = await res.json();
    return body.data.id;
  }

  function deleteRequest(token?: string): Request {
    return new Request('http://localhost', {
      method: 'DELETE',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
  }

  it('returns 401 without a token', async () => {
    const res = await DELETE(deleteRequest(), { params: Promise.resolve({ id: 'any' }) });
    expect(res.status).toBe(401);
  });

  it('deletes the todo and returns it', async () => {
    const token = await getToken(TEST_EMAIL);
    const id = await createOne(token);

    const res = await DELETE(deleteRequest(token), { params: Promise.resolve({ id }) });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.id).toBe(id);

    const remaining = await db.select().from(todos).where(eq(todos.id, id));
    expect(remaining).toHaveLength(0);
  });

  it('returns 404 when todo does not exist', async () => {
    const token = await getToken(TEST_EMAIL);
    const res = await DELETE(deleteRequest(token), { params: Promise.resolve({ id: 'nonexistent-id' }) });

    expect(res.status).toBe(404);
  });

  it('returns 404 when todo belongs to another user', async () => {
    const token = await getToken(TEST_EMAIL);
    const otherToken = await getToken(OTHER_EMAIL);
    const id = await createOne(otherToken);

    const res = await DELETE(deleteRequest(token), { params: Promise.resolve({ id }) });
    expect(res.status).toBe(404);
  });
});
