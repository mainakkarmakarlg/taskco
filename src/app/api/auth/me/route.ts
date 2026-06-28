import { eq } from 'drizzle-orm';
import { requireAuth, authErrorResponse } from '@/lib/auth';
import { db } from '@/lib/db';
import { users } from '@/db/schema';

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

  // Explicitly select non-sensitive columns — never passwordHash.
  const [user] = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(eq(users.id, auth.sub))
    .limit(1);

  if (!user) {
    return Response.json(
      { error: { message: 'User not found', code: 'NOT_FOUND' } },
      { status: 404 }
    );
  }

  return Response.json({ data: { user } });
}
