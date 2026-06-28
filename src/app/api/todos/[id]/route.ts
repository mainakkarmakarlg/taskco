import { z } from 'zod';
import { eq, and } from 'drizzle-orm';
import { db } from '@/lib/db';
import { todos } from '@/db/schema';
import { requireAuth, authErrorResponse } from '@/lib/auth';

const updateTodoSchema = z.object({
  title: z.string().min(1, 'Title cannot be empty').optional(),
  description: z.string().nullable().optional(),
  completed: z.boolean().optional(),
});

type Params = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Params) {
  let auth;
  try {
    auth = await requireAuth(request);
  } catch (error) {
    return authErrorResponse(error) ?? Response.json({ error: { message: 'Internal error', code: 'INTERNAL_ERROR' } }, { status: 500 });
  }

  const { id } = await params;

  const [todo] = await db
    .select()
    .from(todos)
    .where(and(eq(todos.id, id), eq(todos.userId, auth.sub)))
    .limit(1);

  if (!todo) {
    return Response.json({ error: { message: 'Todo not found', code: 'NOT_FOUND' } }, { status: 404 });
  }

  return Response.json({ data: todo });
}

export async function PATCH(request: Request, { params }: Params) {
  let auth;
  try {
    auth = await requireAuth(request);
  } catch (error) {
    return authErrorResponse(error) ?? Response.json({ error: { message: 'Internal error', code: 'INTERNAL_ERROR' } }, { status: 500 });
  }

  const { id } = await params;

  let body: z.infer<typeof updateTodoSchema>;
  try {
    body = updateTodoSchema.parse(await request.json());
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json(
        { error: { message: 'Validation failed', code: 'VALIDATION_ERROR', details: error.issues } },
        { status: 400 },
      );
    }
    return Response.json({ error: { message: 'Invalid request body', code: 'INVALID_REQUEST' } }, { status: 400 });
  }

  const updateSet: Record<string, unknown> = {};
  if (body.title !== undefined) updateSet.title = body.title;
  if (body.description !== undefined) updateSet.description = body.description;
  if (body.completed !== undefined) updateSet.completed = body.completed;

  if (Object.keys(updateSet).length === 0) {
    return Response.json(
      { error: { message: 'No fields to update', code: 'NO_FIELDS' } },
      { status: 400 },
    );
  }

  updateSet.updatedAt = new Date();

  const [updated] = await db
    .update(todos)
    .set(updateSet)
    .where(and(eq(todos.id, id), eq(todos.userId, auth.sub)))
    .returning();

  if (!updated) {
    return Response.json({ error: { message: 'Todo not found', code: 'NOT_FOUND' } }, { status: 404 });
  }

  return Response.json({ data: updated });
}

export async function DELETE(request: Request, { params }: Params) {
  let auth;
  try {
    auth = await requireAuth(request);
  } catch (error) {
    return authErrorResponse(error) ?? Response.json({ error: { message: 'Internal error', code: 'INTERNAL_ERROR' } }, { status: 500 });
  }

  const { id } = await params;

  const [deleted] = await db
    .delete(todos)
    .where(and(eq(todos.id, id), eq(todos.userId, auth.sub)))
    .returning({ id: todos.id });

  if (!deleted) {
    return Response.json({ error: { message: 'Todo not found', code: 'NOT_FOUND' } }, { status: 404 });
  }

  return Response.json({ data: { id: deleted.id } });
}
