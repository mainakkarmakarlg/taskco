'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Badge, Card, Select, Spinner } from '@/components/ui';
import { tasksApi } from '@/lib/api';
import { queryKeys } from '@/lib/queryKeys';
import { formatDueDate, isOverdue } from '@/lib/date';
import { STATUS_LABELS, TASK_STATUSES, type Task, type TaskStatus } from '@/lib/types';
import { cn } from '@/lib/cn';

/** Single task row with badges, due date, and an inline status changer. */
export function TaskCard({ task, projectId }: { task: Task; projectId: string }) {
  const queryClient = useQueryClient();
  const overdue = isOverdue(task.dueDate, task.status);

  const updateStatus = useMutation({
    mutationFn: (status: TaskStatus) => tasksApi.update(task.id, { status }),
    onSuccess: () => {
      // Partial key so every filter variant of the task list refetches.
      queryClient.invalidateQueries({ queryKey: ['tasks', projectId] });
      queryClient.invalidateQueries({ queryKey: queryKeys.project(projectId) });
    },
  });

  return (
    <Card className={cn('p-4', overdue && 'border-l-4 border-l-red-500')}>
      <div className="flex items-start justify-between gap-3">
        <p className="font-medium text-gray-900">{task.title}</p>
        <div className="flex shrink-0 items-center gap-2">
          <Badge kind="priority" value={task.priority} />
          <Badge kind="status" value={task.status} />
        </div>
      </div>

      {task.description && (
        <p className="mt-2 line-clamp-2 text-sm text-gray-500">{task.description}</p>
      )}

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <span className={cn('text-xs', overdue ? 'font-medium text-red-600' : 'text-gray-500')}>
          {formatDueDate(task.dueDate)}
          {overdue && ' · Overdue'}
        </span>

        <div className="flex items-center gap-2">
          {updateStatus.isPending && <Spinner className="text-gray-400" />}
          <div className="w-36">
            <Select
              aria-label="Change status"
              value={task.status}
              disabled={updateStatus.isPending}
              onChange={(e) => updateStatus.mutate(e.target.value as TaskStatus)}
            >
              {TASK_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {STATUS_LABELS[status]}
                </option>
              ))}
            </Select>
          </div>
        </div>
      </div>

      {updateStatus.isError && (
        <p className="mt-2 text-xs text-red-600">
          {updateStatus.error instanceof Error
            ? updateStatus.error.message
            : 'Failed to update status.'}
        </p>
      )}
    </Card>
  );
}
