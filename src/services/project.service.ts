import { eq, and, desc, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { projects, tasks } from '@/db/schema';

export interface CreateProjectInput {
  name: string;
  description?: string | null;
  color?: string;
  userId: string;
}

/**
 * Returns { id, userId } for the project if it exists, else null.
 * Ownership is checked by the caller against the returned userId.
 */
export async function getOwnedProject(projectId: string, userId: string) {
  const [project] = await db
    .select({ id: projects.id, userId: projects.userId })
    .from(projects)
    .where(eq(projects.id, projectId))
    .limit(1);
  return project?.userId === userId ? project : null;
}

export async function createProject(input: CreateProjectInput) {
  const [project] = await db
    .insert(projects)
    .values({
      name: input.name,
      description: input.description ?? null,
      color: input.color ?? '#3b82f6',
      userId: input.userId,
    })
    .returning();
  return project;
}

/**
 * Lists only the projects owned by userId, each with a numeric taskCount.
 * Ownership filter is mandatory (never return other users' projects).
 */
export async function listProjectsForUser(userId: string) {
  return db
    .select({
      id: projects.id,
      name: projects.name,
      description: projects.description,
      color: projects.color,
      userId: projects.userId,
      createdAt: projects.createdAt,
      taskCount: sql<number>`count(${tasks.id})::int`,
    })
    .from(projects)
    .leftJoin(tasks, eq(tasks.projectId, projects.id))
    .where(eq(projects.userId, userId))
    .groupBy(projects.id)
    .orderBy(desc(projects.createdAt));
}

/**
 * Returns a single owned project plus its taskCount, filtering by BOTH
 * project id AND ownerId (id alone is insufficient — security). null if
 * not found or not owned.
 */
export async function getProjectWithTaskCount(projectId: string, userId: string) {
  const [row] = await db
    .select({
      id: projects.id,
      name: projects.name,
      description: projects.description,
      color: projects.color,
      userId: projects.userId,
      createdAt: projects.createdAt,
      taskCount: sql<number>`count(${tasks.id})::int`,
    })
    .from(projects)
    .leftJoin(tasks, eq(tasks.projectId, projects.id))
    .where(and(eq(projects.id, projectId), eq(projects.userId, userId)))
    .groupBy(projects.id)
    .limit(1);
  return row ?? null;
}
