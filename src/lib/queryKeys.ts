import type { Priority, TaskStatus } from './types';

export interface TaskFilters {
  status?: TaskStatus;
  priority?: Priority;
}

/** Centralized, stable React Query keys so reads and invalidations line up. */
export const queryKeys = {
  me: ['me'] as const,
  projects: ['projects'] as const,
  project: (id: string) => ['project', id] as const,
  tasks: (projectId: string, filters: TaskFilters = {}) => ['tasks', projectId, filters] as const,
};
