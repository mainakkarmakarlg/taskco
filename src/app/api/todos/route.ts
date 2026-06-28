import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { todos } from '@/db/schema';
import { requireAuth, authErrorResponse } from '@/lib/auth';

const createTodoSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
});

export async function POST(request: Request) {
  let auth;
  try {
    auth = await requireAuth(request);
  } catch (error) {
    return authErrorResponse(error) ?? Response.json({ error: { message: 'Internal error', code: 'INTERNAL_ERROR' } }, { status: 500 });
  }

  let body: z.infer<typeof createTodoSchema>;
  try {
    body = createTodoSchema.parse(await request.json());
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json(
        { error: { message: 'Validation failed', code: 'VALIDATION_ERROR', details: error.issues } },
        { status: 400 },
      );
    }
    return Response.json({ error: { message: 'Invalid request body', code: 'INVALID_REQUEST' } }, { status: 400 });
  }

  const [todo] = await db
    .insert(todos)
    .values({ userId: auth.sub, title: body.title, description: body.description ?? null })
    .returning();

  return Response.json({ data: todo }, { status: 201 });
}

export async function GET(request: Request) {
  let auth;
  try {
    auth = await requireAuth(request);
  } catch (error) {
    return authErrorResponse(error) ?? Response.json({ error: { message: 'Internal error', code: 'INTERNAL_ERROR' } }, { status: 500 });
  }

  const userTodos = await db.select().from(todos).where(eq(todos.userId, auth.sub));

  return Response.json({ data: userTodos });
}
