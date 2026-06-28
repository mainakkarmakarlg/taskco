import { z } from 'zod';
import { requireAuth, authErrorResponse } from '@/lib/auth';
import { canAccessProject } from '@/helpers/access';
import { createTask, listTasks } from '@/services/task.service';

const TASK_STATUS = ['TODO', 'IN_PROGRESS', 'DONE'] as const;
const PRIORITY = ['LOW', 'MEDIUM', 'HIGH'] as const;

const projectIdSchema = z.string().min(1, 'Project id is required');

const createTaskSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  status: z.enum(TASK_STATUS).optional().default('TODO'),
  priority: z.enum(PRIORITY).optional().default('MEDIUM'),
  dueDate: z.coerce.date().optional(),
});

const querySchema = z.object({
  status: z.enum(TASK_STATUS).optional(),
  priority: z.enum(PRIORITY).optional(),
});

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  let auth;
  try {
    auth = await requireAuth(request);
  } catch (error) {
    return (
      authErrorResponse(error) ??
      Response.json(
        { error: { message: 'Internal error', code: 'INTERNAL_ERROR' } },
        { status: 500 }
      )
    );
  }

  const rawId = (await params).id;
  const idResult = projectIdSchema.safeParse(rawId);
  if (!idResult.success) {
    return Response.json(
      { error: { message: 'Invalid project id', code: 'VALIDATION_ERROR' } },
      { status: 400 }
    );
  }
  const projectId = idResult.data;

  if (!(await canAccessProject(auth.sub, projectId))) {
    return Response.json(
      { error: { message: 'Project not found', code: 'NOT_FOUND' } },
      { status: 404 }
    );
  }

  let body: z.infer<typeof createTaskSchema>;
  try {
    body = createTaskSchema.parse(await request.json());
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json(
        {
          error: { message: 'Validation failed', code: 'VALIDATION_ERROR', details: error.issues },
        },
        { status: 400 }
      );
    }
    return Response.json(
      { error: { message: 'Invalid request body', code: 'INVALID_REQUEST' } },
      { status: 400 }
    );
  }

  const task = await createTask(projectId, body);
  return Response.json({ data: { task } }, { status: 201 });
}

export async function GET(request: Request, { params }: Params) {
  let auth;
  try {
    auth = await requireAuth(request);
  } catch (error) {
    return (
      authErrorResponse(error) ??
      Response.json(
        { error: { message: 'Internal error', code: 'INTERNAL_ERROR' } },
        { status: 500 }
      )
    );
  }

  const rawId = (await params).id;
  const idResult = projectIdSchema.safeParse(rawId);
  if (!idResult.success) {
    return Response.json(
      { error: { message: 'Invalid project id', code: 'VALIDATION_ERROR' } },
      { status: 400 }
    );
  }
  const projectId = idResult.data;

  if (!(await canAccessProject(auth.sub, projectId))) {
    return Response.json(
      { error: { message: 'Project not found', code: 'NOT_FOUND' } },
      { status: 404 }
    );
  }

  const url = new URL(request.url);
  const rawQuery = Object.fromEntries(url.searchParams);

  let queryParams: z.infer<typeof querySchema>;
  try {
    queryParams = querySchema.parse(rawQuery);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json(
        {
          error: {
            message: 'Invalid filter value',
            code: 'VALIDATION_ERROR',
            details: error.issues,
          },
        },
        { status: 400 }
      );
    }
    return Response.json(
      { error: { message: 'Invalid query parameters', code: 'INVALID_REQUEST' } },
      { status: 400 }
    );
  }

  const result = await listTasks(projectId, queryParams);
  return Response.json({ data: { tasks: result } });
}
