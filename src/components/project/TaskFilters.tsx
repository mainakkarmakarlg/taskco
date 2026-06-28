'use client';

import { Select } from '@/components/ui';
import {
  PRIORITIES,
  PRIORITY_LABELS,
  STATUS_LABELS,
  TASK_STATUSES,
  type Priority,
  type TaskStatus,
} from '@/lib/types';

export interface TaskFilterValue {
  status?: TaskStatus;
  priority?: Priority;
}

/** Status + priority filter controls for the project task list. */
export function TaskFilters({
  filters,
  onChange,
}: {
  filters: TaskFilterValue;
  onChange: (filters: TaskFilterValue) => void;
}) {
  function setStatus(value: string) {
    const next: TaskFilterValue = { ...filters };
    if (value) next.status = value as TaskStatus;
    else delete next.status;
    onChange(next);
  }

  function setPriority(value: string) {
    const next: TaskFilterValue = { ...filters };
    if (value) next.priority = value as Priority;
    else delete next.priority;
    onChange(next);
  }

  return (
    <div className="flex flex-wrap gap-3">
      <div className="w-full sm:w-48">
        <Select
          label="Status"
          value={filters.status ?? ''}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="">All statuses</option>
          {TASK_STATUSES.map((status) => (
            <option key={status} value={status}>
              {STATUS_LABELS[status]}
            </option>
          ))}
        </Select>
      </div>

      <div className="w-full sm:w-48">
        <Select
          label="Priority"
          value={filters.priority ?? ''}
          onChange={(e) => setPriority(e.target.value)}
        >
          <option value="">All priorities</option>
          {PRIORITIES.map((priority) => (
            <option key={priority} value={priority}>
              {PRIORITY_LABELS[priority]}
            </option>
          ))}
        </Select>
      </div>
    </div>
  );
}
