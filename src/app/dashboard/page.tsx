'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AuthedTopbar } from '@/components/AuthedTopbar';
import { PageContainer } from '@/components/PageContainer';
import { Button, Card } from '@/components/ui';
import { CreateProjectModal } from '@/components/dashboard/CreateProjectModal';
import { ProjectCard } from '@/components/dashboard/ProjectCard';
import { useAuthGuard } from '@/hooks/useAuthGuard';
import { projectsApi, ApiError } from '@/lib/api';
import { queryKeys } from '@/lib/queryKeys';

const GRID_CLASS = 'grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3';

export default function DashboardPage() {
  const ready = useAuthGuard();
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: queryKeys.projects,
    queryFn: projectsApi.list,
  });

  if (!ready) return null;

  const projects = data?.projects ?? [];

  return (
    <>
      <AuthedTopbar />
      <PageContainer>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-2xl font-semibold text-gray-900">Projects</h1>
          <Button onClick={() => setModalOpen(true)}>New project</Button>
        </div>

        <div className="mt-6">
          {isLoading ? (
            <div className={GRID_CLASS}>
              {Array.from({ length: 6 }).map((_, i) => (
                <Card key={i} className="h-full p-4">
                  <div className="animate-pulse space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full bg-gray-200" />
                      <div className="h-4 w-1/2 rounded bg-gray-200" />
                    </div>
                    <div className="h-3 w-full rounded bg-gray-200" />
                    <div className="h-3 w-2/3 rounded bg-gray-200" />
                    <div className="h-2 w-1/4 rounded bg-gray-200" />
                  </div>
                </Card>
              ))}
            </div>
          ) : isError ? (
            <Card className="text-center">
              <p className="text-gray-900">Couldn&apos;t load your projects.</p>
              <p className="mt-1 text-sm text-gray-500">
                {(error as ApiError)?.message ?? 'Something went wrong.'}
              </p>
              <div className="mt-4">
                <Button
                  variant="secondary"
                  onClick={() => queryClient.invalidateQueries({ queryKey: queryKeys.projects })}
                >
                  Try again
                </Button>
              </div>
            </Card>
          ) : projects.length === 0 ? (
            <Card className="flex flex-col items-center justify-center py-12 text-center">
              <h2 className="text-lg font-semibold text-gray-900">No projects yet</h2>
              <p className="mt-1 text-sm text-gray-500">
                Create a project to start organizing your tasks.
              </p>
              <div className="mt-4">
                <Button onClick={() => setModalOpen(true)}>Create your first project</Button>
              </div>
            </Card>
          ) : (
            <div className={GRID_CLASS}>
              {projects.map((project) => (
                <Link key={project.id} href={`/projects/${project.id}`} className="block">
                  <ProjectCard project={project} />
                </Link>
              ))}
            </div>
          )}
        </div>
      </PageContainer>

      <CreateProjectModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </>
  );
}
