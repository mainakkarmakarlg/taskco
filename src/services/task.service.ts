import { eq, and, desc } from 'drizzle-orm';
import { db } from '@/lib/db';
import { tasks } from '@/db/schema';

type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'DONE';
type Priority = 'LOW' | 'MEDIUM' | 'HIGH';

export interface CreateTaskInput {
  title: string;
  description?: string;
  status: TaskStatus;
  priority: Priority;
  dueDate?: Date;
}

export interface UpdateTaskInput {
  title?: string;
  description?: string | null;
  status?: TaskStatus;
  priority?: Priority;
  dueDate?: Date | null;
}

export async function createTask(projectId: string, data: CreateTaskInput) {
  const [task] = await db
    .insert(tasks)
    .values({
      title: data.title,
      description: data.description ?? null,
      status: data.status,
      priority: data.priority,
      dueDate: data.dueDate ?? null,
      projectId,
    })
    .returning();
  return task;
}

export async function listTasks(
  projectId: string,
  filters: { status?: TaskStatus; priority?: Priority },
) {
  return db
    .select()
    .from(tasks)
    .where(
      and(
        eq(tasks.projectId, projectId),
        filters.status ? eq(tasks.status, filters.status) : undefined,
        filters.priority ? eq(tasks.priority, filters.priority) : undefined,
      ),
    )
    .orderBy(desc(tasks.createdAt));
}

export async function getTaskWithOwner(taskId: string) {
  const [row] = await db
    .select({ id: tasks.id, projectId: tasks.projectId })
    .from(tasks)
    .where(eq(tasks.id, taskId))
    .limit(1);
  return row ?? null;
}

export async function updateTask(taskId: string, data: UpdateTaskInput) {
  const updateSet: Record<string, unknown> = {};
  if (data.title !== undefined) updateSet.title = data.title;
  if (data.description !== undefined) updateSet.description = data.description;
  if (data.status !== undefined) updateSet.status = data.status;
  if (data.priority !== undefined) updateSet.priority = data.priority;
  if (data.dueDate !== undefined) updateSet.dueDate = data.dueDate;

  const [updated] = await db.update(tasks).set(updateSet).where(eq(tasks.id, taskId)).returning();
  return updated;
}

export async function deleteTask(taskId: string) {
  await db.delete(tasks).where(eq(tasks.id, taskId));
}
