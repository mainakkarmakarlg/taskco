import { Card, ProjectColorDot } from '@/components/ui';
import type { Project } from '@/lib/types';

/** Grid card summarizing a single project. */
export function ProjectCard({ project }: { project: Project }) {
  const taskCount = project.taskCount ?? 0;

  return (
    <Card className="h-full p-4 transition-shadow hover:shadow-md">
      <div className="flex items-center gap-2">
        <ProjectColorDot color={project.color} />
        <span className="truncate font-semibold text-gray-900">{project.name}</span>
      </div>
      <p className="mt-2 line-clamp-2 text-sm text-gray-500">
        {project.description || <span className="text-gray-400">No description</span>}
      </p>
      <p className="mt-3 text-xs text-gray-500">
        {taskCount} {taskCount === 1 ? 'task' : 'tasks'}
      </p>
    </Card>
  );
}
