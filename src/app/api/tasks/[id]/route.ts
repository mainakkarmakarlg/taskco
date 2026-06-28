import { z } from 'zod';
import { requireAuth, authErrorResponse } from '@/lib/auth';
import { canAccessProject } from '@/helpers/access';
import { getTaskWithOwner, updateTask, deleteTask } from '@/services/task.service';

const TASK_STATUS = ['TODO', 'IN_PROGRESS', 'DONE'] as const;
const PRIORITY = ['LOW', 'MEDIUM', 'HIGH'] as const;

const taskIdSchema = z.string().min(1, 'Task id is required');

const updateTaskSchema = z.object({
  title: z.string().min(1, 'Title cannot be empty').optional(),
  description: z.string().nullable().optional(),
  status: z.enum(TASK_STATUS).optional(),
  priority: z.enum(PRIORITY).optional(),
  dueDate: z.union([z.coerce.date(), z.null()]).optional(),
});

type Params = { params: Promise<{ id: string }> };

async function resolveTaskAccess(taskId: string, userId: string) {
  const row = await getTaskWithOwner(taskId);
  if (!row) return false;
  return canAccessProject(userId, row.projectId);
}

export async function PATCH(request: Request, { params }: Params) {
  let auth;
  try {
    auth = await requireAuth(request);
  } catch (error) {
    return authErrorResponse(error) ?? Response.json({ error: { message: 'Internal error', code: 'INTERNAL_ERROR' } }, { status: 500 });
  }

  const rawId = (await params).id;
  const idResult = taskIdSchema.safeParse(rawId);
  if (!idResult.success) {
    return Response.json({ error: { message: 'Invalid task id', code: 'VALIDATION_ERROR' } }, { status: 400 });
  }
  const id = idResult.data;

  if (!(await resolveTaskAccess(id, auth.sub))) {
    return Response.json({ error: { message: 'Task not found', code: 'NOT_FOUND' } }, { status: 404 });
  }

  let body: z.infer<typeof updateTaskSchema>;
  try {
    body = updateTaskSchema.parse(await request.json());
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json(
        { error: { message: 'Validation failed', code: 'VALIDATION_ERROR', details: error.issues } },
        { status: 400 },
      );
    }
    return Response.json({ error: { message: 'Invalid request body', code: 'INVALID_REQUEST' } }, { status: 400 });
  }

  if (Object.keys(body).filter(k => (body as Record<string, unknown>)[k] !== undefined).length === 0) {
    return Response.json({ error: { message: 'No fields to update', code: 'NO_FIELDS' } }, { status: 400 });
  }

  const updated = await updateTask(id, body);
  return Response.json({ data: { task: updated } });
}

export async function DELETE(request: Request, { params }: Params) {
  let auth;
  try {
    auth = await requireAuth(request);
  } catch (error) {
    return authErrorResponse(error) ?? Response.json({ error: { message: 'Internal error', code: 'INTERNAL_ERROR' } }, { status: 500 });
  }

  const rawId = (await params).id;
  const idResult = taskIdSchema.safeParse(rawId);
  if (!idResult.success) {
    return Response.json({ error: { message: 'Invalid task id', code: 'VALIDATION_ERROR' } }, { status: 400 });
  }
  const id = idResult.data;

  if (!(await resolveTaskAccess(id, auth.sub))) {
    return Response.json({ error: { message: 'Task not found', code: 'NOT_FOUND' } }, { status: 404 });
  }

  await deleteTask(id);
  return Response.json({ data: { id } });
}
