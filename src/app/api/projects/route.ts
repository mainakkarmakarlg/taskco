import { z } from 'zod';
import { requireAuth, authErrorResponse } from '@/lib/auth';
import { createProject, listProjectsForUser } from '@/services/project.service';

const createProjectSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  color: z.string().optional(),
});

export async function GET(request: Request) {
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

  const projects = await listProjectsForUser(auth.sub);
  return Response.json({ data: { projects } });
}

export async function POST(request: Request) {
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

  let body: z.infer<typeof createProjectSchema>;
  try {
    body = createProjectSchema.parse(await request.json());
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

  // ownerId comes from the authenticated user only — never from the request body.
  const project = await createProject({
    name: body.name,
    description: body.description,
    color: body.color,
    userId: auth.sub,
  });

  return Response.json({ data: { project } }, { status: 201 });
}
