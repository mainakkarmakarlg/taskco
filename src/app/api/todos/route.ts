import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { todos } from '@/db/schema';
import { getAuthUser } from '@/lib/auth-middleware';

const createTodoSchema = z.object({
  title: z.string().min(1),
});

export async function GET(request: Request) {
  const user = await getAuthUser(request);
  if (!user) {
    return Response.json(
      { error: { message: 'Unauthorized', code: 'UNAUTHORIZED' } },
      { status: 401 }
    );
  }

  const userTodos = await db
    .select()
    .from(todos)
    .where(eq(todos.userId, user.id))
    .orderBy(todos.createdAt);

  return Response.json({ data: userTodos });
}

export async function POST(request: Request) {
  const user = await getAuthUser(request);
  if (!user) {
    return Response.json(
      { error: { message: 'Unauthorized', code: 'UNAUTHORIZED' } },
      { status: 401 }
    );
  }

  let body: z.infer<typeof createTodoSchema>;
  try {
    body = createTodoSchema.parse(await request.json());
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json(
        { error: { message: 'Validation failed', code: 'VALIDATION_ERROR', details: error.issues } },
        { status: 400 }
      );
    }
    return Response.json(
      { error: { message: 'Invalid request body', code: 'INVALID_REQUEST' } },
      { status: 400 }
    );
  }

  const [todo] = await db
    .insert(todos)
    .values({ title: body.title, userId: user.id })
    .returning();

  return Response.json({ data: todo }, { status: 201 });
}
