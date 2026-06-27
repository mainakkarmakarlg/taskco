import { z } from 'zod';
import { and, eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { todos } from '@/db/schema';
import { getAuthUser } from '@/lib/auth-middleware';

const updateTodoSchema = z.object({
  title: z.string().min(1).optional(),
  completed: z.boolean().optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser(request);
  if (!user) {
    return Response.json(
      { error: { message: 'Unauthorized', code: 'UNAUTHORIZED' } },
      { status: 401 }
    );
  }

  const { id } = await params;

  let body: z.infer<typeof updateTodoSchema>;
  try {
    body = updateTodoSchema.parse(await request.json());
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

  if (Object.keys(body).length === 0) {
    return Response.json(
      { error: { message: 'No fields to update', code: 'NO_UPDATE_FIELDS' } },
      { status: 400 }
    );
  }

  const [updated] = await db
    .update(todos)
    .set(body)
    .where(and(eq(todos.id, id), eq(todos.userId, user.id)))
    .returning();

  if (!updated) {
    return Response.json(
      { error: { message: 'Todo not found', code: 'NOT_FOUND' } },
      { status: 404 }
    );
  }

  return Response.json({ data: updated });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser(request);
  if (!user) {
    return Response.json(
      { error: { message: 'Unauthorized', code: 'UNAUTHORIZED' } },
      { status: 401 }
    );
  }

  const { id } = await params;

  const [deleted] = await db
    .delete(todos)
    .where(and(eq(todos.id, id), eq(todos.userId, user.id)))
    .returning();

  if (!deleted) {
    return Response.json(
      { error: { message: 'Todo not found', code: 'NOT_FOUND' } },
      { status: 404 }
    );
  }

  return Response.json({ data: deleted });
}
