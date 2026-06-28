import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { projects } from '@/db/schema';

/**
 * Returns true if userId owns projectId; false if the project does not exist
 * or belongs to a different user. Always returns false (never throws) so callers
 * can return 404 without exposing whether the project exists at all.
 */
export async function canAccessProject(userId: string, projectId: string): Promise<boolean> {
  const [project] = await db
    .select({ userId: projects.userId })
    .from(projects)
    .where(eq(projects.id, projectId))
    .limit(1);
  return project?.userId === userId;
}
