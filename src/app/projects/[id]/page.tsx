'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { AuthedTopbar } from '@/components/AuthedTopbar';
import { PageContainer } from '@/components/PageContainer';
import { Button, Card, ProjectColorDot } from '@/components/ui';
import { CreateTaskModal } from '@/components/project/CreateTaskModal';
import { TaskCard } from '@/components/project/TaskCard';
import { TaskFilters, type TaskFilterValue } from '@/components/project/TaskFilters';
import { useAuthGuard } from '@/hooks/useAuthGuard';
import { projectsApi, tasksApi } from '@/lib/api';
import { queryKeys } from '@/lib/queryKeys';

export default function ProjectDetailPage() {
  const ready = useAuthGuard();
  const params = useParams<{ id: string }>();
  const id = params.id;

  const [filters, setFilters] = useState<TaskFilterValue>({});
  const [createOpen, setCreateOpen] = useState(false);

  const projectQuery = useQuery({
    queryKey: queryKeys.project(id),
    queryFn: () => projectsApi.get(id),
  });

  const tasksQuery = useQuery({
    queryKey: queryKeys.tasks(id, filters),
    queryFn: () => tasksApi.list(id, filters),
  });

  if (!ready) return null;

  const project = projectQuery.data?.project;
  const tasks = tasksQuery.data?.tasks ?? [];
  const hasFilters = Boolean(filters.status || filters.priority);

  return (
    <>
      <AuthedTopbar backHref="/dashboard" />
      <PageContainer>
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            {projectQuery.isLoading ? (
              <div className="space-y-2">
                <div className="h-7 w-48 animate-pulse rounded bg-gray-200" />
                <div className="h-4 w-64 animate-pulse rounded bg-gray-200" />
              </div>
            ) : projectQuery.isError ? (
              <Card className="border-red-200">
                <p className="text-sm text-red-600">
                  {projectQuery.error instanceof Error
                    ? projectQuery.error.message
                    : 'Failed to load this project.'}
                </p>
              </Card>
            ) : project ? (
              <>
                <div className="flex items-center gap-2">
                  <ProjectColorDot color={project.color} />
                  <h1 className="text-2xl font-semibold text-gray-900">{project.name}</h1>
                </div>
                {project.description ? (
                  <p className="mt-1 text-gray-600">{project.description}</p>
                ) : (
                  <p className="mt-1 text-gray-400">No description</p>
                )}
                <p className="mt-1 text-sm text-gray-500">
                  {project.taskCount ?? 0} {(project.taskCount ?? 0) === 1 ? 'task' : 'tasks'}
                </p>
              </>
            ) : null}
          </div>

          <Button onClick={() => setCreateOpen(true)}>New task</Button>
        </div>

        {/* Filters */}
        <div className="mt-6">
          <TaskFilters filters={filters} onChange={setFilters} />
        </div>

        {/* Task list */}
        <div className="mt-6">
          {tasksQuery.isLoading ? (
            <div className="space-y-3">
              {[0, 1, 2].map((i) => (
                <Card key={i} className="p-4">
                  <div className="space-y-3">
                    <div className="h-5 w-1/2 animate-pulse rounded bg-gray-200" />
                    <div className="h-4 w-3/4 animate-pulse rounded bg-gray-200" />
                  </div>
                </Card>
              ))}
            </div>
          ) : tasksQuery.isError ? (
            <Card className="border-red-200">
              <p className="text-sm text-red-600">
                {tasksQuery.error instanceof Error
                  ? tasksQuery.error.message
                  : 'Failed to load tasks.'}
              </p>
            </Card>
          ) : tasks.length === 0 ? (
            <Card className="flex flex-col items-start gap-3">
              <p className="text-sm text-gray-500">
                {hasFilters ? 'No tasks match these filters.' : 'No tasks yet.'}
              </p>
              <Button size="sm" onClick={() => setCreateOpen(true)}>
                New task
              </Button>
            </Card>
          ) : (
            <div className="space-y-3">
              {tasks.map((task) => (
                <TaskCard key={task.id} task={task} projectId={id} />
              ))}
            </div>
          )}
        </div>
      </PageContainer>

      <CreateTaskModal projectId={id} open={createOpen} onClose={() => setCreateOpen(false)} />
    </>
  );
}
