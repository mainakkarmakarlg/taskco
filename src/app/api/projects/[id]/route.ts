import { z } from 'zod';
import { requireAuth, authErrorResponse } from '@/lib/auth';
import { getProjectWithTaskCount } from '@/services/project.service';

const projectIdSchema = z.string().min(1, 'Project id is required');

type Params = { params: Promise<{ id: string }> };

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

  // Filters by both id AND ownerId — returns null for not-found or not-owned alike.
  const project = await getProjectWithTaskCount(idResult.data, auth.sub);
  if (!project) {
    return Response.json(
      { error: { message: 'Project not found', code: 'NOT_FOUND' } },
      { status: 404 }
    );
  }

  return Response.json({ data: { project } });
}
